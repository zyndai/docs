---
title: Worker Subsystems
description: Every file under worker/ — what it owns, how it talks to Postgres, Docker, and Caddy.
---

# Worker Subsystems

The worker is one Node process, ~10 files, each with a single responsibility. They share the Prisma client and a config singleton; everything else is wired explicitly in `worker/main.ts`.

## `main.ts` — entry & supervision

Three concerns started here:

1. **Drain queue loop** — every 1 s, claim the oldest `queued` row and call `lifecycle.drive(deploymentId)`.
2. **Reconcile stops loop** — every 1 s, find any row whose `status` flipped to `stopped` from outside the worker (typically the Stop button) and tear down its container, route, and port.
3. **One-shot supervisors** — started once at boot:
   - `watchCrashes()` — `docker events` consumer.
   - `startMetricsLoop()` — CPU / memory sampler.
   - `startHealthLoop()` — `/health` poller for every `running` deployment.
   - `startRetentionLoop()` — log + metric GC.
   - `startWsLogServer()` — WebSocket log fan-out for the dashboard.
   - `startTailer()` for each running deployment so logs resume after restart.

If any of these throw, they're logged and the affected deployment is marked `failed` or `crashed` — they never crash the worker process itself.

## `lifecycle.ts` — state machine driver

`drive(deploymentId)` walks one deployment through every state from `unpacking` to `running`. Each transition:

1. Update `Deployment.status` (Postgres is the source of truth).
2. Append a system-log line via `appendSystemLog`.
3. Run the stage-specific work.
4. On exception, set `status="failed"` and `errorMessage`, then return.

The function is async but linear — there's no concurrency inside a single deployment's pipeline. Multiple deployments run in parallel because `drainQueue` calls `drive()` without awaiting.

## `docker.ts` — Docker runtime glue

Wraps `dockerode` for everything container-shaped:

| Function | Purpose |
|----------|---------|
| `runContainer(deployment, runtimeOpts)` | `docker run` with mem/CPU limits, label `deploymentId=<cuid>`, port binding `127.0.0.1:<port>:5000`, mount workdir read-only. |
| `stopAndRemove(containerId)` | SIGTERM with 10 s grace, then SIGKILL, then `rm`. |
| `containerStats(containerId)` | One-shot stats read for the metrics sampler. |
| `containerLogs(containerId)` | Streaming log read for the tailer. |

The base images (`zynd-deployer/agent-base:latest` and `zynd-deployer/service-base:latest`) are built by `infra/install.sh` from the runtime templates in `worker/runtimes/`.

## `caddy.ts` — reverse proxy client

Talks to Caddy's admin API:

- `ensureServer()` — at startup, verifies the wildcard server is configured and creates it if not.
- `addRoute(slug, port)` — adds a `reverse_proxy` route matching `<slug>.deployer.<wildcard>`.
- `removeRoute(slug)` — deletes it.

All calls hit `${CADDY_ADMIN_URL}/config/...`. Routes survive Caddy restarts because Caddy persists its admin-API config.

## `ports.ts` — port allocation

`PortAllocation` is the source of truth for port uniqueness — a unique key on `(port)` plus a unique key on `(deploymentId)` make double-allocation impossible.

| Function | Behavior |
|----------|----------|
| `allocate(deploymentId)` | Loops `[13000, 14000]`, attempts `INSERT ... ON CONFLICT DO NOTHING`, returns first success. Throws `PORT_EXHAUSTED` if the range is full. |
| `release(deploymentId)` | Deletes the `PortAllocation` row by deploymentId. Idempotent. |

`Deployment.port` is a non-unique mirror that may lag (e.g. stays set on a crashed deployment so the dashboard can still show it).

## `health.ts` — `/health` polling

Two roles:

- **Initial probe** during the `health_checking` state — up to 30 attempts at 1 s spacing. Required to advance.
- **Steady-state probe** during `running` — every 60 s. 3 consecutive failures flips the row to `unhealthy`. The container is left untouched — recovers automatically when probes pass again.

The probe URL is always `http://127.0.0.1:<port>/health`; deployments that don't expose this endpoint are stuck in `health_checking` and eventually fail.

## `logs.ts` + `wsLogs.ts` — log capture & fan-out

`logs.ts`:

- `startTailer(deploymentId)` — opens a streaming Docker log read, splits into lines, writes each into `DeploymentLog` with monotonic `lineNo`.
- `stopTailer(deploymentId)` — closes the stream cleanly.
- `appendSystemLog(deploymentId, text)` — synthetic line with `stream="system"` for state transitions and worker-emitted events.

`wsLogs.ts` runs a WebSocket server on a private port. The Next.js dashboard subscribes per deployment ID; new `DeploymentLog` rows are pushed in real time. Log SSE is also exposed via `/api/deployments/[id]/logs` for non-WebSocket clients.

## `metrics.ts` — CPU & memory sampling

Every `DEPLOYER_METRICS_INTERVAL_MS` (default 30 s):

1. List all `running` deployments.
2. For each, read `containerStats` (cgroups: `memory.usage_in_bytes`, `memory.limit_in_bytes`, CPU usage delta).
3. Insert a `DeploymentMetric` row.

Schema is `(deploymentId, sampledAt, memUsedMb, memLimitMb, cpuPct)`. CPU is fraction of one logical CPU (`0..N`), not a percentage of the limit.

## `crash.ts` — Docker event watcher

Subscribes to `docker events` filtered to `event=die`. Each event carries the container's labels — `deploymentId` lets the watcher resolve back to a row and update `status="crashed"`, `lastExitCode`, `lastCrashAt`.

Sub-second detection. Cheaper and faster than polling.

## `retention.ts` — GC

Two passes, daily:

| Target | Default TTL | Env override |
|--------|-------------|--------------|
| `DeploymentLog` (stream != "system") | 7 days | `DEPLOYER_LOG_RETENTION_DAYS` |
| `DeploymentLog` (stream = "system") | 30 days | `DEPLOYER_SYSTEM_LOG_RETENTION_DAYS` |
| `DeploymentMetric` | 3 days | `DEPLOYER_METRIC_RETENTION_DAYS` |

System logs (state transitions) are kept longer than stdout/stderr because they're small and useful for postmortems.

## `runtimes/` — language adapters

Two implementations of the same `Runtime` interface, picked by `lib/detect.ts`:

| File | Detection | Build step | Launch |
|------|-----------|-----------|--------|
| `python.ts` | `requirements.txt` or `pyproject.toml` present | `pip install -r requirements.txt` inside the container at first start | `uvicorn <module>:app --host 0.0.0.0 --port 5000` (or whatever the agent's entry script is) |
| `node.ts` | `package.json` present | `pnpm install --prod` (or `npm`/`yarn` if lockfile suggests) | `node <entry>` from `package.json` `main` or `start` script |

Both runtimes inject the same `ZYND_*` env block. The agent's own code is responsible for reading those and registering on the Zynd network — the deployer doesn't talk to the registry directly.

## What the worker does NOT do

- It doesn't proxy traffic — Caddy does that.
- It doesn't terminate TLS — Caddy + DNS-01 wildcard does that.
- It doesn't sign anything — the agent's keypair stays inside the container.
- It doesn't upload to the registry — the container does that with the keypair the user uploaded.

This separation keeps the worker's blast radius small. A worker compromise leaks running containers' keypairs (because the worker decrypted them at start time), but the master `age` key alone doesn't give an attacker live access to deployed agents — they'd need access to the running container too.

## Next

- **[API Routes](/deployer-app/api-routes)** — what the web service exposes.
- **[Data Model](/deployer-app/data-model)** — schemas the worker reads and writes.
