---
title: Agent Cards & Caching
description: How agentdns fetches live agent metadata and the two-tier cache that makes it fast.
---

# Agent Cards & Caching

**Source:** `internal/card/`, `internal/cache/`, `internal/models/agent_card.go`, `internal/models/zynd_agent_card.go`

The registry stores a small static record per agent (~500–1200 bytes). The richer metadata — current capabilities, pricing, endpoints, online status — lives at the agent's own URL as an **Agent Card**. The card fetcher and its cache are what make `enrich: true` searches feasible.

## Registry record vs Agent Card

| Aspect | Registry Record | Agent Card |
|--------|-----------------|------------|
| Stored at | The registry (PostgreSQL) | The agent's own URL |
| Size | ~500–1200 bytes | 2–10 KB |
| Updates | Re-registration required | Agent updates at will |
| Contains | Name, category, tags, public key, URL | Capabilities, pricing, endpoints, trust metrics, status |
| Propagation | Gossip mesh | Fetched on demand |

The split keeps gossip tiny (the mesh is gossiping records, never cards) while letting agents push live state changes immediately.

## Card structure

```json
{
  "agent_id": "agdns:7f3a9c2e...",
  "version": "2.4.1",
  "status": "online",
  "capabilities": [{
    "name": "code-review",
    "protocols": ["a2a", "mcp", "jsonrpc"],
    "languages": ["python", "go"],
    "latency_p95_ms": 3000
  }],
  "pricing": {
    "model": "per-request",
    "currency": "USD",
    "rates": { "code-review": 0.01 },
    "payment_methods": ["x402", "stripe"]
  },
  "endpoints": {
    "invoke": "https://agent.example.com/v1/invoke",
    "health": "https://agent.example.com/health",
    "websocket": "wss://agent.example.com/ws"
  }
}
```

## Zynd Agent Card (extended format)

The `ZyndAgentCard` is a modular format served at `/.well-known/zynd-agent.json` with protocol-specific sections:

- **Zynd section** — identity (FQAN, agent ID, developer, public key, home registry).
- **Agent section** — protocol-neutral metadata (name, description, capabilities).
- **Endpoints section** — invoke / health / WebSocket URLs.
- **Protocols section** — protocol-specific blocks:
  - **A2A** — card URL, skills list.
  - **MCP** — transport type, endpoint, tool definitions.
  - **REST** — OpenAPI URL, invoke endpoints.
- **Trust section** — trust score, verification tier, ZTP count.

## Fetcher

`internal/card/fetcher.go` resolves an agent's card URL with fallback:

1. If the URL ends in `.json` or contains `.well-known`, use it as-is.
2. Otherwise try `{url}/.well-known/zynd-agent.json`.
3. Fall back to `{url}/.well-known/agent.json`.

The fetcher honors HTTP caching headers but tops out at the configured `agent_card_ttl_seconds` regardless.

## Two-tier cache

```
Request for Agent Card
    │
    ├─► Tier 1: In-process LRU cache (O(1), per-instance)
    │   Hit? Return immediately.
    │
    ├─► Tier 2: Redis cache (shared across instances)
    │   Hit? Return, populate Tier 1.
    │
    └─► Tier 3: HTTP fetch from agent URL
        Populate both Tier 1 and Tier 2.
```

### Tier 1 — LRU (`internal/card/cache.go`)

- Thread-safe doubly-linked list with a hashmap.
- Configurable max size (default 50,000) and TTL (default 1 hour).
- Lazy expiration on access — no background sweep.
- O(1) `get` / `put` / `remove`.

### Tier 2 — Redis (`internal/cache/redis.go`)

- Optional. If `[redis].url` is empty, the cache layer is `nil` and Tier 1 falls through to Tier 3.
- Connection pool: 20 connections, 3 min idle.
- Fail-open on errors — Redis hiccups never break search.
- Keys are prefixed (default `agdns:`) so multiple registries can share a Redis instance.

## Redis key patterns

| Pattern | Purpose | TTL |
|---------|---------|-----|
| `agdns:card:{agent_id}` | Agent card cache | `agent_card_ttl_seconds` |
| `agdns:search:{hash}` | Search result cache | configurable |
| `agdns:bloom:{registry_id}` | Peer bloom filter | configurable |
| `agdns:rate:{bucket}:{ip}` | Rate-limit counter | 1 minute |
| `agdns:peer:{registry_id}` | Peer heartbeat | configurable |

The rate-limit keys are why the registry tolerates running without Redis — when the cache is unavailable, the rate limiter falls back to in-memory token buckets that just don't survive process restarts.

## Heartbeat & liveness

**Source:** `internal/api/heartbeat.go`, `internal/api/monitor.go`

Agents prove they're still alive by maintaining a WebSocket and sending signed heartbeat messages. This isn't part of the card system, but it's what flips the `status` field that ranking uses.

```
Agent → GET /v1/entities/{id}/ws  (WebSocket upgrade)
Agent → { "timestamp": "2026-03-28T...", "signature": "ed25519:..." }
        │
        ▼
Server verifies:
  1. Timestamp within clock_skew window (default 60s)
  2. Ed25519 signature over timestamp bytes
        │
        ▼
On first valid signature:
  - Mark agent active
  - Gossip status to peers
        │
        ▼
On every valid signature:
  - Update last_heartbeat in PostgreSQL
  - Publish EventEntityHeartbeat to the event bus
```

A background sweep runs every 60 s and marks `active` agents `inactive` if they haven't heartbeat in `inactive_threshold` (default 300 s). Each transition becomes an `agent_status` gossip announcement.

## Next

- **[CLI Reference](/agentdns/cli)** — every `agentdns` command.
- **[Configuration](/agentdns/configuration)** — TOML keys for the cache, TTLs, Redis URL.
