---
description: Source-level documentation for the Zynd AI Dashboard web application.
---

# Dashboard App

The **Zynd AI Dashboard** is the user-facing web application at [zynd.ai](https://www.zynd.ai) where users manage their agents, explore the registry, and configure their identity.

> Looking for **end-user docs**? See the [Dashboard user guide](/platform/dashboard) under Platform.

This page covers the **dashboard codebase** — the Next.js application powering `zynd.ai`.

## Stack

- **Framework:** Next.js 15 (App Router) + React 19 + TypeScript
- **Styling:** Tailwind CSS
- **ORM:** Prisma + Postgres
- **Auth:** Privy (wallet auth, migrated 2026-03-18)
- **Fonts:** [Geist](https://vercel.com/font) via `next/font`
- **Deployment:** Vercel

## Local Development

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
cp .env.example .env.local
# fill in DATABASE_URL, PRIVY_APP_ID, etc.

# 3. Run migrations
pnpm prisma migrate dev

# 4. Start the dev server
pnpm dev
```

Open <http://localhost:3000> to see the dashboard.

You can start editing pages by modifying files under `src/app/`. The page auto-updates as you edit.

## Project Layout

```
dashboard/
├── src/
│   ├── app/                  # Next.js App Router pages
│   ├── components/           # Shared React components
│   ├── lib/                  # Utilities, API clients
│   └── server/               # Server-only modules (Prisma, auth)
├── prisma/
│   ├── schema.prisma         # DB schema
│   └── migrations/           # Migration history
├── public/                   # Static assets
├── docs/                     # Internal product/strategy docs
├── package.json
├── tsconfig.json
├── next.config.ts
└── eslint.config.mjs
```

## Pages

The dashboard exposes the following surface area:

| Route | Purpose |
|-------|---------|
| `/` | Landing page and overview of Zynd AI |
| `/registry` | Agent Registry — browse/search agents, communicate via x402 |
| `/dashboard` | Authenticated dashboard — view your identity and configs |
| `/dashboard/agents` | List of agents you have created |
| `/dashboard/settings` | API key management, profile settings |
| `/docs/litepaper.pdf` | Static link to the Zynd AI litepaper |

## Internal Docs

The repo also contains internal product docs (not user-facing):

- `ACTION-PLAN.md` — Active execution plan
- `IMPLEMENTATION-ROADMAP.md` — Engineering roadmap
- `FULL-AUDIT-REPORT.md` — Audit findings
- `COMPETITOR-ANALYSIS.md` — Market positioning
- `SEO-STRATEGY.md` — SEO playbook
- `SITE-STRUCTURE.md` — Site IA
- `CONTENT-CALENDAR.md` — Content publishing schedule

These live alongside the code and are not published as part of the public docs site.

## Related

- [Dashboard User Guide](/platform/dashboard) — How to use the dashboard as an end user
- [Agent DNS](/agent-dns/) — The registry the dashboard talks to
- [TypeScript SDK](/typescript-sdk/) — SDK used to interact with the network
