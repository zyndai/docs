---
title: Deployer — Implementation
description: How zynd-deployer is built — Next.js web service, long-lived worker, Postgres state machine.
---

# Deployer (Implementation)

`zynd-deployer` is the open-source implementation that powers `deployer.zynd.ai`. It's a single Ubuntu VM running:

- A Next.js 16 web service (UI + REST API).
- A long-lived TypeScript **worker** process that drives every deployment through a state machine, talking to Docker, Caddy, and Postgres.
- Postgres for state, age for at-rest encryption of uploaded code and keypairs.

If [Deployer Overview](/deployer/) is the *user view* — drag a zip, get a URL — this section is the *implementation view*: every worker subsystem, every internal API, every Prisma model, and the two systemd units that hold it together.

## When to read this section

- You're operating a self-hosted Deployer.
- A deployment is stuck in a state and you need to know which worker subsystem owns it.
- You're contributing to the deployer repo.
- You're integrating against the v1 OpenAPI surface from another tool.

For sign-up flow and dashboard usage go to **[Deployer → Deploy](/deployer/deploy)**.

## Stack

| Layer | Choice |
|-------|--------|
| Web framework | Next.js 16 (App Router, route handlers) |
| Worker | TypeScript / `tsx` — own process, systemd-managed |
| Database | PostgreSQL via Prisma |
| Container runtime | Docker (Linux) |
| Reverse proxy | Caddy with DNS-01 wildcard TLS |
| At-rest encryption | `age` (CLI shelled out, not a JS binding) |
| Languages supported | Python 3.12 and Node 20 (auto-detected) |

## Two-process architecture

```
                         ┌───────────────────────────────────────────────────┐
                         │                Single Ubuntu VM                   │
                         │                                                   │
   Browser ──HTTPS──▶ ┌─────────────┐                  ┌─────────────────┐  │
                       │ Next.js web │                  │     Worker      │  │
                       │ (systemd:   │                  │ (systemd:       │  │
                       │  web.svc)   │                  │  worker.svc)    │  │
                       └──────┬──────┘                  └────────┬────────┘  │
                              │                                  │           │
                              │   ┌──────────────┐               │           │
                              └──▶│  PostgreSQL  │◀──────────────┘           │
                                  │  Deployment  │                            │
                                  │   state      │                            │
                                  └──────────────┘                            │
                                                                              │
                              ┌─────── /var/lib/zynd-deployer ───────┐       │
                              │  blobs/  keys/  workdirs/  logs/     │       │
                              └──────────────────────────────────────┘       │
                                                                              │
                       ┌──────────────┐                  ┌──────────────┐    │
                       │    Caddy     │◀─admin API──────┤    Worker    │    │
                       │ wildcard TLS │                  │ (caddy.ts)   │    │
                       └──────┬───────┘                  └──────────────┘    │
                              │                                              │
                              ▼                                              │
                       127.0.0.1:13xxx ───▶ Docker container                 │
                                            (the agent / service)            │
                         └───────────────────────────────────────────────────┘
```

The web service **never** runs Docker, never edits Caddy, never holds the age key. It accepts uploads, encrypts them, inserts a `Deployment` row with `status=queued`, and returns. Everything else happens in the worker.

This split is what lets the web service stay stateless and restart instantly without disturbing running containers.

## Repository layout

```
zynd-deployer/
├── prisma/
│   ├── schema.prisma          # Deployment, DeploymentLog, DeploymentMetric, PortAllocation
│   └── migrations/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── deployments/   # POST upload, GET list, [id]/route, [id]/logs (SSE)
│   │   │   ├── caddy/ask      # Caddy on-demand TLS hook
│   │   │   ├── stats/         # Dashboard stats
│   │   │   └── v1/agents/     # Public OpenAPI surface
│   │   ├── d/[id]/            # Deployment detail page
│   │   ├── deploy/            # Upload page (DropZone)
│   │   ├── docs/              # In-app docs
│   │   └── page.tsx           # Dashboard
│   ├── components/            # DropZone, DeploymentList, LogStream, etc.
│   └── lib/
│       ├── crypto.ts          # age wrapper (encrypt/decrypt blobs)
│       ├── slug.ts            # slugify(name) + suffix
│       ├── detect.ts          # python vs node runtime detection
│       ├── validator.ts       # zip safety: no developer.json, no abs paths, size cap
│       ├── runtime.ts         # injects ZYND_* env into config files
│       ├── pythonImports.ts   # static import scan
│       ├── resolveDeployment.ts
│       ├── db.ts              # Prisma singleton
│       ├── config.ts          # env-driven config
│       ├── slug.ts
│       └── types.ts
├── worker/
│   ├── main.ts                # entry — drain queue + watch crashes
│   ├── lifecycle.ts           # state machine
│   ├── docker.ts              # docker run / stop / remove
│   ├── caddy.ts               # Caddy admin API client
│   ├── ports.ts               # PortAllocation source-of-truth
│   ├── health.ts              # /health polling loop
│   ├── logs.ts                # log tailer + system logs
│   ├── wsLogs.ts              # WebSocket log fan-out
│   ├── metrics.ts             # CPU/memory sampler (cgroups)
│   ├── crash.ts               # docker events watcher
│   ├── retention.ts           # log + metric GC
│   └── runtimes/
│       ├── python.ts          # pip install + uvicorn launch
│       └── node.ts            # pnpm install + node entry
├── infra/
│   ├── install.sh             # one-shot Ubuntu setup
│   ├── setup-caddy.sh
│   ├── Caddyfile
│   └── systemd/
│       ├── zynd-deployer-web.service
│       └── zynd-deployer-worker.service
└── package.json
```

## Pages in this section

- **[Architecture](/deployer-app/architecture)** — web + worker boundary, state machine, the encryption pipeline, why we split the way we do.
- **[Worker Subsystems](/deployer-app/worker)** — every file under `worker/`: lifecycle driver, Docker glue, Caddy client, health loop, log tailer, metrics, crash watcher, retention.
- **[API Routes](/deployer-app/api-routes)** — Next.js route handlers and the public `/api/v1/agents/*` OpenAPI surface.
- **[Data Model](/deployer-app/data-model)** — Prisma schema for `Deployment`, `DeploymentLog`, `DeploymentMetric`, `PortAllocation`, and the at-rest encryption layout.

## See also

- **[Deployer Overview](/deployer/)** — user-facing intro.
- **[Deployer — Self-Host](/deployer/self-host)** — VM setup, install.sh, env vars.
- **[Deployer — Monitoring & Logs](/deployer/monitoring)** — what the worker emits and how to read it.
