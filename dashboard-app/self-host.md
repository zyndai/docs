---
title: Self-Host
description: Run your own copy of the Zynd dashboard.
---

# Self-Host

The dashboard is open source. You can run it against the public `zns01.zynd.ai` registry, your own private mesh, or a hybrid of both.

## Prerequisites

- Node.js 20+ and `pnpm`.
- PostgreSQL 14+ — can be the same Supabase instance you use for Auth or a separate one.
- A Supabase project (Auth only — the dashboard uses Prisma for data).
- Network reach to whatever registry you're pointing at (`zns01.zynd.ai`, your own AgentDNS node, etc.).

## 1. Clone & install

```bash
git clone https://github.com/zyndai/dashboard.git
cd dashboard
pnpm install
```

## 2. Environment variables

Copy `.env.example` and fill in:

```bash
# Database (Prisma)
DATABASE_URL=postgresql://user:pw@host:5432/dbname

# Supabase Auth
NEXT_PUBLIC_SUPABASE_URL=https://<proj>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# Registry
NEXT_PUBLIC_AGENTDNS_URL=https://zns01.zynd.ai
AGENTDNS_REGISTRY_URL=https://zns01.zynd.ai
AGENTDNS_WEBHOOK_SECRET=<shared-secret-with-registry>

# PKI — encrypts developer private keys at rest
PKI_ENCRYPTION_KEY=<64-char-hex>     # openssl rand -hex 32

# Optional
NEXT_PUBLIC_SITE_URL=https://your-dashboard.example.com
```

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Prisma connection. Pooled (PgBouncer) is fine. |
| `NEXT_PUBLIC_SUPABASE_*` | Browser-readable. OAuth flow + session cookies. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only. Used by Next.js route handlers to look up `auth.users`. |
| `NEXT_PUBLIC_AGENTDNS_URL` | Browser-readable registry URL — used by the public `/registry` browser. |
| `AGENTDNS_REGISTRY_URL` | Server-side registry URL — usually the same. Lets you point reads at a CDN and writes at the canonical node. |
| `AGENTDNS_WEBHOOK_SECRET` | Shared secret with the registry's `[onboarding].webhook_secret`. Required only when the registry runs in `restricted` onboarding mode. |
| `PKI_ENCRYPTION_KEY` | 32-byte AES-256-GCM master key. Generate once and **back it up** — losing it bricks every encrypted private key. |

## 3. Database setup

```bash
pnpm prisma migrate deploy
```

This creates the `developer_keys`, `entities`, and `subscribers` tables. If you're sharing a Postgres instance with Supabase, put these in a separate schema (`zynd_dashboard`) to avoid colliding with `auth.*`.

## 4. Supabase OAuth providers

In your Supabase dashboard, enable Google and/or GitHub as providers and set the callback URL to:

```
https://your-dashboard.example.com/auth/callback
```

(The path is hard-coded in `src/app/auth/callback/route.ts`.)

## 5. Build & run

```bash
pnpm build
pnpm start                 # production
# or
pnpm dev                   # local dev with HMR
```

The dashboard listens on port 3000 by default.

## 6. Reverse proxy / TLS

Standard Next.js — put nginx or Caddy in front for TLS termination, gzip, and HTTP/2:

```nginx
server {
  listen 443 ssl http2;
  server_name dashboard.example.com;

  ssl_certificate     /etc/letsencrypt/live/dashboard.example.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/dashboard.example.com/privkey.pem;

  location / {
    proxy_pass http://localhost:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

For Vercel deployments, none of this is needed — set the env vars in the project dashboard and push.

## 7. Pointing at your own registry

If you're running your own `agentdns` node (see [AgentDNS](/agentdns/)):

```bash
NEXT_PUBLIC_AGENTDNS_URL=https://my-registry.example.com
AGENTDNS_REGISTRY_URL=https://my-registry.example.com
```

If your registry runs in `restricted` onboarding mode, also set `AGENTDNS_WEBHOOK_SECRET` to match its `[onboarding].webhook_secret` and ensure the dashboard server can reach it from the network.

## 8. Admin access

The first admin has to be set manually (no UI for the bootstrap):

```sql
UPDATE developer_keys SET role = 'admin' WHERE username = 'your-handle';
```

After that, the admin can promote others through `/dashboard/admin`.

## 9. Backups

Back up:

- **Postgres** — `developer_keys`, `entities`, `subscribers` (and the Supabase `auth.*` schema if it lives in the same instance).
- **`PKI_ENCRYPTION_KEY`** — without this, every encrypted private key in `developer_keys.private_key_enc` is unrecoverable. Treat it like a wallet seed; store offline.

## 10. Health checks

There isn't a dedicated `/health` route — point your uptime monitor at `/api/registry/network`, which proxies the upstream registry's `/v1/network/status` and returns 200 only when both Next.js and the registry are reachable.

## Next

- **[Architecture](/dashboard-app/architecture)** — what each subsystem does at runtime.
- **[Data Model](/dashboard-app/data-model)** — schema, key encryption, migrations.
- **[AgentDNS — Configuration](/agentdns/configuration)** — if you're running a registry alongside the dashboard.
