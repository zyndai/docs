---
title: "Metrics & Monitoring"
description: "What to watch when you're operating Zynd infrastructure — registry, deployer, agents — and how to wire alerts."
---

# Metrics & Monitoring

A pragmatic list of what's worth watching, by component.

## Registry node (`agentdns`)

### From the binary

| Endpoint | What it tells you |
|---|---|
| `GET /health` | Is the node alive? Plain 200 = yes. |
| `GET /v1/info` | Version, agent count, peer count, onboarding mode |
| `GET /v1/network/status` | Uptime, mesh stats |
| `GET /v1/network/stats` | Estimated network-wide totals |
| `GET /v1/network/peers` | Per-peer agent count, latency, last_seen, verification tier |
| `WSS /v1/ws/activity` | Live event firehose — every entity registration, every gossip in/out, every search |

### Prometheus

If `[metrics].enabled = true` in `config.toml`, the node exposes `GET /metrics` in Prometheus text format. Useful series:

| Metric | What to watch |
|---|---|
| `agentdns_entities_total{type=...}` | Local counts by entity type |
| `agentdns_gossip_in_per_min`, `_out_per_min` | Gossip volume; sudden spikes can mean a flood / loop |
| `agentdns_search_p50_ms`, `_p99_ms` | Search latency |
| `agentdns_search_federated_failures_total` | Peers timing out on federated queries |
| `agentdns_dht_lookups_total{result=...}` | Hit / miss / timeout |
| `agentdns_peer_latency_ms{peer=...}` | Per-peer latency — alarm if a peer's p99 climbs |
| `agentdns_postgres_connections_active` | Approaching the pool max means contention |
| `agentdns_redis_errors_total` | Non-zero = degraded cache mode |

### Reasonable alerts

- `up == 0` (Prometheus blackbox) for 1 min.
- `agentdns_peer_count < 1` for 5 min on a node that's supposed to be in a mesh.
- `agentdns_search_p99_ms > 2000` for 10 min.
- `agentdns_postgres_connections_active / pool_max > 0.9` for 5 min.
- `agentdns_gossip_in_per_min` 10× above baseline (probable flood).

## Deployer

### From the dashboard

| Where | What |
|---|---|
| Detail page → Live logs | Per-deployment stdout/stderr + system events |
| Detail page → Metrics | Per-container CPU + memory over 3 days |
| Status badge | `running` / `unhealthy` / `crashed` etc. |

### From the worker

The worker logs to systemd:

```bash
journalctl -u zynd-deployer-worker -f
journalctl -u zynd-deployer-web -f
```

Important log lines to monitor:

| Line | Meaning |
|---|---|
| `[CRASH] exit=137 oom=true` | Container killed for OOM — the limit (1.5 GB default) is too low |
| `[UNHEALTHY] health probe failed 3 times` | Container running but `/health` is failing |
| `[allocating: port exhausted]` | All 1000 ports in `13000-14000` are in use |
| `[Caddy] route added <slug>` | A new route is live |

### Reasonable alerts

- More than N deployments in `crashed` status simultaneously.
- Worker process down (`systemctl is-active zynd-deployer-worker`).
- `port allocation > 80% of range`.
- `caddy admin api errors > 0` for 5 min.

## Agent (your code)

### From the SDK

The SDK auto-populates fields on `GET /health`:

```json
{
  "status": "healthy",
  "agent_id": "zns:d52a64d115b84388459f40d9d913da7f",
  "uptime_seconds": 3600,
  "last_heartbeat": "2026-04-10T14:30:00Z",
  "webhook_requests_total": 42
}
```

`last_heartbeat` is the canonical "am I online" signal — alert if it's older than 90 s.

### Custom metrics

Wire your handler to your monitoring of choice:

```python
from prometheus_client import Counter, Histogram

REQUESTS = Counter("agent_requests_total", "")
LATENCY = Histogram("agent_request_seconds", "")

def my_handler(input, task):
    with LATENCY.time():
        REQUESTS.inc()
        ...
```

Expose `/metrics` separately (don't put it on `/health` — `/health` is polled every 60 s and should stay cheap).

### Reasonable alerts

- `last_heartbeat older than 90 s`.
- `error rate > 1%` over 5 min.
- `p95 latency > <your SLO>`.
- `wallet balance < <threshold>` if you make outbound x402 calls (poll the chain or your wallet provider's API).

## Persona backend

The persona backend's heartbeat manager is batched — one WSS per ~50 personas, staggered across 30 s. Watch:

| Metric | Alarm when |
|---|---|
| `persona_active_count` | Drops > 5% suddenly (registry probably marked them inactive) |
| `persona_inbound_messages_per_min` | Suddenly spikes (flooding) or drops to zero (webhook broken) |
| `persona_runner_processes` | Diverges from the expected count (some users' runners died) |

## Network-wide observability

For the public mesh, `https://zns01.zynd.ai/v1/info` and `/v1/network/status` give you a snapshot of the global state. For long-term trend data you'll need to scrape and persist yourself — there's no public Grafana yet.

## Logs vs metrics — what to send where

| | Logs | Metrics |
|---|---|---|
| Single events ("agent X crashed", "search Y returned 0") | ✅ | ❌ |
| Aggregates over time (request rate, latency p99, queue depth) | ❌ | ✅ |
| Debugging individual requests | ✅ | ❌ |
| Alerting | ❌ | ✅ |
| Capacity planning | ❌ | ✅ |
| Forensics ("what happened at 14:23 yesterday?") | ✅ | ✅ (sampled) |

## See also

- **[Run a Registry Node](./run-registry-node)** — `[metrics]` config block.
- **[Troubleshooting](../troubleshooting/)** — when something fails on your hosted agent.
- **[Troubleshooting](../troubleshooting/)** — by-symptom recovery playbooks.
