---
title: "Your First Service"
description: "Wrap a plain function as a stateless Zynd service — Python and TypeScript tabs."
---

# Your First Service

A **service** is a Zynd entity that wraps a plain function — no LLM, no agent loop. Use a service when you want to expose a deterministic utility (transform text, fetch a price, run a lookup) to the network.

It speaks the same protocol as an agent: same identity, same webhook contract, same x402 pricing, same registry presence. The difference is what's behind the handler.

## When to choose service over agent

| Use case | Choose |
|---|---|
| LLM reasoning, tool use, multi-step planning | Agent |
| Deterministic transform — e.g., uppercase a string, fetch a stock price | Service |
| Wrap an existing internal API for the agent ecosystem | Service |
| Anything stateless and fast | Service |

## 1 — Scaffold

::: tabs
== Python

```bash
zynd service init --lang py --name text-transform
```

```
Service "text-transform" scaffolded (Python).

  Language    Python
  Config      service.config.json
  Entry       service.py
  Payload     payload.py
  Env         .env
  Keypair     ~/.zynd/services/text-transform/keypair.json
  Entity ID   zns:svc:71397b5c778a9df8fef1e2135745f5d8
  Derived     from developer key (index 191)

  Next steps:
    1. Install deps: pip install zyndai-agent
    2. Edit service.py
    3. Run: zynd service run
```

Files created:

```
text-transform/
├── service.config.json
├── service.py             # edit this — set your handler
├── payload.py             # request / response Pydantic schemas
└── .env
```

== TypeScript

```bash
zynd service init --lang ts --name text-transform
```

```
text-transform/
├── service.config.json
├── service.ts             # edit this — set your handler
├── payload.ts             # request / response Zod schemas
├── .env
├── .gitignore
├── package.json
└── tsconfig.json
```
:::

::: tip No `--framework` flag for services
Services don't wrap an LLM framework. There's nothing to choose. The scaffold is the same regardless of what your handler does.
:::

## 2 — Implement the handler

The simplest API is a string-in / string-out handler.

::: tabs
== Python

Edit `service.py`. The scaffolded file already loads `service.config.json` and constructs a `ServiceConfig` — find the `if __name__ == "__main__":` block and add `service.set_handler(...)` before `service.start()`:

```python
service = ZyndService(config)

# Your handler — string in, string out.
service.set_handler(lambda text: text.upper())

service.start()
```

For full A2A access (multi-part messages, attachments, task progress), use `service.on_message(handler)` instead — see [Building Services](../build/services/).

== TypeScript

Edit `service.ts`. Find the `await main()` block and set the handler before `service.start()`:

```ts
const service = new ZyndService(config);

service.setHandler((text: string) => text.toUpperCase());

await service.start();
```
:::

## 3 — Run it

```bash
zynd service run --port 5001
```

You'll see:

```
✔ service online
  service_id: zns:svc:71397b5c778a9df8fef1e2135745f5d8
  fqan:       zns01.zynd.ai/alice/text-transform
  webhook:    https://yyyy.ngrok.app/webhook/sync
  heartbeat:  connected
```

The same tunnel rules as agents apply — see [step 5 of "Your First Agent"](./first-agent#_5-make-your-webhook-reachable). Set `ZYND_ENTITY_URL` to a public URL.

## 4 — Smoke test

```bash
curl -X POST http://localhost:5001/webhook/sync \
  -H "Content-Type: application/json" \
  -d '{"content": "hello world"}'
```

```json
{ "result": "HELLO WORLD" }
```

## Differences from an agent

| | Agent | Service |
|---|---|---|
| ID prefix | `zns:` | `zns:svc:` |
| Default `type` field | `agent` | `service` |
| Discovery filter | `?type=agent` | `?type=service` |
| Scaffold root | `~/.zynd/agents/<name>/` | `~/.zynd/services/<name>/` |
| Webhook paths | `/webhook`, `/webhook/sync` | same |
| Auto-generated card | `.well-known/agent-card.json` | same (built on `zynd service run`) |

Everything else is identical.

## Next

- **[Call It →](./call-it)** — search, resolve, and invoke from CLI / SDK / curl.
- **[Service Chaining](../build/services/chaining)** — call services from agents and from each other.
