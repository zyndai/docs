---
title: Self-Host Deployer
description: Run your own zynd-deployer on a single VM.
---

# Self-Host Deployer

The Deployer is designed to run on one Ubuntu VM. The `infra/install.sh` script sets up everything: Docker, Postgres, Caddy, age, Node, the worker, and the web service.

## Prerequisites

- Ubuntu 24.04 LTS (18-server-class VM with 4+ CPU, 8+ GB RAM recommended).
- A domain pointed at the VM with wildcard DNS — e.g. `*.deployer.your-domain.com → <vm_ip>`.
- Cloudflare API token (for DNS-01 wildcard TLS via Caddy).
- Root or sudo access.

## 1. Point DNS

At your DNS provider:

```
A      deployer.your-domain.com       <vm_ip>
A      *.deployer.your-domain.com     <vm_ip>     # wildcard for tenant slugs
```

Wait for propagation (`dig +short deployer.your-domain.com` returns the IP).

## 2. Clone and bootstrap

```bash
git clone https://github.com/zyndai/zynd-deployer.git
cd zynd-deployer
sudo bash infra/install.sh
```

The script:

1. Installs Docker, Postgres 15, Caddy, age, Node 20, pnpm.
2. Creates a `zynd` system user.
3. Creates `/var/lib/zynd-deployer/` with proper ownership.
4. Generates a master age key at `/var/lib/zynd-deployer/master.age`.
5. Builds `zynd-deployer/agent-base:latest` and `zynd-deployer/service-base:latest` Docker images.
6. Configures Caddy with the wildcard domain + DNS-01 challenge.
7. Writes systemd units for `zynd-deployer-web.service` and `zynd-deployer-worker.service`.
8. Enables and starts everything.

Once done, visit `https://deployer.your-domain.com`.

## 3. Configure

Edit `/etc/zynd-deployer/.env`:

```bash
# Required
DATABASE_URL=postgresql://zynd:<password>@127.0.0.1:5432/zynddeployer
AGE_IDENTITY_PATH=/var/lib/zynd-deployer/master.age
DEPLOYER_DATA_ROOT=/var/lib/zynd-deployer
DEPLOYER_WILDCARD_DOMAIN=deployer.your-domain.com

# Zynd network
ZYND_REGISTRY_URL=https://zns01.zynd.ai

# Caddy
CADDY_ADMIN_URL=http://127.0.0.1:2019

# Docker
DOCKER_SOCKET=/var/run/docker.sock
AGENT_BASE_IMAGE=zynd-deployer/agent-base:latest
SERVICE_BASE_IMAGE=zynd-deployer/service-base:latest

# Limits (override defaults)
DEPLOYER_PORT_MIN=13000
DEPLOYER_PORT_MAX=14000
DEPLOYER_MAX_ACTIVE=50
DEPLOYER_CONTAINER_MEM_MB=1536
DEPLOYER_CONTAINER_CPU_MILLIS=1000

# Retention
DEPLOYER_LOG_RETENTION_DAYS=7
DEPLOYER_SYSTEM_LOG_RETENTION_DAYS=30
DEPLOYER_METRIC_RETENTION_DAYS=3

# Health / metrics
DEPLOYER_METRICS_INTERVAL_SEC=30
DEPLOYER_HEALTH_INTERVAL_SEC=60
DEPLOYER_HEALTH_FAIL_THRESHOLD=3
```

Restart after edits:

```bash
sudo systemctl restart zynd-deployer-web zynd-deployer-worker
```

## 4. Caddy setup

The install script writes `/etc/caddy/Caddyfile` with two blocks:

```caddyfile
# UI host
deployer.your-domain.com {
    reverse_proxy 127.0.0.1:3000
    tls { dns cloudflare <API_TOKEN> }
}

# Wildcard tenant host
*.deployer.your-domain.com {
    tls { dns cloudflare <API_TOKEN> }
    # routes added dynamically by worker via admin API
}
```

The worker calls the Caddy admin API at `http://127.0.0.1:2019` to add/remove routes when deployments start/stop.

## 5. Systemd services

```bash
systemctl status zynd-deployer-web        # Next.js on :3000
systemctl status zynd-deployer-worker     # Node worker loop
journalctl -u zynd-deployer-worker -f     # live worker logs
```

## 6. Docker base images

Located at `images/`:

- `Dockerfile.agent-base` — Python 3.12 slim + LangChain/CrewAI/LangGraph/PydanticAI preinstalled + `entrypoint.sh`.
- `Dockerfile.service-base` — same base, different entrypoint for `service.py`.
- `entrypoint.sh` — installs `requirements.txt` if present, then runs `agent.py` or `service.py`.

Rebuild after changing:

```bash
docker build -t zynd-deployer/agent-base:latest -f images/Dockerfile.agent-base images/
docker build -t zynd-deployer/service-base:latest -f images/Dockerfile.service-base images/
```

## 7. Storage layout

```
/var/lib/zynd-deployer/
├── master.age                   # age master key (600)
├── blobs/
│   └── <deployment_id>.zip.age  # encrypted uploads
├── keys/
│   └── <deployment_id>/
│       └── keypair.json.age     # encrypted keypairs
└── work/
    └── <deployment_id>/         # decrypted workdir for container mount
```

Permissions: all owned by `zynd:zynd`, mode 700.

## 8. Database schema

Four tables — Prisma migrations live in `prisma/`.

| Table | Purpose |
|-------|---------|
| `Deployment` | Core state: id, slug, status, entityType, port, containerId, hostUrl, errorMessage. |
| `DeploymentLog` | Line-by-line logs: deploymentId, lineNo, text, stream, ts. |
| `DeploymentMetric` | CPU/memory samples. |
| `PortAllocation` | Port → deploymentId, atomic uniqueness. |

Run migrations on first boot:

```bash
sudo -u zynd pnpm --dir /opt/zynd-deployer prisma migrate deploy
```

## 9. Scaling

One VM, by default, comfortably handles ~50 concurrent deployments. To go further:

- Raise `DEPLOYER_MAX_ACTIVE` + container RAM limits — single VM vertical scaling.
- Run multiple Deployer VMs behind a load balancer, each with its own wildcard subdomain (e.g. `*.us-east.deployer.your-domain.com`).
- There is no cross-VM clustering — deployments live on the VM that received the upload.

## 10. Security

- **No user auth** — the Deployer is open. If you want to restrict uploads, put Cloudflare Access or a basic-auth proxy in front.
- **age encryption at rest** — keys + zips are encrypted. The master key is mode 600 and owned by `zynd`.
- **Container isolation** — 1 CPU, 1.5 GB, read-only filesystem mount, no `--privileged`.
- **No developer keys uploaded** — validator rejects. Developer keys stay on the dev's machine.

## 11. Dev loop

```bash
# Local development with docker-compose
docker compose up     # web + worker + postgres
# Open http://localhost:3000
```

`docker-compose.yml` mounts your code with hot reload. Set `DEPLOYER_SKIP_CADDY=true` to bypass Caddy registration when developing locally.

## Next

- **[Deployer Overview](/deployer/)** — back to architecture.
- **[Deploy walkthrough](/deployer/deploy)** — user flow on the hosted version.
- **[Troubleshooting](/deployer/troubleshooting)** — common failure modes.
