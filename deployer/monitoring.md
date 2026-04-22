---
title: Monitoring & Logs
description: Read live logs, metrics, and health status for your Zynd deployments.
---

# Monitoring & Logs

Every deployment exposes logs, metrics, and health on the detail page.

## Detail page layout

At `deployer.zynd.ai/d/<id>`:

| Panel | Shows |
|-------|-------|
| **Header** | Name, slug, entity type, status badge, Stop button. |
| **Info grid** | Public URL, registry URL, entity ID, public key, host port, container ID, created time, started time, last exit code. |
| **Live logs** | SSE stream of stdout/stderr, tagged by stream. |
| **Metrics** | CPU %, memory MB, over last 3 days. |

## Log stream

Logs are served via Server-Sent Events at `/api/deployments/<id>/logs/stream`.

Every stdout/stderr line your agent prints is captured by `docker logs -f`, demuxed, and inserted into `DeploymentLog` with an incrementing `lineNo`. The browser subscribes and renders in real time.

Stream classes:

| Stream | Color | Source |
|--------|-------|--------|
| `stdout` | default | `print(...)` from your agent |
| `stderr` | red | exceptions, warnings, framework errors |
| `system` | blue | Deployer events — crash, health, unhealthy, stop |

Live logs retain 7 days by default. System logs retain 30 days. Older lines are batch-deleted hourly.

## Metrics

Sampled every 30 s while running.

Schema:

```
DeploymentMetric
├── deploymentId
├── sampledAt       timestamp
├── memUsedMb       container memory usage
├── memLimitMb      container memory limit (1536 default)
└── cpuPct          % of 1 CPU (100 = one full core)
```

The detail page plots both as time series.

## Health

The worker polls `http://127.0.0.1:<port>/health` inside the container every 60 seconds.

State transitions:

- **0-2 failures** → `running` (counter resets on any success).
- **3 consecutive failures** → `unhealthy`. Status badge turns yellow. System log entry `[UNHEALTHY] health probe failed 3 times`.
- **Health recovers** → `running` again, status badge green.

The container is not restarted automatically — Docker's `unless-stopped` policy handles hard crashes, not slow `/health`.

Make sure your agent responds to `GET /health` quickly (< 2 s). The SDK handles this automatically; only custom implementations need to worry.

## Crash detection

A persistent `docker events` subscription catches `die` and `oom` events. When a `zynd-<id>` container dies:

1. Exit code read via `docker inspect`.
2. Last 100 log lines captured into `DeploymentLog`.
3. Status → `crashed`.
4. System log entry: `[CRASH] exit=<code> oom=<bool>`.

If you set `DEPLOYER_KEEP_CRASHED_CONTAINERS=true`, the dead container is preserved for `docker exec` debugging. Otherwise it's removed.

## Stopping

Click **Stop**. Worker:

1. Sets `status=stopped`.
2. `drainStops` loop finds the row on its next tick.
3. Sends SIGTERM to the container. Waits 10 s.
4. Sends SIGKILL if still alive.
5. `docker rm` the container.
6. Removes the Caddy route.
7. Releases the port.
8. Clears `containerId` and `port` on the row.

Failures at any cleanup step are logged as system entries but don't wedge the row.

## Programmatic access

### List deployments

```bash
curl https://deployer.zynd.ai/api/deployments
```

### Single deployment

```bash
curl https://deployer.zynd.ai/api/deployments/<id>
```

### Fetch logs

```bash
curl "https://deployer.zynd.ai/api/deployments/<id>/logs?since=<lineNo>&limit=500"
```

### Stream logs (SSE)

```bash
curl -N https://deployer.zynd.ai/api/deployments/<id>/logs/stream
```

### Stop

```bash
curl -X DELETE https://deployer.zynd.ai/api/deployments/<id>
```

## Best practices

- **Log structured JSON** if you want to grep. `python-json-logger` is preinstalled in the agent base image.
- **Don't use `/health` for heavy work.** It's polled every minute — keep it a cheap `return 200`.
- **Use external DBs** for any state you care about. The container filesystem is ephemeral.
- **Handle SIGTERM** — your Flask server should exit cleanly on stop. The SDK does this by default.

## Next

- **[Troubleshooting](/deployer/troubleshooting)** — what to do when things go wrong.
- **[Self-Host Deployer](/deployer/self-host)** — tune retention, port ranges, limits.
