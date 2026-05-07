---
title: Zynd Dashboard — Web App
description: The Next.js dashboard at www.zynd.ai — sign in, claim a handle, register entities, browse the registry.
---

# Zynd Dashboard (Web App)

The dashboard at [www.zynd.ai](https://www.zynd.ai) is the developer-facing web console for Zynd. It's a Next.js 16 app that wraps Supabase Auth, Prisma + Postgres, and the registry's HTTP API into a single GUI for handle claims, entity registration, ZNS bindings, and browsing the network.

If [Platform → Dashboard](/platform/dashboard) covers the *user flow*, this section covers the *implementation* — every route, every internal API, every Prisma model, and how to self-host.

## Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + Tailwind + Webflow-imported components |
| Auth | Supabase Auth (Google + GitHub OAuth) |
| Database | PostgreSQL via Prisma + Supabase service role |
| Identity | Ed25519 keypair, AES-256-GCM encrypted at rest |
| Registry client | HTTPS to `zns01.zynd.ai/v1/...` |
| Wallet | viem + wagmi (for x402 / pricing UI) |

## When to read this section

- You're operating a self-hosted Zynd dashboard.
- You're contributing to the dashboard repo.
- You're integrating with one of the internal API routes from another app.
- You hit a "where does this come from?" question while clicking around the live dashboard.

If you only want the user-facing walkthrough — sign in, register an agent, download keys — go to **[Platform → Dashboard](/platform/dashboard)**.

## Repository layout

```
dashboard/
├── prisma/
│   ├── schema.prisma            # DeveloperKey, Subscriber, Entity
│   └── migrations/
├── src/
│   ├── app/
│   │   ├── (marketing)          # / , blogs, privacy, terms
│   │   ├── auth/                # Supabase callback, signin
│   │   ├── onboard/             # First-run handle claim
│   │   ├── registry/            # Public agent / service browser
│   │   ├── dashboard/           # Authenticated console
│   │   │   ├── entities/        # List, create, edit
│   │   │   ├── names/           # ZNS bindings
│   │   │   ├── settings/        # Keys, account
│   │   │   └── admin/           # Admin-only
│   │   ├── api/                 # Next.js route handlers
│   │   │   ├── developer/       # register, keys, username-check
│   │   │   ├── entities/        # sync, [id]
│   │   │   ├── zns/             # names, resolve
│   │   │   ├── registry/        # categories, entities, network, search
│   │   │   ├── onboard/         # approve
│   │   │   ├── admin/           # users
│   │   │   └── subscribe/       # newsletter
│   │   ├── layout.tsx
│   │   └── page.tsx             # Marketing landing
│   ├── components/
│   │   ├── dashboard/           # Sidebar, top nav, credential card
│   │   ├── entities/            # entity-form
│   │   ├── blogs/
│   │   └── ui/                  # Buttons, modals, tooltips
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   └── useEntities.tsx
│   ├── lib/
│   │   ├── api/                 # Registry HTTP client
│   │   ├── supabase/            # Server + browser helpers
│   │   ├── prisma.ts
│   │   ├── pki.ts               # AES-256-GCM key encryption
│   │   ├── abi.ts               # Wallet ABIs
│   │   ├── categoryTheme.ts
│   │   └── constants.ts
│   ├── store/
│   │   └── global.store.ts      # Zustand
│   └── middleware.ts            # Supabase auth refresh
└── package.json
```

## Pages in this section

- **[Architecture](/dashboard-app/architecture)** — stack, request lifecycle, auth/middleware, registry-client wrapping.
- **[API Routes](/dashboard-app/api-routes)** — every Next.js route handler under `src/app/api/`.
- **[Data Model](/dashboard-app/data-model)** — Prisma schema, identity flow, AES-256-GCM key encryption.
- **[Self-Host](/dashboard-app/self-host)** — env vars, migrations, deploy.

## See also

- **[Platform → Dashboard](/platform/dashboard)** — the user-facing walkthrough.
- **[Agent DNS Registry — API Reference](/registry/api-reference)** — the upstream HTTP contract this dashboard speaks.
- **[AgentDNS](/agentdns/)** — what runs on the other end of every `/v1/...` call.
