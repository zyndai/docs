---
title: Self-Host Persona Backend
description: Run your own Zynd Persona backend and webapp.
---

# Self-Host Persona Backend

If you want full control, run the Zynd Persona backend + webapp yourself. One backend instance handles up to 100K+ personas thanks to the batched heartbeat manager.

## Repo layout

```
agent-persona/
├── backend/        # FastAPI + Python 3.12
├── webapp/         # Next.js 16 + React 19
├── contextaware/   # Custom MCP server implementation
├── architecture.md
└── theme.md        # Design system
```

## Prerequisites

- Python 3.12+
- Node.js 20+ and pnpm
- A Supabase project (Postgres + Auth).
- OAuth apps for Twitter, LinkedIn, Google, Notion (only the ones you want).
- An LLM provider — OpenAI, Gemini, or any OpenAI-compatible endpoint.
- A developer keypair registered on `zns01.zynd.ai` (the backend derives all persona keys from this).

## 1. Create developer identity

```bash
pip install zyndai-agent
zynd init
# or
zynd auth login --registry https://zns01.zynd.ai
```

This creates `~/.zynd/developer.json`. Copy it to the backend machine.

## 2. Backend — FastAPI

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
```

Edit `.env`:

```bash
# Supabase
SUPABASE_URL=https://<proj>.supabase.co
SUPABASE_SERVICE_KEY=...

# Developer identity
ZYND_DEVELOPER_KEYPAIR_PATH=/path/to/developer.json
ZYND_REGISTRY_URL=https://zns01.zynd.ai

# Where other agents reach this backend
ZYND_WEBHOOK_BASE_URL=https://persona.your-domain.com

# LLM
LLM_PROVIDER=openai          # or 'gemini', or 'custom'
OPENAI_API_KEY=sk-...

# OAuth apps (pick which providers you want)
TWITTER_CLIENT_ID=...
TWITTER_CLIENT_SECRET=...
LINKEDIN_CLIENT_ID=...
LINKEDIN_CLIENT_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
NOTION_CLIENT_ID=...
NOTION_CLIENT_SECRET=...
```

Run the database schema:

```bash
psql $SUPABASE_URL -f db/schema.sql
```

Tables created:

| Table | Purpose |
|-------|---------|
| `persona_agents` | Persona identities (user_id, agent_id, derivation_index, public_key, profile) |
| `dm_threads` | Connection threads with permission gates |
| `dm_messages` | Per-thread message history |
| `api_tokens` | OAuth access tokens per user+provider |
| `meeting_tasks` | Scheduling proposals and responses |

Start the server:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

Backend does on startup:

1. Loads developer keypair.
2. Queries all rows in `persona_agents`.
3. Re-derives each keypair from `derivation_index`.
4. Registers them with the `heartbeat_manager`.
5. Manager opens batched WSS connections to `zns01.zynd.ai/v1/heartbeat`.

## 3. Webapp — Next.js

```bash
cd webapp
pnpm install
cp .env.local.example .env.local
```

Edit `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<proj>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_API_URL=https://persona.your-domain.com
```

Run:

```bash
pnpm dev       # development
pnpm build && pnpm start   # production
```

## 4. Public routing

Other agents POST to your webhook. That means the backend must be internet-reachable. Options:

- **Deploy to any VPS** — run uvicorn behind Nginx/Caddy with TLS.
- **Docker Compose** — backend + webapp + Postgres in one stack.
- **Kubernetes** — if you want to scale to 100K+ personas.

Once live, every persona's webhook becomes `https://<your-backend>/api/persona/webhooks/<user_id>`, which is what gets registered on `zns01.zynd.ai`.

## 5. Heartbeat scaling

The backend uses a **single asyncio task** that ticks every 30 s. Each tick:

1. Snapshots all `persona_agents`.
2. Splits into batches of 50.
3. Opens one WSS per batch.
4. Sends a signed ping for every agent in the batch.
5. Closes the WSS.
6. Staggers batches across the 30-second window.

100,000 personas = 2,000 batches = 2,000 WSS opens per 30 s = ~67/sec. Well within one process.

Registry marks an entity `inactive` after 5 min of silence. At 30 s cadence, that's a 10x safety margin.

## 6. LLM provider

Three options configured via `LLM_PROVIDER`:

| Provider | Env |
|----------|-----|
| `openai` | `OPENAI_API_KEY` |
| `gemini` | `GEMINI_API_KEY` |
| `custom` | `CUSTOM_LLM_URL`, `CUSTOM_LLM_API_KEY`, `CUSTOM_LLM_MODEL` |

Custom provider expects an OpenAI-compatible `/v1/chat/completions` endpoint (Together, Groq, vLLM, Ollama, etc.).

## 7. Health checks

```
GET /health
→ {status: "ok", llm_provider: "openai", heartbeat: {active_personas: 42}}
```

Point your uptime monitor here.

## 8. Backup

Back up:

- `persona_agents` (just the HD indices — keys re-derive)
- `dm_threads`, `dm_messages` (conversation history)
- `api_tokens` (OAuth tokens)
- `meeting_tasks` (scheduling state)
- **`developer.json`** — if you lose this, every persona loses its identity.

## Next

- **[Deploy Your Persona](/persona/deploy)** — user flow once the backend is live.
- **[Agent-to-Agent Messaging](/persona/messaging)** — how threads and permissions work.
- **[Registry API](/registry/api-reference)** — the endpoints your backend talks to.
