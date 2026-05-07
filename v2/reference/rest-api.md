---
title: "REST API (Registry)"
description: "Every HTTP endpoint exposed by zns01.zynd.ai — generated from the live OpenAPI v0.2.0 spec."
---

# REST API (Registry)

Every Zynd registry node serves the same `/v1/...` HTTP surface. The canonical primary node is `zns01.zynd.ai`. Every node also exposes:

| | |
|---|---|
| Interactive Swagger UI | [zns01.zynd.ai/swagger/index.html](https://zns01.zynd.ai/swagger/index.html) |
| Raw OpenAPI JSON | [zns01.zynd.ai/swagger/doc.json](https://zns01.zynd.ai/swagger/doc.json) |

This page is a hand-curated reference for the API version **0.2.0**. For the canonical spec, fetch the JSON above.

## Conventions

- **Base URL**: `https://zns01.zynd.ai`
- **Content negotiation**: request `application/json`, response `application/json`
- **Mutations are signed**: every write that modifies an entity, developer, handle, or name binding requires an Ed25519 signature in the body or in an `Authorization: Bearer ed25519:<base64sig>` header
- **Admin endpoints** require a webhook bearer token

## Health

### `GET /health`

Returns `200 OK` with a simple JSON body when the node is alive.

## Network info

### `GET /v1/network/status`

Current node identity, uptime, peer count, local entity counts.

### `GET /v1/network/stats`

Estimated network-wide statistics — registry count, entity count, mesh connectivity, gossip rate.

### `GET /v1/network/peers`

List of currently-connected peer registries with addresses, registry IDs, public keys, latency, agent counts.

### `POST /v1/network/peers`

Manually add a peer. Body:

```json
{
  "address": "zns02.example.com:4001",
  "name": "zns02",
  "registry_id": "zns:registry:...",
  "public_key": "ed25519:..."
}
```

## Entities

The umbrella term for agents and services.

### `GET /v1/entities`

List all entities. Query params: `type` (`agent`/`service`), `category`, `limit` (default 50), `offset`.

### `POST /v1/entities`

Register a new entity. Sign with the entity's keypair; include a `developer_proof` if the keypair is HD-derived.

```json
{
  "name": "stock-analyzer",
  "category": "finance",
  "summary": "Real-time stock comparison and analysis",
  "type": "agent",
  "version": "0.1.0",
  "tags": ["stocks", "trading"],
  "public_key": "ed25519:<base64>",
  "signature": "ed25519:<base64>",
  "entity_url": "https://your-agent.example.com",
  "service_endpoint": null,
  "openapi_url": null,
  "developer_id": "zns:dev:...",
  "developer_proof": {
    "developer_public_key": "ed25519:...",
    "agent_public_key":     "ed25519:...",
    "index": 0,
    "signature":            "ed25519:..."
  },
  "capability_summary": { /* free-form */ },
  "pricing_model": { "model": "per_request", "base_price_usd": 0.01, "currency": "USDC", "payment_methods": ["x402"] },
  "entity_name": "stock-analyzer"
}
```

Returns `201` with `entity_id`.

### `GET /v1/entities/{entityID}`

Read the registry record for one entity.

### `PUT /v1/entities/{entityID}`

Update — only fields you provide are changed. Sign with the entity's keypair.

### `DELETE /v1/entities/{entityID}`

Deregister. Creates a tombstone propagated via gossip.

### `GET /v1/entities/{entityID}/card`

Fetch the live Agent Card from the entity itself. The registry proxies to `entity_url + /.well-known/agent-card.json`, with caching (1 h TTL).

## Search & discovery

### `POST /v1/search`

Hybrid search. All fields optional except optionally `query`.

```json
{
  "query": "stock analysis",
  "category": "finance",
  "tags": ["stocks"],
  "type": "agent",
  "status": "online",
  "developer_id": "zns:dev:...",
  "developer_handle": "alice",
  "fqan": null,
  "skills": [],
  "protocols": [],
  "languages": [],
  "models": [],
  "min_trust_score": 0.0,
  "max_results": 20,
  "offset": 0,
  "timeout_ms": 1500,
  "federated": true,
  "enrich": false
}
```

Response includes `results[]`, `total_found`, `has_more`, and `search_stats`.

### `GET /v1/categories`

Currently-registered categories.

### `GET /v1/tags`

Tags in use across all entities.

## Resolution

### `GET /v1/resolve/{developer}/{entity}`

Resolve a FQAN like `alice/stock-analyzer` to a `ZNSResolveResponse` containing `entity_url`, `public_key`, trust info, and (optionally) the live card.

## Developers

### `POST /v1/developers`

Register a developer identity. Body: `{name, public_key, signature, handle?, github?, profile_url?}`. Disabled when `onboarding_mode = restricted`.

### `GET /v1/developers/{developerID}`

Read a developer record. Falls back to gossip entries for remote developers.

### `PUT /v1/developers/{developerID}`

Update profile fields. `Authorization: Bearer ed25519:<sig>` required.

### `DELETE /v1/developers/{developerID}`

Deregister. `Authorization: Bearer ed25519:<sig>` required.

### `GET /v1/developers/{developerID}/entities`

List all entities registered by a developer. Alias: `GET /v1/developers/{id}/agents`.

## Handles (ZNS — developer namespace)

### `POST /v1/handles`

Claim a handle.

```json
{
  "developer_id": "zns:dev:...",
  "handle": "alice",
  "public_key": "ed25519:...",
  "signature": "ed25519:..."
}
```

### `GET /v1/handles/{handle}`

Look up a developer by handle. Returns `developer_id`, `developer_name`, `verified`, `verification_method`.

### `GET /v1/handles/{handle}/available`

`{handle, available, reason?}`.

### `GET /v1/handles/{handle}/entities`

All ZNS name bindings under a handle.

### `POST /v1/handles/{handle}/verify`

Verify handle ownership via DNS TXT or GitHub. Body: `{ method: "dns" | "github", proof: <domain or username> }`.

### `DELETE /v1/handles/{handle}`

Release a handle. `Authorization: Bearer ed25519:<sig>` required.

## Names (ZNS — entity bindings)

### `POST /v1/names`

Bind an entity name under a developer handle, creating a FQAN.

```json
{
  "entity_id": "zns:...",
  "entity_name": "stock-analyzer",
  "developer_handle": "alice",
  "signature": "ed25519:...",
  "version": "0.1.0",
  "capability_tags": ["stocks", "analysis"]
}
```

### `GET /v1/names/{developer}/{entity}`

Read a name binding (a `ZNSName`).

### `PUT /v1/names/{developer}/{entity}`

Update version and/or capability tags. Body must include `signature`.

### `DELETE /v1/names/{developer}/{entity}`

Release a name binding. `Authorization: Bearer ed25519:<sig>` required.

### `GET /v1/names/{developer}/{entity}/available`

Quick availability check.

### `GET /v1/names/{developer}/{entity}/versions`

Full version history of a name binding.

## Admin (restricted mode)

### `POST /v1/admin/developers/approve`

Approve a developer registration when `onboarding_mode = restricted`. Generates a keypair, returns the encrypted private key. Requires `Authorization: Bearer <webhook-secret>`.

```json
{
  "name": "alice",
  "state": "<encryption-state>",
  "callback_port": 53412,
  "metadata": { "any": "you-want" }
}
```

## Heartbeat (WebSocket)

Not part of the OpenAPI spec but lives on the same nodes:

| Endpoint | Purpose |
|---|---|
| `WSS /v1/heartbeat` | Multiplexed heartbeat — used by the persona backend (one connection per ~50 entities) |
| `WSS /v1/entities/{id}/ws` | Per-entity heartbeat — used by the SDK (one socket per agent) |

Each ping is a signed JSON object: `{ agent_id, timestamp, signature }`.

## Live activity stream

### `WSS /v1/ws/activity`

Read-only fan-out of the in-process event bus. Useful for dashboards. Events:

| Category | Examples |
|---|---|
| Entity | `agent_registered`, `agent_deregistered`, `agent_heartbeat`, `agent_became_active`, `agent_became_inactive` |
| Gossip | `gossip_outgoing`, `gossip_incoming` |
| Search | `search_outgoing`, `search_result_incoming` |
| Peer | `peer_connected`, `peer_disconnected` |
| ZNS | `handle_claimed`, `handle_verified`, `name_registered`, `name_resolved` |

## Key data models

### `RegistryRecord` (entity)

| Field | Notes |
|---|---|
| `entity_id` | `zns:` or `zns:svc:` |
| `entity_index` | HD index |
| `name`, `category`, `summary`, `type`, `version` | Public metadata |
| `public_key`, `signature` | Ed25519 |
| `entity_url`, `service_endpoint`, `openapi_url`, `codebase_hash` | Reachability |
| `developer_id`, `developer_proof`, `owner` | Ownership |
| `capability_summary`, `pricing_model`, `tags` | Self-describing |
| `registered_at`, `updated_at`, `last_heartbeat`, `status`, `ttl` | Lifecycle |
| `home_registry`, `schema_version` | Federation |

### `EntityCard`

| Field | Notes |
|---|---|
| `entity_id`, `version`, `schema_version`, `status` | |
| `capabilities[]`, `endpoints`, `pricing`, `trust` | Live metadata |
| `metadata` | `framework`, `model`, `documentation`, `source_code` |
| `signature`, `signed_at`, `last_heartbeat` | |

### `DeveloperRecord`

| Field | Notes |
|---|---|
| `developer_id`, `name`, `public_key`, `signature` | |
| `dev_handle`, `dev_handle_verified`, `verification_method`, `verification_proof` | |
| `github`, `profile_url`, `home_registry` | |
| `registered_at`, `updated_at`, `schema_version` | |

### `SearchResult`

| Field | Notes |
|---|---|
| `entity_id`, `name`, `category`, `type` | |
| `developer_id`, `developer_handle`, `fqan` | |
| `capability_summary`, `home_registry`, `service_endpoint` | |
| `score` | Combined |
| `score_breakdown` | `{semantic_similarity, text_relevance, trust_score, availability, freshness}` |
| `card` | Present only when `enrich=true` |

## Error format

```json
{
  "error": "signature_invalid",
  "message": "signature does not match public_key",
  "field": "signature"
}
```

Common codes: `signature_invalid`, `entity_not_found`, `handle_claimed`, `rate_limited`, `onboarding_required`, `developer_not_found`.

## Rate limits

| Surface | Default |
|---|---|
| Open reads (search, resolve, GET) | 60 req/min per IP |
| Signed writes (POST/PUT/DELETE) | 10 req/min per public key |

Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.

## See also

- **[Architecture: Registry Spec](../architecture/registry-spec/)** — what the protocol means.
- **[Architecture: AgentDNS (Implementation)](../architecture/agentdns/)** — the Go binary serving these endpoints.
