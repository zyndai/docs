---
title: "Run a Registry Node"
description: "Stand up an agentdns registry node and join the mesh — install, configure, secure, and operate."
---

# Run a Registry Node

`agentdns` is the Go binary that implements the [Registry Spec](../architecture/registry-spec/). One process, talks Postgres + Redis + the mesh + the HTTP API.

This page is the operator's runbook. For protocol-level details see [Architecture: Registry Spec](../architecture/registry-spec/) and for binary internals see [Architecture: AgentDNS](../architecture/agentdns/).

## Pre-flight

| Need | Detail |
|---|---|
| Linux VM | 2 vCPU, 4 GB RAM minimum for a small mesh node; 8+ GB once you start indexing thousands of entities |
| Postgres 14+ | Either local or managed (RDS / Cloud SQL fine) |
| Redis (optional) | Speeds up cards / rate limits / bloom filters; the node runs without it |
| A domain | Public registries should serve TLS at a real domain, e.g. `registry.example.com` |
| Outbound TCP+TLS to port 4001 | For mesh peering |

## Install

```bash
# Download the latest binary (placeholder — adjust to actual release path)
curl -L -o /usr/local/bin/agentdns https://github.com/zyndai/AgentDNS/releases/latest/download/agentdns-linux-amd64
chmod +x /usr/local/bin/agentdns

agentdns version
```

Or build from source:

```bash
git clone https://github.com/zyndai/AgentDNS
cd AgentDNS
go build -o /usr/local/bin/agentdns ./cmd/agentdns
```

## Initialise

```bash
agentdns init
```

Creates:

- `~/.zynd/identity.json` — node Ed25519 keypair. **Back this up.**
- `~/.zynd/config.toml` — default config; safe to edit before `start`.

## Configure

`~/.zynd/config.toml` holds everything. Most operators only edit a handful of sections.

### `[node]`

```toml
[node]
name = "my-registry"
type = "full"                          # "full" | "light" | "gateway"
data_dir = "~/.zynd/data"
external_ip = "auto"                   # or a fixed IP
https_endpoint = "https://my-registry.example.com"
```

`https_endpoint` becomes the prefix of every FQAN your node mints, so set it to a domain you control.

### `[mesh]`

```toml
[mesh]
listen_port = 4001
max_peers = 15
bootstrap_peers = ["zns-boot.zynd.ai:4001", "zns01.zynd.ai:4001"]
tls_enabled = true
```

`bootstrap_peers` is how new nodes find the mesh. Leave the defaults to join the public Zynd mesh; replace with your own seeds for a private mesh.

### `[registry]`

```toml
[registry]
postgres_url = "postgres://agentdns:agentdns@localhost:5432/agentdns?sslmode=require"
max_local_agents = 100000
```

In production: `sslmode=require`. The connection pool is 2–20 connections.

### `[search]`

```toml
[search]
embedding_backend = "onnx"
embedding_model   = "bge-small-en-v1.5"
embedding_dimensions = 384

use_improved_keyword = true

max_federated_peers   = 10
federated_timeout_ms  = 1500
default_max_results   = 20
```

For tiny meshes / CI, `embedding_backend = "hash"` is zero-deps. For best recall, ONNX with `bge-small-en-v1.5` (~130 MB; auto-downloaded with SHA-256 verification on first start). For shared embeddings via OpenAI / Ollama, `embedding_backend = "http"` with `embedding_endpoint = "..."`.

### `[search.ranking]`

```toml
[search.ranking]
method = "weighted"           # or "rrf"
text_relevance_weight     = 0.30
semantic_similarity_weight = 0.30
trust_weight              = 0.20
freshness_weight          = 0.10
availability_weight       = 0.10
```

`weighted` lets you tune. `rrf` needs no tuning.

### `[redis]` (optional)

```toml
[redis]
url = "redis://localhost:6379/0"
```

Without Redis the node still works — Tier-1 LRUs and in-memory rate buckets cover most needs.

### `[api]`

```toml
[api]
listen = "0.0.0.0:8080"
rate_limit_search   = 100
rate_limit_register = 10
cors_origins = ["https://my-dashboard.example.com"]
```

Use a reverse proxy (Caddy / nginx) for TLS on this port.

### `[onboarding]`

```toml
[onboarding]
mode = "open"                  # or "restricted"
auth_url = ""
webhook_secret = ""
```

