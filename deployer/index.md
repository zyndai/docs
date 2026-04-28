---
description: Host user-uploaded Zynd agents and services on a single VM with stable HTTPS URLs.
---

# Zynd Deployer

**Zynd Deployer** hosts user-uploaded Zynd agents and services on a single VM with stable HTTPS URLs. It is the control plane + worker that replaces ngrok for anyone who wants a persistent hosted Zynd agent without owning infrastructure.

> Open `https://deployer.zynd.ai`, drag-drop your Zynd project folder + `keypair.json`, and click Deploy. You get back `https://<slug>.deployer.zynd.ai` — a stable HTTPS endpoint your agent runs at.

## Quick Start (Local Dev)

Requires Node 20+, Docker, Postgres 15+, and [age](https://github.com/FiloSottile/age) on the host.

```bash
pnpm install
cp .env.example .env
# point DATABASE_URL at a local postgres, then:
age-keygen -o ./master.age
export AGE_IDENTITY_PATH="$PWD/master.age"
pnpm prisma:migrate:dev
pnpm dev          # Next.js on :3000
pnpm worker:dev   # worker polling loop
```

Open <http://localhost:3000>, drag-drop a Zynd project folder + its `keypair.json`, and click Deploy.

## Production

One-shot bootstrap on a fresh Ubuntu 24.04 VM:

```bash
sudo bash infra/install.sh
```

That installs Docker, Postgres, Caddy, age, builds the base images, writes the systemd units for the web service and worker, and configures the wildcard DNS-01 cert in Caddy. After that the operator just runs:

```bash
systemctl enable --now zynd-deployer-web zynd-deployer-worker
```

## Layout

```
zynd-deployer/
├── src/              # Next.js 15 app (UI + API routes)
├── worker/           # Background process: docker + caddy lifecycle
├── prisma/           # Database schema + migrations
├── images/           # Base Dockerfiles for agent and service containers
├── infra/            # VM bootstrap script, systemd units, Caddyfile
└── PLAN.md           # Design doc
```

## What the Deployer Accepts

- **`project.zip`** — containing either:
  - `agent.config.json` + `agent.py` (Python agent), or
  - `service.config.json` + `service.py` (Python service), at the root.
- **`keypair.json`** — the Ed25519 identity for the agent/service.

The developer key stays on the user's laptop. The deployer **refuses uploads that include a `developer.json` file**.

## Core Architecture

```
Browser ──upload──► Next.js App ──► Postgres (deployment row)
                          │
                          ▼
                    Worker polls Postgres
                          │
                  ┌───────┴───────┐
                  ▼               ▼
            Docker daemon    Caddy reverse proxy
            (container)      (route slug → container)
                  │               │
                  └───────┬───────┘
                          ▼
              https://<slug>.deployer.zynd.ai
```

## Locked Decisions

| Decision | Value | Why |
|---|---|---|
| **Auth** | None | Open deployer. Attribution comes from the agent's developer_id on the registry. |
| **Public hostname** | `deployer.zynd.ai` (UI) + `*.deployer.zynd.ai` (deployments) | One wildcard cert, one zone. |
| **Deployable kinds** | HTTP agents + HTTP services | MQTT/legacy out of scope. |
| **Registration model** | Agent auto-updates itself on every start | Developer key never touches the deployer. |
| **Stack** | Next.js 15 + Prisma + Postgres + Docker + Caddy + age | Matches the wider Zynd stack. |
| **Key encryption at rest** | `age` with a VM-local master key | Decrypted only when the container starts. |

## Documentation

| Document | Description |
|----------|-------------|
| [Design Plan](/deployer/design-plan) | Full design doc — architecture, flows, validation contract, lifecycle |

## Related

- [Python SDK](/python-sdk/) — Build agents that get deployed
- [TypeScript SDK](/typescript-sdk/) — Build TS/JS agents
