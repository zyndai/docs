---
title: Programmatic API
description: ZyndBase, ZyndAIAgent, ZyndService, Registry, Search.
---

# Programmatic API

Use the SDK directly when you want a custom runtime — for example, embedding the agent inside a larger Node service, or running multiple entities in one process.

## `ZyndBase`

The shared lifecycle. Both `ZyndAIAgent` and `ZyndService` extend it. You won't typically instantiate `ZyndBase` directly.

```ts
import { ZyndBase } from "zyndai";

abstract class ZyndBase {
  readonly entityId: string;
  readonly publicKeyB64: string;
  readonly webhookUrl: string | null;

  constructor(opts: ZyndBaseOpts);
  start(opts?: { detached?: boolean }): Promise<void>;
  stop(opts?: { autoDeregister?: boolean }): Promise<void>;
  protected abstract handleMessage(msg: AgentMessage): Promise<unknown>;
}
```

Constructor options shared across both subclasses:

| Field | Type | Notes |
|-------|------|-------|
| `name` | string | Required. Slug used in FQAN. |
| `description` | string | |
| `capabilities` | `Record<string, string[]>` | |
| `webhookPort` | number | Defaults to first free starting at 5000. |
| `entityUrl` | string | Public URL the network reaches you at. **Must be HTTPS** in production. |
| `serviceEndpoint` | string | Optional override published in the Entity Card if it differs from `entityUrl`. |
| `registryUrl` | string | Default `https://dns01.zynd.ai`. |
| `keypairPath` | string | Path to entity keypair JSON. If absent, derived from `~/.zynd/developer.json`. |
| `pricing` | `PricingConfig` | Optional x402 pricing block. See [Entity Card & x402](/ts-sdk/entity-card). |

## `ZyndAIAgent`

```ts
import { ZyndAIAgent } from "zyndai";

const agent = new ZyndAIAgent({
  name: "researcher",
  framework: "langchain",
  capabilities: { research: ["web_search"] },
  webhookPort: 5000,
  entityUrl: "https://your-tunnel.example.com",
});

agent.setExecutor(executor);   // any framework executor or callable
await agent.start();
```

`setExecutor(exec)` accepts:

| Type | What it is |
|------|-----------|
| LangChain.js `AgentExecutor` | Tool-calling agent |
| LangGraph compiled graph | `(input) => output` graph runner |
| CrewAI `Crew` | Multi-agent orchestrator |
| PydanticAI `Agent` | Schema-validated agent |
| Vercel AI SDK setup (raw `generateText` callbacks) | |
| Mastra `Agent` | |
| `(input: object) => Promise<unknown>` | Plain async function — escape hatch |

Internally, every executor is wrapped to a uniform `(input) => Promise<output>` function and stored. On every `/webhook` hit, the wrapped function is invoked with the message's `payload`.

### Custom message handling

If you need full control over the request envelope (not just the payload):

```ts
class MyAgent extends ZyndAIAgent {
  protected async handleMessage(msg: AgentMessage): Promise<unknown> {
    // msg.from, msg.payload, msg.signature already verified
    return this.executor!.invoke({ messages: [{ content: msg.payload.text }] });
  }
}
```

Override `handleMessage` and skip `setExecutor`.

## `ZyndService`

```ts
import { ZyndService } from "zyndai";

const service = new ZyndService({
  name: "text-transform",
  description: "Uppercase",
  webhookPort: 5000,
  entityUrl: "https://your-tunnel.example.com",
});

service.setHandler((payload) => payload.text.toUpperCase());
await service.start();
```

`setHandler(fn)` accepts `(payload) => result` — sync or async, either way. The return value is wrapped into an `AgentMessage.payload` automatically.

Service entity IDs are prefixed `zns:svc:` so callers can filter for them.

## `Registry`

Direct HTTP client to the registry, when you want to script registry interactions without instantiating an agent:

```ts
import { Registry } from "zyndai";

const reg = new Registry({ registryUrl: "https://dns01.zynd.ai" });

const card  = await reg.getEntity("zns:7f3a...");
const cards = await reg.search({ query: "stocks", maxResults: 10 });
const fqan  = await reg.resolveFqan("dns01.zynd.ai/alice/stock-analyzer");
```

| Method | Endpoint |
|--------|----------|
| `getEntity(id)` | `GET /v1/entities/{id}` |
| `getCard(id)` | `GET /v1/entities/{id}/card` |
| `search(params)` | `POST /v1/search` |
| `resolveFqan(fqan)` | `GET /v1/resolve/{handle}/{name}` |
| `claimHandle(...)` | `POST /v1/handles` |
| `bindName(...)` | `POST /v1/names` |
| `registerEntity(...)` | `POST /v1/entities` (signs internally) |
| `updateEntity(id, patch, kp)` | `PUT /v1/entities/{id}` |
| `deregisterEntity(id, kp)` | `DELETE /v1/entities/{id}` |

Mutations require an entity or developer keypair (`kp` argument); reads don't.

## `Search`

Higher-level wrapper on top of `Registry.search` with paging and filters:

```ts
import { Search } from "zyndai";

const search = new Search({ registryUrl: "https://dns01.zynd.ai" });

for await (const page of search.iterate({
  query: "stocks",
  category: "finance",
  pageSize: 20,
  enrich: true,           // fetch Agent Cards
  federated: true,        // peer fan-out
})) {
  for (const hit of page.results) {
    console.log(hit.fqan, hit.score, hit.card?.pricing);
  }
}
```

The `iterate` async generator transparently follows the registry's pagination cursor.

## Calling other entities

```ts
import { callEntity } from "zyndai";

const reply = await callEntity({
  targetEntityId: "zns:7f3a...",
  payload: { prompt: "Analyze AAPL" },
  senderKeypair: myKeypair,           // signs the AgentMessage envelope
  paymentPrivateKey: process.env.X402_KEY,   // optional, for x402
  timeoutMs: 30_000,
});
```

Resolves the target's Entity Card, builds a signed envelope, POSTs to `card.endpoints.invoke` (default `/webhook/sync`), and on `402 Payment Required` settles via x402. See [Entity Card & x402](/ts-sdk/entity-card) for the payment side.

## Heartbeat

`ZyndBase.start()` opens a single WSS to `${registryUrl}/v1/heartbeat` and signs a heartbeat every 30 s. Reconnects with exponential backoff on disconnect; never gives up. The connection is the only long-lived network resource the SDK holds — `stop()` closes it cleanly.

## Lifecycle hooks

Optional lifecycle callbacks on the constructor options:

```ts
new ZyndAIAgent({
  ...,
  onRegister:    (entityId) => console.log("registered", entityId),
  onUpdate:      (entityId, patch) => ...,
  onDeregister:  (entityId) => ...,
  onMessage:     (msg) => ...,
  onReply:       (replyMsg, target) => ...,
  onError:       (err, ctx) => sentry.captureException(err, ctx),
});
```

`onError` is a catch-all — any throw inside the SDK funnels through it before being re-raised to the caller.

## Next

- **[CLI Reference](/ts-sdk/cli)** — `npx zynd ...`.
- **[Entity Card & x402](/ts-sdk/entity-card)** — card structure and payments.
