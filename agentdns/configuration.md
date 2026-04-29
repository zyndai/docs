---
title: Configuration
description: Complete TOML reference for ~/.zynd/config.toml.
---

# Configuration

`agentdns init` writes a default config at `~/.zynd/config.toml`. Every value below is the default — you only need to set what you change. Override the path with `agentdns start --config /path/to.toml`.

## `[node]` — node identity

```toml
[node]
name = "my-registry"             # Display name (shown to peers and in status)
type = "full"                    # "full" | "light" | "gateway"
data_dir = "~/.zynd/data"        # Local data directory for node state
external_ip = "auto"             # Public IP for peer discovery ("auto" = detect)
https_endpoint = ""              # Public HTTPS URL, e.g. "https://dns01.zynd.ai"
                                 # Becomes the registry-host part of every FQAN
```

| Key | Notes |
|-----|-------|
| `type = "full"` | Stores agents, participates in gossip + DHT. |
| `type = "light"` | Read-only, forwards writes to full nodes. |
| `type = "gateway"` | HTTP proxy; no local storage. |
| `https_endpoint` | Not verified locally — only set this to a domain you control. The mesh verifies via TLS + DNS + peer attestation (see [Trust & Verification](/registry/trust-verification)). |

## `[mesh]` — peer-to-peer transport

```toml
[mesh]
listen_port = 4001
max_peers = 15
bootstrap_peers = []             # e.g. ["zns-boot.zynd.ai:4001", "zns01.zynd.ai:4001"]
tls_enabled = true
```

When `max_peers` is exceeded, the peer with the oldest `last_seen` is evicted. TLS uses self-signed certs derived from the node's Ed25519 key — identity is verified at the application layer.

## `[gossip]`

```toml
[gossip]
max_hops = 10
max_announcements_per_second = 100
dedup_window_seconds = 300       # 5 min
```

Higher `max_hops` = wider reach but more bandwidth. The dedup window is per `(type, ID, timestamp)`.

## `[registry]` — PostgreSQL

```toml
[registry]
postgres_url = "postgres://agentdns:agentdns@localhost:5432/agentdns?sslmode=disable"
max_local_agents = 100000        # Soft limit
```

Connection pool: 2–20 connections, 30 min lifetime. Use `sslmode=require` in production.

## `[search]`

```toml
[search]
embedding_backend = "hash"       # "hash" | "onnx" | "http"
embedding_model = "all-MiniLM-L6-v2"
embedding_dimensions = 384
embedding_model_dir = "~/.zynd/models"
embedding_endpoint = ""          # For backend="http"

use_improved_keyword = true      # BM25 v2 (Porter, stopwords, synonyms, per-field boosts)

max_federated_peers = 10
federated_timeout_ms = 1500
default_max_results = 20
```

| Backend | Notes |
|---------|-------|
| `hash` | Zero deps. Decent baseline. |
| `onnx` | Best quality. Auto-downloads to `embedding_model_dir`. Models: `all-MiniLM-L6-v2` (90 MB), `bge-small-en-v1.5` (130 MB, recommended), `e5-small-v2` (130 MB). |
| `http` | Set `embedding_endpoint`. OpenAI- and Ollama-compatible. |

## `[search.ranking]`

```toml
[search.ranking]
method = "weighted"              # "weighted" | "rrf"
text_relevance_weight     = 0.30
semantic_similarity_weight = 0.30
trust_weight              = 0.20
freshness_weight          = 0.10
availability_weight       = 0.10
```

Weights only apply when `method = "weighted"`. RRF needs no tuning. See [Search Engine — Ranking](/agentdns/search-engine#ranking).

## `[cache]`

```toml
[cache]
max_agent_cards = 50000
agent_card_ttl_seconds = 3600
max_gossip_entries = 2000000
```

In-process LRU sizing. The Tier-1 layer of the [two-tier cache](/agentdns/cards-cache#two-tier-cache).

## `[redis]` — optional

```toml
[redis]
url = ""                         # e.g. "redis://localhost:6379/0" — leave empty to disable
password = ""
db = 0
prefix = ""                      # Auto-derived from node.name if empty: "agdns:{name}:"
```

Used for shared agent-card cache, search-result cache, peer bloom filters, rate-limit counters, and peer heartbeat state. The system runs fine without Redis — Tier-1 LRUs and in-memory rate buckets cover everything.

## `[trust]`

```toml
[trust]
min_display_score = 0.1
```

Display-side filter — search omits results below this. The actual EigenTrust math runs regardless.

## `[api]`

```toml
[api]
listen = "0.0.0.0:8080"
rate_limit_search = 100          # per minute, per IP
rate_limit_register = 10
cors_origins = ["*"]             # Restrict in production: ["https://yourdomain.com"]
```

Use a reverse proxy (nginx, Caddy) for TLS termination on this port — Let's Encrypt is the expected path.

## `[bloom]`

```toml
[bloom]
expected_tokens = 500000
false_positive_rate = 0.01       # 1%
update_interval_seconds = 300    # 5 min rebuild
```

Drives the smart peer selection in federated search. Lower false-positive rate = more accurate routing but more memory.

## `[onboarding]`

```toml
[onboarding]
mode = "open"                    # "open" | "restricted"
auth_url = ""                    # Required when mode = "restricted"
webhook_secret = ""              # For POST /v1/admin/developers/approve
```

`open` = self-registration on first handle claim or entity registration. `restricted` = developers must be approved via the webhook before they can register entities.

## `[heartbeat]`

```toml
[heartbeat]
enabled = true
inactive_threshold_seconds = 300 # Mark inactive after 5 min of silence
sweep_interval_seconds = 60      # Background monitor cadence
max_clock_skew_seconds = 60      # Replay protection
```

The clock-skew check prevents replay of old signed timestamps.

## `[dht]`

```toml
[dht]
enabled = true
k = 20
alpha = 3
republish_interval = 3600        # 1 hour
expire_after = 86400             # 24 hours
lookup_timeout_ms = 5000
```

Disable for `light` and `gateway` nodes. Records expire if not republished within `expire_after`.

## Environment variable overrides

A handful of keys can be set via env vars (handy for Docker):

| Env | Overrides |
|-----|-----------|
| `AGENTDNS_CONFIG` | Path to config file (same as `--config`). |
| `AGENTDNS_DATA_DIR` | `[node].data_dir`. |
| `AGENTDNS_POSTGRES_URL` | `[registry].postgres_url`. |
| `AGENTDNS_REDIS_URL` | `[redis].url`. |
| `AGENTDNS_LISTEN` | `[api].listen`. |

## Production checklist

- `[node].https_endpoint` set to a domain you control, served via Let's Encrypt.
- `[registry].postgres_url` uses `sslmode=require`.
- `[redis].url` set (multi-instance deployments).
- `[api].cors_origins` restricted to your dashboard origin(s).
- `/.well-known/zynd-registry.json` published — see [Trust & Verification](/registry/trust-verification).
- `_zynd.<your-domain>` DNS TXT record published.
- `[onboarding].mode = "restricted"` if you don't want public developer signups.

## Next

- **[Architecture & Startup](/agentdns/architecture)** — what each subsystem does at runtime.
- **[CLI Reference](/agentdns/cli)** — operating the binary day-to-day.
