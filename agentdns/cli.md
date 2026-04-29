---
title: CLI Reference
description: Every agentdns subcommand and flag.
---

# CLI Reference

```
agentdns <command> [flags]
```

| Command | Description |
|---------|-------------|
| `init` | Generate Ed25519 keypair + default config at `~/.zynd/`. |
| `start` | Start the registry node. `--config <path>` overrides `~/.zynd/config.toml`. |
| `register` | Register an agent against this node. |
| `search` | Search agents on this node (with optional federation). |
| `resolve` | Get an agent's registry record by ID. |
| `card` | Fetch an agent's live Agent Card by ID. |
| `status` | Node status — uptime, peer count, agent count, gossip stats. |
| `peers` | List connected mesh peers. |
| `deregister` | Remove an agent from the registry. |
| `version` | Print binary version. |

## `init`

```bash
agentdns init
```

Creates:

- `~/.zynd/identity.json` — node Ed25519 keypair (back this up).
- `~/.zynd/config.toml` — default config; safe to edit before `start`.

Idempotent for the config (won't overwrite); will refuse to overwrite an existing identity unless `--force` is passed.

## `start`

```bash
agentdns start [--config <path>]
```

Boots the full stack: Postgres, Redis (optional), search engine, mesh transport, DHT (optional), background loops, HTTP API.

```bash
# Custom config path
agentdns start --config /etc/agentdns/prod.toml
```

Logs go to stdout. The process blocks on SIGINT/SIGTERM for graceful shutdown.

## `register`

```bash
agentdns register \
  --name "CodeReviewBot" \
  --agent-url "https://example.com/.well-known/agent.json" \
  --category "developer-tools" \
  --tags "python,security,code-review" \
  --summary "AI agent that reviews Python code for security vulnerabilities"
```

| Flag | Required | Description |
|------|----------|-------------|
| `--name` | yes | Display name. |
| `--agent-url` | yes | Where to fetch the live Agent Card. |
| `--category` | yes | One of the categories returned by `GET /v1/categories`. |
| `--tags` | no | Comma-separated keywords. |
| `--summary` | no | ≤ 200 chars; appears in search results. |

The CLI signs the registration with `~/.zynd/identity.json` and POSTs `/v1/entities` to the local node.

## `search`

```bash
agentdns search "translate english to japanese" \
  --category translation \
  --max-results 10
```

| Flag | Description |
|------|-------------|
| `--category` | Filter to one category. |
| `--min-trust` | Float 0–1. Drops results below this threshold. |
| `--status` | `online` / `offline` / `any`. |
| `--max-results` | Default 20. |
| `--federated` | Fan out to peers via mesh. |
| `--enrich` | Fetch live Agent Cards for top hits. |

## `resolve`

```bash
agentdns resolve agdns:7f3a9c2e1d8b4a06
```

Returns the full registry record. Falls through local store → gossip → DHT in that order.

## `card`

```bash
agentdns card agdns:7f3a9c2e1d8b4a06
```

Fetches the live Agent Card via the fetcher (LRU → Redis → HTTP). Use this to inspect what semantic search and `enrich: true` would actually see.

## `status`

```bash
agentdns status
```

```
Node ID     : agdns:registry:a1b2c3d4
Version     : 0.9.1
Uptime      : 3d 12h 47m
Peers       : 12 connected (15 known)
Agents      : 4213 local, 28741 gossip
Gossip      : 42 announcements/min in, 38/min out
DHT         : enabled (k=20, alpha=3)
```

## `peers`

```bash
agentdns peers
```

Lists each peer's registry ID, address, agent count, last seen, latency, and verification tier (self-announced / domain-verified / DNS-published / mesh-verified — see [Trust & Verification](/registry/trust-verification)).

## `deregister`

```bash
agentdns deregister agdns:7f3a9c2e1d8b4a06
```

Signs a tombstone with `~/.zynd/identity.json`. The tombstone propagates via gossip; remote nodes honor it for the configured TTL.

## `version`

```bash
agentdns version
```

Prints semver and build hash.

## Exit codes

| Code | Meaning |
|------|---------|
| 0 | Success. |
| 1 | Generic error (config, IO). |
| 2 | Bad CLI flag. |
| 3 | Postgres / Redis / mesh dial failure during `start`. |
| 4 | Signature verification failed for a write command. |

## Next

- **[Configuration](/agentdns/configuration)** — every TOML option.
- **[Architecture & Startup](/agentdns/architecture)** — what `start` actually does.
