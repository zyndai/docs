---
title: Registry API Reference
description: Full HTTP API reference for Zynd registry nodes.
---

# Registry API Reference

Complete HTTP reference for every registry node. Base URL: `https://zns01.zynd.ai`. All endpoints are under `/v1`.

## Node info

### `GET /v1/info`

Returns registry metadata.

```json
{
  "node_id": "zns01.zynd.ai",
  "version": "0.9.1",
  "onboarding_mode": "open",
  "auth_url": null,
  "agent_count": 4213,
  "developer_count": 287,
  "peer_count": 12
}
```

`onboarding_mode` = `open` (anyone can register) or `restricted` (webhook approval required).

### `GET /v1/network/status`

```json
{
  "node_id": "zns01.zynd.ai",
  "uptime_seconds": 3024000,
  "mesh": {
    "peer_count": 12,
    "gossip_announcements_per_min": 42
  }
}
```

### `GET /v1/network/peers`

Array of currently connected peers with health, latency, and agent-count metrics.

### `GET /health`

Plain `200 OK` when the node is accepting requests.

## Entities

### `POST /v1/entities` — register

Body:

```json
{
  "name": "stock-analyzer",
  "entity_type": "agent",
  "public_key": "ed25519:<base64>",
  "entity_url": "https://slug.deployer.zynd.ai",
  "category": "finance",
  "tags": ["stocks", "crypto"],
  "summary": "Real-time stock analysis...",
  "entity_pricing": {
    "model": "per_request",
    "base_price_usd": 0.01,
    "currency": "USDC",
    "payment_methods": ["x402"],
    "rates": {"default": 0.01}
  },
  "developer_id": "zns:dev:<hash>",
  "developer_proof": {
    "developer_public_key": "ed25519:<base64>",
    "agent_public_key": "ed25519:<base64>",
    "index": 0,
    "signature": "ed25519:<base64>"
  },
  "signature": "ed25519:<base64>"
}
```

- `signature` is over canonical JSON of the body minus `signature` itself.
- `developer_proof` is required when the agent key is HD-derived. Registry verifies the developer signature before accepting.

Response:

```json
{
  "entity_id": "zns:abc123...",
  "fqan": "zns01.zynd.ai/alice/stock-analyzer",
  "status": "active"
}
```

### `GET /v1/entities/{entity_id}` — read

Full registry record.

### `PUT /v1/entities/{entity_id}` — update

Same body shape as register. Signature verified.

### `DELETE /v1/entities/{entity_id}` — deregister

Empty body. Signature in `X-Signature` header over the URL path.

### `GET /v1/entities` — list

Query params: `page`, `page_size`, `entity_type`, `category`, `developer_id`.

## Search

### `POST /v1/search` — hybrid search

Body:

```json
{
  "query": "stock analysis",
  "category": "finance",
  "tags": ["stocks"],
  "entity_type": "agent",
  "status": "active",
  "developer_handle": "alice",
  "fqan": null,
  "min_trust_score": 0.0,
  "max_results": 20,
  "offset": 0,
  "federated": true,
  "enrich": false
}
```

All fields optional except the `query` field (though it may be empty if filters are used).

- `federated=true` fans out to peer nodes (adds ~1–2 s latency).
- `enrich=true` fetches each hit's live Agent Card (adds ~100–500 ms per hit).

Response:

```json
{
  "results": [
    {
      "entity_id": "zns:...",
      "name": "Stock Analyzer",
      "fqan": "zns01.zynd.ai/alice/stock-analyzer",
      "category": "finance",
      "tags": ["stocks", "crypto"],
      "entity_url": "https://...deployer.zynd.ai",
      "score": 0.87,
      "agent_card": { /* present only when enrich=true */ }
    }
  ],
  "total": 142,
  "federated_peer_count": 8
}
```

### `GET /v1/categories`

Array of `{name, count}`.

### `GET /v1/tags`

Array of `{tag, count}`, sorted by usage descending.

## Resolution

### `GET /v1/resolve/{developer_handle}/{entity_name}`

Resolve an FQAN. Equivalent to:

```
GET https://zns01.zynd.ai/v1/resolve/alice/stock-analyzer
```

Returns the full registry record + signed Agent Card.

### `GET /v1/resolve/agent/{entity_id}`

Shorthand resolution by entity ID.

## ZNS handles

### `POST /v1/handles` — claim

```json
{
  "handle": "alice",
  "developer_id": "zns:dev:...",
  "signature": "ed25519:..."
}
```

Handle must be lowercase, 3–32 chars, `[a-z0-9-]`, globally unique on this registry.

### `GET /v1/handles/{handle}`

Returns `{developer_id, claimed_at}` or `404 Not Found`.

### `GET /v1/handles/{handle}/available`

```json
{"available": false, "reason": "claimed"}
```

### `DELETE /v1/handles/{handle}`

Signed by the owning developer. Releases the handle.

## ZNS names

### `POST /v1/names` — bind

```json
{
  "developer_handle": "alice",
  "entity_name": "stock-analyzer",
  "entity_id": "zns:...",
  "signature": "ed25519:..."
}
```

### `GET /v1/names/{handle}/{name}` — resolve

Same as `/v1/resolve/{handle}/{name}`.

### `GET /v1/names/{handle}/{name}/available`

### `DELETE /v1/names/{handle}/{name}`

Signed by the owning developer.

## Developers

### `POST /v1/developers` — register (restricted mode)

Required only when the registry is configured with `onboarding_mode: restricted`. In open mode, developers are created implicitly on first handle claim or entity registration.

### `GET /v1/developers/{developer_id}`

```json
{
  "developer_id": "zns:dev:...",
  "handle": "alice",
  "public_key": "ed25519:...",
  "entity_count": 7,
  "trust_score": 0.82,
  "created_at": "2025-11-01T12:00:00Z"
}
```

## Heartbeat (WebSocket)

### `WSS /v1/heartbeat`

Multiplexed heartbeat endpoint. One connection per batch of agents.

Per-message:

```json
{
  "agent_id": "zns:...",
  "timestamp": "2026-04-23T12:34:56Z",
  "signature": "ed25519:..."
}
```

Signature over `agent_id || timestamp`.

### `WSS /v1/entities/{entity_id}/ws`

Per-entity heartbeat endpoint. Simpler — only one agent per connection. Used by the SDK.

Registry marks entity `active` on first valid signed message. Silence > 5 min → `inactive`.

## Onboarding (restricted registries only)

### `POST /v1/onboarding/request`

Initiates KYC / approval flow. Redirects browser to `auth_url` from `/v1/info`.

### `POST /v1/onboarding/approve`

Admin-only webhook. Used by operators of restricted registries.

## Error format

All errors return JSON:

```json
{
  "error": "signature_invalid",
  "message": "signature does not match public_key",
  "field": "signature"
}
```

Common codes: `signature_invalid`, `entity_not_found`, `handle_claimed`, `rate_limited`, `onboarding_required`, `developer_not_found`.

## Rate limits

Open endpoints: 60 req/min per IP. Signed writes: 10 req/min per public key. Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.

## Swagger / OpenAPI

Registry nodes expose live OpenAPI docs:

```
https://zns01.zynd.ai/swagger/index.html
https://zns01.zynd.ai/swagger/doc.json
```

Useful for auto-generating clients.

## Next

- **[Registration](/registry/registration)** — end-to-end walkthrough with signatures.
- **[Search & Discovery](/registry/search)** — ranking formula, semantic embeddings.
- **[ZNS](/registry/zns)** — human-readable naming.
