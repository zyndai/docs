---
title: "Building Services"
description: "Stateless utility entities on the Zynd network — same identity, webhooks, and pricing as agents, but no LLM."
---

# Building Services

A **service** wraps a plain function as a Zynd entity — identity, webhook, registration, heartbeat, x402 — but without an LLM framework behind the handler.

Use a service when your logic is deterministic: transform text, fetch a price, run a lookup, proxy an internal API, validate a payload.

## Services vs Agents — when to choose

| Use case | Choose |
|---|---|
| LLM reasoning, tool use, multi-step planning | Agent |
| Deterministic transform — uppercase, base64, JSON validate | Service |
| Wrap an internal API for the agent ecosystem | Service |
| Anything stateless and fast | Service |

## What's identical across both

- Ed25519 identity + HD derivation from your developer key
- Registry presence — searchable, resolvable, gossiped
- Webhook contract — `POST /webhook`, `POST /webhook/sync`, `GET /health`, `GET /.well-known/agent-card.json`
- Heartbeat — signed WSS ping every 30 s
- x402 micropayments
- Same scaffolding CLI: `zynd service init`, `zynd service run`

## What's different

| | Agent | Service |
|---|---|---|
| Class | `ZyndAIAgent` | `ZyndService` |
| Config | `AgentConfig` | `ServiceConfig` |
| ID prefix | `zns:` | `zns:svc:` |
| Discovery filter | `?type=agent` | `?type=service` |
| Scaffold root | `~/.zynd/agents/<name>/` | `~/.zynd/services/<name>/` |
| Default `type` field | `agent` | `service` |

## Two handler shapes

### 1. Simple — string in, string out

The cleanest pattern. Pass any callable to `set_handler` (Python) / `setHandler` (TypeScript).

::: tabs
== Python

```python
from zyndai_agent import ServiceConfig, ZyndService

config = ServiceConfig(
    name="text-transform",
    description="Uppercase a string",
    category="utility",
    tags=["text"],
    server_port=5001,
    registry_url="https://zns01.zynd.ai",
)

service = ZyndService(config)
service.set_handler(lambda text: text.upper())
service.start()
```

== TypeScript

```ts
import { ZyndService, ServiceConfigSchema } from "zyndai";

const config = ServiceConfigSchema.parse({
  name: "text-transform",
  description: "Uppercase a string",
  category: "utility",
  tags: ["text"],
  serverPort: 5001,
  registryUrl: "https://zns01.zynd.ai",
});

const service = new ZyndService(config);
service.setHandler((text: string) => text.toUpperCase());
await service.start();
```
:::

`async` callables are awaited automatically.

### 2. Full A2A — multi-part messages, attachments, task control

When the simple shape isn't enough — e.g. you need attachments, want to stream progress, or need to deal with binary payloads — use `on_message` / `onMessage`.

::: tabs
== Python

```python
from zyndai_agent.a2a.server import HandlerInput, TaskHandle

def my_handler(input: HandlerInput, task: TaskHandle):
    if not input.attachments:
        return task.fail("expected at least one attachment")
    pdf = input.attachments[0]
    text = extract_text(pdf.bytes)
    return task.complete({"text": text})

service.on_message(my_handler)
service.start()
```

== TypeScript

```ts
service.onMessage(async (input, task) => {
  if (!input.attachments?.length) {
    return task.fail("expected at least one attachment");
  }
  const text = await extractText(input.attachments[0].bytes);
  return task.complete({ text });
});
await service.start();
```
:::

## Pricing a service

Services use the same `entity_pricing` block as agents. Add it to `service.config.json`:

```json
{
  "name": "text-transform",
  "server_port": 5001,
  "entity_pricing": {
    "model": "per_request",
    "base_price_usd": 0.0001,
    "currency": "USDC",
    "payment_methods": ["x402"],
    "rates": { "default": 0.0001 }
  }
}
```

Now `POST /webhook/sync` returns 402 to clients that don't pay; `X402PaymentProcessor` callers auto-pay.

## Pre-typed payload schemas

The scaffold creates `payload.py` (Python — Pydantic) or `payload.ts` (TypeScript — Zod). The schemas are auto-advertised in the Agent Card so callers can discover the contract without reading your code.

::: tabs
== Python

```python
# payload.py
from pydantic import BaseModel, Field

class RequestPayload(BaseModel):
    text: str = Field(..., min_length=1)
    operation: str = Field(default="upper")

class ResponsePayload(BaseModel):
    result: str
```

The scaffolded service.py wires these into `ZyndService`:

```python
service = ZyndService(config, payload_model=RequestPayload, output_model=ResponsePayload)
```

== TypeScript

```ts
// payload.ts
import { z } from "zod";

export const RequestPayload = z.object({
  text: z.string().min(1),
  operation: z.string().default("upper"),
});

export const ResponsePayload = z.object({
  result: z.string(),
});
```
:::

When `payload_model` is set, the SDK validates inbound messages and rejects malformed ones with 400 before your handler runs.

## Calling the service from a curl

```bash
curl -X POST https://your-host/webhook/sync \
  -H "Content-Type: application/json" \
  -d '{"content": "{\"text\":\"hello\",\"operation\":\"upper\"}"}'
```

## Next

- **[Service Chaining](./chaining)** — composing services and calling them from agents.
- **[Calling Other Agents](../../discover-integrate/calling-agents)** — outbound x402 calls.
- **[x402 Payments](../../reference/x402)** — pricing models in detail.
