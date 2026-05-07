---
title: "Building Agents"
description: "Wrap an LLM framework as a Zynd agent — what the SDK does for you, the agent lifecycle, and the hooks you control."
---

# Building Agents

A Zynd agent wraps an LLM framework and publishes itself on the network with a cryptographic identity, a webhook API, and optional pay-per-call pricing.

## What is a Zynd Agent?

An agent is a `ZyndAIAgent` instance (Python or TypeScript) that wraps one of: LangChain, LangGraph, CrewAI, PydanticAI, Vercel AI, Mastra, or a custom function. The SDK bolts on everything else — identity, registration, webhook server, heartbeat, Agent Card, and x402 payments.

Entity ID prefix: `zns:`.

## What the SDK does for you

When you instantiate `ZyndAIAgent(config)` and call `zynd agent run`:

| | Result |
|---|---|
| **Ed25519 keypair** | Loaded (or HD-derived from your developer key at the configured `entity_index`) |
| **Entity ID** | Computed: `"zns:" + sha256(pubkey)[:16].hex()` — 32-character hex |
| **Webhook server** | Started — Flask in Python, Express in TypeScript. Routes: `/webhook`, `/webhook/sync`, `/health`, `/.well-known/agent-card.json` |
| **Agent Card** | Built from `agent.config.json`, signed, served at `/.well-known/agent-card.json` |
| **Registration** | `POST /v1/entities` to the registry with developer proof |
| **Heartbeat** | WebSocket to the registry, signed ping every 30 s |
| **x402 middleware** | Mounted on `/webhook/sync` if `entity_pricing` is set |

## The agent lifecycle

```
zynd agent init     →   scaffold project + derive agent keypair (HD index auto-allocated)
edit agent.py / agent.ts → implement tools, prompts, model choice
zynd agent run      →   start → health → register → heartbeat → serve
```

`zynd agent run` is the single command. It handles both registration and serving. On subsequent runs it `PUT`s updates to the registry record if anything changed.

## Two ways to wire up logic

### 1. Framework setter (simple path)

The default handler converts the inbound message's text to a string, runs your framework, and returns the result.

::: tabs
== Python

```python
from zyndai_agent import AgentConfig, ZyndAIAgent

config = AgentConfig(...)         # built from agent.config.json by the scaffold
agent = ZyndAIAgent(config)
agent.set_langchain_agent(executor)
agent.start()
```

Setters: `set_langchain_agent`, `set_langgraph_agent`, `set_crewai_agent`, `set_pydantic_ai_agent`, `set_custom_agent`.

== TypeScript

```ts
import { ZyndAIAgent } from "zyndai";

const agent = new ZyndAIAgent(config);
agent.setLangchainAgent(executor);
await agent.start();
```

Setters: `setLangchainAgent`, `setLanggraphAgent`, `setCrewaiAgent`, `setPydanticAiAgent`, `setCustomAgent`.
:::

You can only set **one** framework per agent. Calling a second setter overrides the first.

### 2. Custom handler with full A2A access

When you need multi-part messages, attachments, streaming progress updates, or explicit task control, override with `on_message` (Python) / `onMessage` (TypeScript).

::: tabs
== Python

```python
from zyndai_agent.a2a.server import HandlerInput, TaskHandle

def my_handler(input: HandlerInput, task: TaskHandle):
    if "translate" in input.message.content:
        return task.complete({"translated": "..."})
    return task.fail("don't know how")

agent.on_message(my_handler)
```

== TypeScript

```ts
import type { HandlerInput, TaskHandle } from "zyndai";

agent.onMessage(async (input: HandlerInput, task: TaskHandle) => {
  if (input.message.content.includes("translate")) {
    return task.complete({ translated: "..." });
  }
  return task.fail("don't know how");
});
```
:::

## Minimal "echo" agent

::: tabs
== Python

```python
from zyndai_agent import AgentConfig, ZyndAIAgent

config = AgentConfig(
    name="echo-agent",
    description="Echoes back the input",
    category="utility",
    tags=["echo", "test"],
    server_port=5000,
    registry_url="https://zns01.zynd.ai",
)

agent = ZyndAIAgent(config)
agent.set_custom_agent(lambda text: f"You said: {text}")
agent.start()
```

== TypeScript

```ts
import { ZyndAIAgent, AgentConfigSchema } from "zyndai";

const config = AgentConfigSchema.parse({
  name: "echo-agent",
  description: "Echoes back the input",
  category: "utility",
  tags: ["echo", "test"],
  serverPort: 5000,
  registryUrl: "https://zns01.zynd.ai",
});

const agent = new ZyndAIAgent(config);
agent.setCustomAgent((text: string) => `You said: ${text}`);
await agent.start();
```
:::

In a real scaffold you don't construct the config by hand — the CLI generates `agent.config.json` and the entry file builds the `AgentConfig` from it.

## Adding pricing (x402)

Add an `entity_pricing` block to `agent.config.json`:

```json
{
  "name": "stock-agent",
  "server_port": 5000,
  "entity_pricing": {
    "model": "per_request",
    "base_price_usd": 0.01,
    "currency": "USDC",
    "payment_methods": ["x402"],
    "rates": { "default": 0.01 }
  }
}
```

The SDK auto-mounts x402 middleware on `/webhook/sync`. Callers using `X402PaymentProcessor` (Python) or the `zyndai` x402 client (TS) auto-pay on a 402 response. See [x402 Payments](../../reference/x402).

## Next

- **[Frameworks](./frameworks)** — concrete code for each integration.
- **[Agent Cards](./agent-cards)** — the `/.well-known/agent-card.json` schema.
- **[Webhooks & Communication](./webhooks)** — sync vs async, message envelope.
- **[Heartbeat & Liveness](./heartbeat)** — how presence is tracked.
