---
title: API Routes
description: Every Next.js route handler under src/app/api.
---

# API Routes

The dashboard exposes its own HTTP API under `/api/...` (Next.js App Router route handlers). Some routes are pure proxies that sign payloads with the developer's key before forwarding to `zns01.zynd.ai`; others read or write the local Postgres directly via Prisma.

All routes assume a Supabase session unless marked otherwise.

## `/api/developer/*`

### `POST /api/developer/register`

First-run flow. Generates an Ed25519 keypair, encrypts the private key, inserts a `developer_keys` row, and registers the developer on the upstream registry via webhook.

**Body:**

```json
{
  "username": "alice",
  "name": "Alice",
  "role": "developer",
  "country": "US"
}
```

**Server-side:**

1. `getUser()` from Supabase.
2. `nacl.sign.keyPair()` → Ed25519 keypair.
3. `encryptPrivateKey(privateKey)` — AES-256-GCM with `PKI_ENCRYPTION_KEY`.
4. `prisma.developerKey.create()`.
5. `POST ${AGENTDNS_REGISTRY_URL}/v1/admin/developers/approve` with `Authorization: Bearer ${AGENTDNS_WEBHOOK_SECRET}`.

**Response:**

```json
{ "developer_id": "zns:dev:...", "public_key": "ed25519:...", "handle": "alice" }
```

### `GET /api/developer/keys`

Returns the developer's public identity. Never includes the encrypted blob.

```json
{
  "developer_id": "zns:dev:...",
  "public_key": "ed25519:...",
  "handle": "alice",
  "name": "Alice",
  "role": "developer",
  "created_at": "2026-04-12T..."
}
```

### `GET /api/developer/username-check?username=alice`

Debounced from `/onboard`. Proxies `GET /v1/handles/alice/available` on the registry.

```json
{ "available": true }
```

## `/api/entities/*`

### `GET /api/entities/sync`

Pulls all entities owned by the current developer from the registry and upserts them into the local `entities` table.

1. Lookup `developer_keys` row for `user_id`.
2. `GET /v1/developers/{developer_id}/entities` on the registry.
3. Upsert each into Prisma `entities` (matched on `entity_id`).
4. Mark missing rows as `status = "deregistered"`.

Returns the synced list. Called on `/dashboard/entities` mount and after every mutation.

### `GET /api/entities/{id}`

Returns a single Prisma `entities` row + the live registry record + (optionally) the live Agent Card.

### `PUT /api/entities/{id}`

Edits an entity. Updates Prisma, signs `PUT /v1/entities/{registryId}` on the registry, and re-syncs.

### `DELETE /api/entities/{id}`

Deregisters. Signs `DELETE /v1/entities/{registryId}` on the registry. Marks the local row `status = "deregistered"` (does not delete — keeps history).

## `/api/zns/*`

### `GET /api/zns/names`

Returns ZNS bindings for the current developer's handle. Proxies `GET /v1/handles/{handle}/entities` and groups by name.

### `POST /api/zns/resolve`

```json
{ "fqan": "zns01.zynd.ai/alice/stock-analyzer" }
```

Returns the resolved record. Proxies `GET /v1/resolve/alice/stock-analyzer`.

## `/api/registry/*`

Public, unauthenticated endpoints used by the `/registry` browser page. They exist as Next.js routes (instead of calling `zns01.zynd.ai` directly from the browser) so the dashboard can add caching, analytics, or fall-back to a different registry without redeploying the client.

| Route | Proxies |
|-------|---------|
| `GET /api/registry/search` | `POST /v1/search` |
| `GET /api/registry/entities` | `GET /v1/entities` (paginated) |
| `GET /api/registry/categories` | `GET /v1/categories` |
| `GET /api/registry/network` | `GET /v1/network/status` |

All four pass through query params unchanged.

## `/api/onboard/approve`

Webhook endpoint hit by the upstream registry when running in `restricted` onboarding mode. Validates `Authorization: Bearer ${AGENTDNS_WEBHOOK_SECRET}`, then approves or rejects the pending developer based on the request body.

```json
{ "developer_id": "zns:dev:...", "decision": "approve" }
```

In `open` mode this route is unused.

## `/api/admin/*`

### `GET /api/admin/users`

Admin-only. Returns paginated `developer_keys` rows for the admin console. Auth check: the user's `role` field on `developer_keys` must equal `"admin"`.

## `/api/subscribe`

### `POST /api/subscribe`

Newsletter signup. Public, no auth. Inserts into `subscribers` (or no-ops on duplicate email).

```json
{ "email": "alice@example.com" }
```

## Conventions

- **Errors** — every handler returns `{ "error": "code", "message": "human" }` with an appropriate HTTP status.
- **Logging** — `console.error` for server-side failures; the request ID propagates from `middleware.ts` for grep-ability.
- **Rate limits** — none in-process; rely on the deployment platform (Vercel / Cloudflare) or upstream registry rate limits.

## Next

- **[Data Model](/dashboard-app/data-model)** — what these routes read and write.
- **[Self-Host](/dashboard-app/self-host)** — env vars, in particular `AGENTDNS_WEBHOOK_SECRET` and `PKI_ENCRYPTION_KEY`.
