---
title: API Routes
description: Next.js route handlers under src/app/api and the public v1 OpenAPI surface.
---

# API Routes

The Deployer's Next.js web service exposes two distinct API surfaces:

1. **Internal routes** — used by the dashboard. Multipart uploads, dashboard stats, the SSE log stream, and the Caddy on-demand-TLS hook.
2. **Public v1** — `/api/v1/agents/*` with a published OpenAPI spec at `/api/v1/openapi.json`. Stable across releases.

There's no auth on either surface — uploads are open and your keypair *is* your identity. Self-hosters can put basic-auth in front of `/deploy` via Caddy if they want to lock things down.

## Internal routes

### `POST /api/deployments` — upload

Multipart form:

| Field | Required | Notes |
|-------|----------|-------|
| `archive` | yes | `.zip` of the project. Max 50 MB. Validated by `lib/validator.ts`. |
| `keypair` | yes | `keypair.json` — Ed25519 in the same format `zynd init` produces. |
| `name` | yes | Human-readable; slugified for the public URL. |
| `entityType` | no | `"agent"` (default) or `"service"`. |

Server-side:

1. `validator.ts` rejects: zips containing `developer.json`, absolute path entries, files > 50 MB, or > 100 files.
2. `detect.ts` decides Python vs Node from the manifest files in the archive.
3. `slug.ts` produces `slugify(name) + "-" + 6_char_suffix`.
4. `crypto.encryptToFile()` writes the zip and the keypair age-encrypted under `${DEPLOYER_DATA_ROOT}/blobs/<id>.zip.age` and `keys/<id>/keypair.json.age`.
5. `Deployment` row inserted with `status="queued"`.

Response:

```json
{ "id": "ckxx...", "slug": "stock-analyzer-3z9q1k", "status": "queued" }
```

### `GET /api/deployments`

Paginated list of deployments — query params: `status`, `runtime`, `page`, `pageSize`.

Returns deployments newest-first with `id`, `name`, `slug`, `status`, `entityType`, `runtime`, `hostUrl`, timestamps.

### `GET /api/deployments/[id]`

Full deployment record — same shape as the row plus `lastSystemLogs` (last 50 system-stream entries for the timeline view).

### `DELETE /api/deployments/[id]`

Marks the row `status="stopped"`. The reconcile-stops loop in the worker picks it up and tears down the container, route, and port.

### `GET /api/deployments/[id]/logs`

Server-Sent Events stream of stdout / stderr / system lines.

Query params:

- `stream=stdout|stderr|system|all` (default `all`)
- `since=<lineNo>` to resume from a specific line
- `tail=<n>` to start with the last N lines (default 200)

Each event is a JSON object: `{ ts, lineNo, stream, text }`. WebSocket clients should connect to the worker's `wsLogs` server instead — same payload, lower latency.

### `GET /api/stats`

Dashboard stats — counts by status, runtime, and `entityType`, plus 24-hour deployment volume. Used by `components/DashboardStats.tsx`.

### `GET /api/caddy/ask`

Caddy on-demand TLS hook. Caddy calls this with `?domain=<slug>.deployer.<wildcard>` before issuing a new cert. Returns:

- `200` if a `Deployment` with that slug exists and is `running`.
- `404` otherwise — Caddy refuses to issue a cert for unknown subdomains, which prevents subdomain takeover and excessive cert issuance from random scanner traffic.

This is the single most security-critical endpoint in the deployer.

## Public v1

### `GET /api/v1/openapi.json`

OpenAPI 3.1 spec for everything under `/api/v1/`. Imported by SDK generators.

### `GET /api/v1/agents/[entityId]`

Resolves a deployment by its **registry entity ID** (the `zns:...` value populated after first successful start), not by the internal cuid.

Returns:

```json
{
  "entityId": "zns:7f3a9c2e...",
  "slug": "stock-analyzer-3z9q1k",
  "name": "Stock Analyzer",
  "hostUrl": "https://stock-analyzer-3z9q1k.deployer.zynd.ai",
  "status": "running",
  "publicKeyB64": "ed25519:...",
  "runtime": "python",
  "createdAt": "..."
}
```

This is the canonical way to look up a deployer-hosted agent from the registry's `agent_url` if you only have the `agent_id` — the registry's `agent_url` field points here.

The endpoint is intentionally read-only. Mutations stay inside the dashboard.

## Conventions

- **Errors** — `{ "error": "code", "message": "human" }` with appropriate HTTP status.
- **Streaming** — SSE for logs (`/api/deployments/[id]/logs`); WebSocket for low-latency dashboard streams (separate port from `wsLogs.ts`).
- **Encoding** — JSON in, JSON out, except multipart upload.
- **CORS** — disabled by default. Self-hosters can flip it on in `next.config.ts` if they want third-party clients to call `/api/v1/agents/[entityId]` from a browser.

## What's missing on purpose

- No "redeploy" endpoint — re-upload instead. Deployments are immutable; treating them as immutable means no half-rolled-out states.
- No "edit" endpoint — same reason.
- No log purge endpoint — retention does that on a schedule.
- No webhook delivery — listen to the registry's `/v1/ws/activity` event stream for `agent_*` events on your deployment if you need push notifications.

## Next

- **[Worker Subsystems](/deployer-app/worker)** — what consumes the rows the upload route inserts.
- **[Data Model](/deployer-app/data-model)** — schemas these routes read and write.