`open` = self-registration on first handle claim or entity registration. `restricted` = developers must be approved via webhook.

### `[heartbeat]`

```toml
[heartbeat]
enabled = true
inactive_threshold_seconds = 300   # 5 min
sweep_interval_seconds = 60
max_clock_skew_seconds = 60
```

### `[dht]`

```toml
[dht]
enabled = true
k = 20
alpha = 3
republish_interval = 3600
expire_after = 86400
lookup_timeout_ms = 5000
```

Disable for `light` and `gateway` nodes.

### Env var overrides

| Env | Overrides |
|---|---|
| `AGENTDNS_CONFIG` | Path to config file (same as `--config`) |
| `AGENTDNS_DATA_DIR` | `[node].data_dir` |
| `AGENTDNS_POSTGRES_URL` | `[registry].postgres_url` |
| `AGENTDNS_REDIS_URL` | `[redis].url` |
| `AGENTDNS_LISTEN` | `[api].listen` |

## Start

```bash
agentdns start
```

Logs go to stdout. Block on SIGINT/SIGTERM.

For a systemd unit:

```ini
# /etc/systemd/system/agentdns.service
[Unit]
Description=Zynd AgentDNS registry
After=network.target postgresql.service
Wants=postgresql.service

[Service]
ExecStart=/usr/local/bin/agentdns start --config /etc/agentdns/config.toml
EnvironmentFile=/etc/agentdns/agentdns.env
Restart=on-failure
User=agentdns

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now agentdns
sudo journalctl -u agentdns -f
```

## TLS

Front the API with Caddy:

```caddy
my-registry.example.com {
    reverse_proxy localhost:8080
}
```

Caddy auto-issues a Let's Encrypt cert. The mesh port (4001) does **not** need a CA cert — it uses self-signed TLS verified at the application layer.

## CLI day-to-day

```bash
agentdns status          # uptime, peers, agents, gossip rate, DHT state
agentdns peers           # connected peers + verification tier
agentdns version
```

For the full subcommand list see [Architecture: AgentDNS — CLI](../architecture/agentdns/).

## Production checklist

- [ ] `[node].https_endpoint` set to a domain you control.
- [ ] TLS via Let's Encrypt on port 8080 (Caddy / nginx).
- [ ] `[registry].postgres_url` uses `sslmode=require`.
- [ ] `[redis].url` set if running multiple instances behind a load balancer.
- [ ] `[api].cors_origins` restricted to your dashboard origin(s).
- [ ] `/.well-known/zynd-registry.json` published (signed registry identity proof).
- [ ] `_zynd.<your-domain>` DNS TXT record published — peer verification falls back to it.
- [ ] `[onboarding].mode = "restricted"` if you don't want public developer signups.
- [ ] Identity backed up — `~/.zynd/identity.json`.
- [ ] Postgres backed up daily.
- [ ] Metrics scrape configured — see [Metrics & Monitoring](./metrics).

## Joining the public Zynd mesh

If you want your node to be part of the global Zynd network (so registrations on your node show up in `zns01.zynd.ai` searches and vice versa):

1. Set `bootstrap_peers = ["zns-boot.zynd.ai:4001"]`.
2. Make sure your `[node].external_ip` is reachable on port 4001 from the public internet.
3. Publish a registry identity proof at `/.well-known/zynd-registry.json` so peers verify your domain.

Then start the node — it'll announce itself, exchange bloom filters, and begin gossiping.

## Running a private mesh

For an air-gapped or internal-only deployment:

1. Stand up two or more `agentdns` nodes within your network.
2. Pick one to be the bootnode — set its address as `bootstrap_peers` on every other node.
3. Don't publish to the public Zynd mesh — leave `bootstrap_peers = []` (or just your private peers) on each node.
4. Point your developers' `ZYND_REGISTRY_URL` at one of the nodes.

That's it — your developers' agents register on your private registry, your private peers gossip to each other, the public Zynd network is never touched.

## See also

- **[Architecture: Registry Spec](../architecture/registry-spec/)** — what the protocol means.
- **[Architecture: AgentDNS](../architecture/agentdns/)** — the binary's internals.
- **[Local Testing](./local-testing)** — same binary, dev mode.
- **[Metrics & Monitoring](./metrics)** — what to watch.
