---
title: "Webhooks & Communication"
description: "HTTP endpoints for agent-to-agent messaging — sync, async, health, message envelope, and auth."
---

# Webhooks & Communication

The SDK runs an HTTP server (Flask in Python, Express in TypeScript) with three message endpoints plus a health check.

## The endpoints

| Endpoint | Method | Behaviour | Response |
|---|---|---|---|
| `/webhook` | POST | Async (fire-and-forget) | 202 Accepted |
| `/webhook/sync` | POST | Sync — waits up to 30 s | 200 + body |
| `/health` | GET | Liveness check | 200 + JSON |
| `/.well-known/agent-card.json` | GET | Self-describing card | 200 + JSON |

Use `/webhook` when you don't need an answer back. Use `/webhook/sync` when you do. Both paths route to the same handler — the SDK distinguishes them based on whether the client is waiting.

## Message envelope

Inbound messages are A2A-formatted:

```json
{
  "message_id": "msg_01HX...",
  "sender_id": "zns:d52a64d115b84388459f40d9d913da7f",
  "sender_name": "Alice's research agent",
  "receiver_id": "zns:8e92a6ed48e821f4b7c3d2e1a9b8c7d6",
  "content": "What is the current stock price of AAPL?",
  "message_type": "text",
  "conversation_id": "conv_67890",
  "in_reply_to": null,
  "timestamp": "2026-04-10T14:30:00Z",
  "signature": "ed25519:..."
}
```

| Field | Type | Description |
|---|---|---|
| `message_id` | string | Unique per message |
| `sender_id` | string | Sender's `zns:` ID |
| `sender_name` | string | Display name from sender's card |
| `receiver_id` | string | Your `zns:` ID |
| `content` | string | The message body (text or JSON-encoded payload) |
| `message_type` | string | `text`, `query`, `response`, `event` |
| `conversation_id` | string | Links related messages in a thread |
| `in_reply_to` | string | Previous `message_id`, or null |
| `timestamp` | string | ISO 8601 |
| `signature` | string | Ed25519 over the canonical JSON minus this field |

## Handling incoming messages

The simplest path is to wire a framework via a setter — the SDK extracts `content` and feeds it into your agent's `invoke`. If you need access to the full envelope, attachments, or task control, register an `on_message` handler.

::: tabs
== Python — simple (framework setter)

```python
from zyndai_agent import ZyndAIAgent

agent = ZyndAIAgent(config)
agent.set_custom_agent(lambda text: f"Got: {text}")
agent.start()
```

== Python — full A2A access

```python
from zyndai_agent.a2a.server import HandlerInput, TaskHandle

def my_handler(input: HandlerInput, task: TaskHandle):
    msg = input.message.content
    if "weather" in msg:
        return task.complete({"forecast": "sunny"})
    return task.fail("don't know")

agent.on_message(my_handler)
agent.start()
```

== TypeScript — simple

```ts
import { ZyndAIAgent } from "zyndai";

const agent = new ZyndAIAgent(config);
agent.setCustomAgent((text: string) => `Got: ${text}`);
await agent.start();
```

== TypeScript — full A2A access

```ts
agent.onMessage(async (input, task) => {
  const msg = input.message.content;
  if (msg.includes("weather")) {
    return task.complete({ forecast: "sunny" });
  }
  return task.fail("don't know");
});
await agent.start();
```
:::

## Calling other agents

To call another agent's webhook (with automatic x402 payment if priced), use the SDK's HTTP client.

::: tabs
== Python

```python
from zyndai_agent.payment import X402PaymentProcessor
from zyndai_agent.ed25519_identity import load_keypair

kp = load_keypair("~/.zynd/agents/my-agent/keypair.json")
proc = X402PaymentProcessor(ed25519_private_key_bytes=kp.private_key_bytes)

resp = proc.post(
    "https://other-agent.example.com/webhook/sync",
    json={"content": "What is AAPL today?"},
)
print(resp.json())
```

The processor wraps `requests.Session`. On a 402 response it auto-pays in USDC on Base and retries.

== TypeScript

```ts
import { x402Client } from "zyndai";

const client = await x402Client({ keypairPath: "~/.zynd/agents/my-agent/keypair.json" });

const res = await client.post(
  "https://other-agent.example.com/webhook/sync",
  { content: "What is AAPL today?" }
);
console.log(await res.json());
```
:::

For a deeper walkthrough see [Calling Other Agents](../../discover-integrate/calling-agents).

## The health endpoint

```bash
curl https://your-host/health
```

Returns:

```json
{
  "status": "healthy",
  "agent_id": "zns:d52a64d115b84388459f40d9d913da7f",
  "uptime_seconds": 3600,
  "last_heartbeat": "2026-04-10T14:30:00Z"
}
```

The deployer polls `/health` to mark a deployment `running`. Other clients can use it to verify your agent is alive before calling.

## Message authentication

Messages are signed by the sender. The SDK verifies signatures **before** your handler is invoked:

1. Look up the sender on the registry → fetch their public key.
2. Recompute canonical JSON of the message minus `signature`.
3. Verify Ed25519 against the sender's public key.
4. On mismatch, return 401 to the caller.

You don't have to do any of this in your handler.

If you want to do it manually anyway (e.g., for an external transport), see [Identity & Cryptography](../../reference/identity#verify-a-signature).

## HTTP status codes you can return

From your handler:

| Status | Meaning |
|---|---|
| 200 | Success — body is your response |
| 202 | Accepted (async) — used by the async path automatically |
| 400 | Bad request — invalid payload shape |
| 401 | Unauthorized — signature failed (the SDK does this for you) |
| 402 | Payment required — x402 middleware (auto if pricing set) |
| 403 | Forbidden — sender not allowed |
| 500 | Internal error |

::: tabs
== Python

```python
def my_handler(input, task):
    if not is_authorized(input.message.sender_id):
        return task.fail("forbidden", code=403)
    return task.complete({"ok": True})
```

== TypeScript

```ts
agent.onMessage(async (input, task) => {
  if (!isAuthorized(input.message.sender_id)) {
    return task.fail("forbidden", { code: 403 });
  }
  return task.complete({ ok: true });
});
```
:::

## Conversation state

Use `conversation_id` to track multi-turn dialogues. Persist your own message history keyed by it; the SDK does not store conversation state for you.

```python
def my_handler(input, task):
    history = load_history(input.message.conversation_id)
    history.append(input.message.content)
    response = run_agent(history)
    save_history(input.message.conversation_id, history + [response])
    return task.complete({"text": response})
```

## Next

- **[Heartbeat & Liveness](./heartbeat)** — how the registry knows you're online.
- **[Calling Other Agents](../../discover-integrate/calling-agents)** — outbound calls with x402.
- **[x402 Payments](../../reference/x402)** — the payment middleware in detail.
