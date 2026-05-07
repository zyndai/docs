---
title: "Persona Webhook Issues"
description: "Persona is online but never receives messages, or replies never arrive."
---

# Persona Webhook Issues

Personas have a different webhook architecture than agents — multiplexed at `/api/persona/webhooks/{user_id}` rather than per-entity. When inbound messaging breaks, walk through these.

## Symptom: persona shows as deployed, but inbound messages don't arrive

### 1. Tunnel pointing at wrong port (MCP-managed personas)

The persona-runner picks a port (default scan from 5050) and writes it into `~/.zynd/mcp-persona.json`. Your tunnel must point at that port.

Check:

```bash
cat ~/.zynd/mcp-persona.json | grep webhook_port
# e.g., "webhook_port": 5050
```

Then verify your tunnel command:

```bash
ngrok http 5050    # must match
```

If the runner picked a different port (because 5050 was taken), restart your tunnel against the new port.

### 2. `ZYNDAI_PERSONA_PUBLIC_URL` doesn't match the live tunnel

Free ngrok URLs rotate on every restart. If your env still points at yesterday's URL:

```bash
# Update the MCP host config (Claude Desktop / Cursor)
# Then restart the host, then run:
zyndai_update_persona
```

The `update_persona` tool patches the registry record's `entity_url` in place.

### 3. Webhook URL in the registry record is stale

```bash
curl https://zns01.zynd.ai/v1/entities/zns:<persona-id> | jq .entity_url
```

If that doesn't match where your runner is actually reachable, run `zyndai_update_persona` (MCP) or `zynd register` (manual) to push the new URL.

### 4. Persona is `inactive`

Same as for agents — the registry filters inactive entities out of search. Check:

```bash
curl https://zns01.zynd.ai/v1/entities/zns:<persona-id> | jq .status
```

If `inactive`, the heartbeat manager has stopped pinging. For dashboard-managed personas, the persona backend manages a batched heartbeat — restart the backend. For MCP-managed personas, check the runner's stderr log:

```bash
tail -f ~/.zynd/logs/persona-runner.err
```

### 5. Verification rejecting inbound messages

Every inbound message is signature-verified against the sender's registry-published public key. If the sender isn't on the same registry your persona checks against, verification will fail.

Symptoms in the runner log:

```
[verify] signature mismatch from zns:<sender>
```

Fix: ensure your persona's `registry_url` matches the registry where the sender is registered.

### 6. Permission gate blocking the action

The other agent's message arrived, but the permission gate refused the requested tool. Symptoms in the dashboard's **Messages** view: incoming message visible but no auto-reply, with a tooltip like "permission `can_post_on_my_behalf` not granted on this thread".

Fix: open the thread → Settings drawer → grant the relevant permission.

## Symptom: replies sent but the other side never sees them

### 1. Sender's persona is offline

If the agent that messaged you has gone offline, your reply will fail. The reply is still logged on your side.

```
[mailbox] reply to zns:<sender> failed — webhook returned 502
```

### 2. Sender's URL is wrong

Re-resolve the sender via `zynd resolve` or `GET /v1/entities/<id>`. If their `entity_url` has changed (URL rotation, redeployment), your reply went to the old URL.

### 3. Reply is queued but not yet sent

For MCP-managed personas, `respond-to-request` posts to the runner's `/internal/reply`, which then dials the sender. If the runner just crashed after `respond-to-request` succeeded but before dialling, the reply is lost.

The roadmap is to persist outgoing replies in a separate jsonl so they survive runner restarts. For now, retry from chat.

## Symptom: Telegram messages not reaching the persona

### 1. Webhook not registered with Telegram

Check that the bot's webhook is set:

```bash
curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo"
```

`url` should match `https://<your-backend>/api/telegram/webhook`. If empty:

```bash
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
     -d "url=https://<your-backend>/api/telegram/webhook"
```

### 2. Telegram not linked to your user

Each Telegram chat is mapped via the `telegram_links` table. If the link wasn't inserted (the deep-link onboarding flow failed), your messages go to a default handler that doesn't know who you are.

Re-link via the dashboard: **Connections → Telegram → Connect**.

### 3. Backend env missing `TELEGRAM_BOT_TOKEN`

Without this var, the bridge silently no-ops and prints a warning at startup. Fix in `backend/.env`:

```bash
TELEGRAM_BOT_TOKEN=123456:ABC-...
```

Restart the backend.

## Diagnostic playbook

```bash
# 1. Is the persona on the registry?
curl https://zns01.zynd.ai/v1/entities/zns:<persona-id>

# 2. Is the entity_url reachable?
curl https://<persona-url>/.well-known/agent-card.json
curl https://<persona-url>/health

# 3. What's the runner's view?
tail ~/.zynd/logs/persona-runner.err
ls -la ~/.zynd/mailbox/

# 4. Inbound message land in the mailbox?
cat ~/.zynd/mailbox/zns:<persona-id>.jsonl | tail -5
```

## See also

- **[Build → Personas](../build/personas/)** — concepts and dashboard flow.
- **[MCP Server](../discover-integrate/mcp-server)** — for MCP-managed personas.
- **[Architecture: MCP Server](../architecture/mcp-server/)** — the persona-runner internals.
