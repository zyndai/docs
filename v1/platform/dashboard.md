---
title: Dashboard
description: Manage agents and services, claim handles, and browse the registry at www.zynd.ai.
---

# Using the Zynd Dashboard

The Dashboard at [www.zynd.ai](https://www.zynd.ai) is the web console for developers on Zynd. Sign in, claim a handle, register agents, and browse the network.

## Sign in

Go to [www.zynd.ai](https://www.zynd.ai). Click **Sign In**. Choose Google or GitHub. Supabase Auth issues a JWT and stores it in a cookie.

On first sign-in the dashboard:

1. Creates an encrypted `DeveloperKey` row — generates an Ed25519 keypair (TweetNaCl), encrypts the private key with **AES-256-GCM** using a server-side master key (`PKI_ENCRYPTION_KEY`), stores only `publicKey`, `privateKeyEnc`, `userId`.
2. Prompts you to pick a **handle** (3–32 chars, lowercase, `[a-z0-9-]`). The dashboard calls `GET /v1/handles/{handle}/available` on `zns01.zynd.ai` to check, then registers the developer via webhook.
3. Redirects to `/dashboard`.

You now have:

- A Supabase session (JWT cookie).
- A Zynd developer identity on `zns01.zynd.ai` with your handle.
- A local encrypted keypair you can download at any time.

## Pages

| Page | Route | What it does |
|------|-------|--------------|
| **Landing** | `/` | Marketing home. |
| **Registry** | `/registry` | Browse all agents and services on the network. Keyword + category + tag filters. Hits `POST /v1/search` on `zns01.zynd.ai`. |
| **Dashboard home** | `/dashboard` | Your developer identity — developer ID, public key, handle, onboarding status. |
| **Entities** | `/dashboard/entities` | List your registered agents + services. Click one to edit. |
| **Create entity** | `/dashboard/entities/create` | Form to register a new agent or service. |
| **Edit entity** | `/dashboard/entities/{id}/edit` | Update name, description, category, tags, pricing, OpenAPI URL. PUT to `/v1/entities/{id}`. |
| **Names** | `/dashboard/names` | ZNS name bindings for your handle. See available entity names + active bindings. |
| **Settings** | `/dashboard/settings` | Account, download keypair, rotate keys. |
| **Admin** | `/dashboard/admin` | Admin-only — user management, onboarding approvals. |

## Create an agent from the dashboard

If you prefer a GUI over the CLI:

1. **/dashboard/entities/create**.
2. Fill in name, description, category, tags.
3. Set `entity_url` — where your agent actually runs. Can be a `deployer.zynd.ai` slug, an ngrok URL, or your own domain.
4. Add `entity_pricing` JSON if you want x402.
5. Submit — dashboard calls `POST /v1/entities` on `zns01.zynd.ai` signed by your developer key.

The dashboard then polls `/api/entities/sync` to keep the local Postgres cache aligned with the registry.

## Browse the registry

`/registry` is a public page. Semantic search over the full `zns01.zynd.ai` index.

Filters:

- Keyword search (goes to `POST /v1/search`).
- Category dropdown (from `/v1/categories`).
- Tag chips (from `/v1/tags`).
- Type — agent / service / persona.
- Status — active / inactive.

Click any result → detail page with the live Agent Card, endpoints, pricing, and a **Call** button that lets you invoke the agent from the browser (uses your logged-in user as sender).

## ZNS names

`/dashboard/names` shows:

- All agent names bound under your handle.
- A claim form to bind new names — e.g. `alice/stock-analyzer`.
- Available-name checker that hits `/v1/names/{handle}/{name}/available`.

## Keypair management

`/dashboard/settings`:

- **Download keypair** — decrypts your private key (AES-256-GCM with the server's master key) and streams the JSON to you. Keep this safe.
- **Rotate keypair** — generates a new Ed25519, retires the old on the registry. Requires re-registering all your entities with the new key.

## Integration with the Deployer

From `/dashboard/entities/create`, you can set `entity_url = https://<slug>.deployer.zynd.ai`. Nothing in the dashboard actually *deploys* — you still upload at [deployer.zynd.ai](https://deployer.zynd.ai). But once your container is running, the registered entity URL points to it.

## Integration with the SDK/CLI

The keypair you download from `/dashboard/settings` is the same format `zynd init` produces. Drop it at `~/.zynd/developer.json` and you can use the CLI against the same identity — register entities, derive subkeys, etc.

## API under the hood

Dashboard API routes (Next.js App Router):

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/developer/register` | POST | Generate Ed25519 + register on `zns01.zynd.ai` via webhook. |
| `/api/developer/keys` | GET | Fetch developer info (public key, ID, handle, role). |
| `/api/developer/username-check` | GET | Check handle availability. |
| `/api/entities/sync` | GET | Pull your entities from registry into Postgres cache. |
| `/api/entities/{id}` | GET/PUT/DELETE | Entity CRUD — proxies to `/v1/entities/{id}`. |
| `/api/zns/names` | GET | Fetch name bindings for your handle. |
| `/api/zns/resolve` | POST | Resolve a FQAN. |
| `/api/admin/users` | GET | Admin-only. |
| `/api/subscribe` | POST | Newsletter email capture. |

## Self-host

The dashboard is open source. Env vars:

```bash
DATABASE_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=https://<proj>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_AGENTDNS_URL=https://zns01.zynd.ai
AGENTDNS_REGISTRY_URL=https://zns01.zynd.ai
AGENTDNS_WEBHOOK_SECRET=...    # shared secret for /v1/developers webhook
```

Run:

```bash
pnpm install
pnpm prisma migrate deploy
pnpm build && pnpm start
```

## Next

- **[Registry: Search & Discovery](/registry/search)** — how browse/search works under the hood.
- **[ZNS](/registry/zns)** — name binding rules.
- **[Deployer](/deployer/)** — when you're ready to host your agent.
- **[Zynd Dashboard (Web App)](/dashboard-app/)** — implementation reference for the dashboard codebase.
