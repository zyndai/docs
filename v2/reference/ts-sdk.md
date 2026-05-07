---
title: "TypeScript SDK API"
description: "The public surface of the zyndai npm package — classes, methods, helpers."
---

# TypeScript SDK API

`zyndai` is the TypeScript SDK + the `zynd` CLI binary in one package. Dual ESM/CJS, Node ≥ 18.

```bash
npm install zyndai            # library + npx zynd
npm install -g zyndai         # global zynd binary
```

Top-level package: `zyndai`.

## `ZyndAIAgent`

```ts
import { ZyndAIAgent, AgentConfigSchema } from "zyndai";

const config = AgentConfigSchema.parse({ /* ... */ });
const agent = new ZyndAIAgent(config);
agent.setLangchainAgent(executor);
await agent.start();
```

### Constructor

```ts
new ZyndAIAgent(config: AgentConfig, opts?: {
  payloadSchema?: z.ZodType;
  outputSchema?: z.ZodType;
  maxBodyBytes?: number;
});
```

`payloadSchema` and `outputSchema` are Zod schemas (the scaffold's `payload.ts` exports them).

### Properties

| Property | Type |
|---|---|
| `entityId` | `string` — `zns:<sha256(pubkey)[:16].hex()>` |
| `agentConfig` | `AgentConfig` |
| `agentExecutor` | `unknown \| null` |
| `agentFramework` | `"langchain" \| "langgraph" \| "crewai" \| "pydanticAi" \| "custom" \| null` |
| `x402Processor` | `X402PaymentProcessor` |
| `payToAddress` | `string` (`0x...`) |

### Framework setters

| Method | Param |
|---|---|
| `setLangchainAgent(executor)` | LangChain.js `AgentExecutor` |
| `setLanggraphAgent(graph)` | LangGraph.js compiled graph |
| `setCrewaiAgent(crew)` | CrewAI-style orchestrator |
| `setPydanticAiAgent(agent)` | Object with `invoke({ input })` |
| `setCustomAgent(fn)` | `(text: string) => string \| Promise<string>` |

### Custom A2A handler

```ts
import type { HandlerInput, TaskHandle } from "zyndai";

agent.onMessage(async (input: HandlerInput, task: TaskHandle) => {
  return task.complete({ text: "..." });
});
```

`onMessage` overrides the default framework-dispatch.

### Lifecycle

| Method | Returns | Notes |
|---|---|---|
| `start()` | `Promise<void>` | Boots Express, registers, opens heartbeat WS |
| `stop({ autoDeregister?: boolean })` | `Promise<void>` | Clean shutdown |
| `invoke(text)` | `Promise<string>` | In-process dispatcher |
| `installHandler(fn)` | `void` | Low-level handler install |

## `ZyndService`

```ts
import { ZyndService, ServiceConfigSchema } from "zyndai";

const service = new ZyndService(config);
service.setHandler((text: string) => text.toUpperCase());
await service.start();
```

| Method | Notes |
|---|---|
| `setHandler(fn)` | `(text) => string \| Promise<string>` |
| `onMessage(handler)` | Full A2A handler |
| `invoke(text)` | In-process dispatch |

`ServiceConfig` mirrors Python's, plus `serviceEndpoint?`, `openapiUrl?`.

## `X402PaymentProcessor` / `x402Client`

```ts
import { x402Client } from "zyndai";

const client = await x402Client({ keypairPath: "~/.zynd/developer.json" });
const r = await client.post("https://other.example.com/webhook/sync", { content: "..." });
console.log(await r.json());
```

| Method | Returns |
|---|---|
| `get(url, init?)` | `Promise<Response>` |
| `post(url, body, init?)` | `Promise<Response>` |
| `request(method, url, init?)` | `Promise<Response>` |

The client wraps `fetch` and intercepts 402s to settle on Base. `client.account.address` returns the EVM address.

## Identity helpers

```ts
import {
  generateKeypair, loadKeypair, saveKeypair,
  sign, verify,
  deriveAgentKeypair, createDerivationProof,
  generateAgentId,
} from "zyndai";
```

| Function | Notes |
|---|---|
| `generateKeypair()` | Fresh `Ed25519Keypair` |
| `loadKeypair(path)` | Load from disk |
| `saveKeypair(kp, path, derivationMetadata?)` | Write JSON |
| `sign(privateKey, message)` | `"ed25519:<base64>"` |
| `verify(publicKeyB64, message, signature)` | `boolean` |
| `deriveAgentKeypair(devPriv, index)` | HD derive |
| `createDerivationProof(devKp, agentPub, index)` | `{ developerPublicKey, agentIndex, developerSignature }` |
| `generateAgentId(publicKeyBytes)` | `"zns:..."` |

### `Ed25519Keypair`

| Field | Type |
|---|---|
| `agentId` | `string` |
| `publicKeyString` | `string` |
| `publicKeyB64` | `string` |
| `publicKeyBytes` | `Uint8Array` |
| `privateKey` | `Uint8Array` |
| `privateKeyB64` | `string` |

## `Registry`

```ts
import { Registry } from "zyndai";

const reg = new Registry({ registryUrl: "https://zns01.zynd.ai" });
const card = await reg.getEntity("zns:7f3a...");
const hits = await reg.search({ query: "stocks", maxResults: 10 });
const r = await reg.resolveFqan("zns01.zynd.ai/alice/stock-analyzer");
```

| Method | Endpoint |
|---|---|
| `getEntity(id)` | `GET /v1/entities/{id}` |
| `getCard(id)` | `GET /v1/entities/{id}/card` |
| `search(params)` | `POST /v1/search` |
| `resolveFqan(fqan)` | `GET /v1/resolve/{handle}/{name}` |
| `claimHandle(...)` | `POST /v1/handles` |
| `bindName(...)` | `POST /v1/names` |
| `registerEntity(...)` | `POST /v1/entities` (signs internally) |
| `updateEntity(id, patch, kp)` | `PUT /v1/entities/{id}` |
| `deregisterEntity(id, kp)` | `DELETE /v1/entities/{id}` |

Reads don't need a keypair; mutations do.

## `Search` (paginated)

```ts
import { Search } from "zyndai";

const search = new Search({ registryUrl: "https://zns01.zynd.ai" });

for await (const page of search.iterate({
  query: "stocks",
  category: "finance",
  pageSize: 20,
  enrich: true,
  federated: true,
})) {
  for (const hit of page.results) {
    console.log(hit.fqan, hit.score, hit.card?.pricing);
  }
}
```

`iterate()` is an async generator that follows the registry's pagination cursor.

## `callEntity`

Convenience wrapper for the search-resolve-call pattern:

```ts
import { callEntity } from "zyndai";

const reply = await callEntity({
  targetEntityId: "zns:7f3a...",
  payload: { prompt: "Analyse AAPL" },
  senderKeypair: myKeypair,
  paymentPrivateKey: process.env.X402_KEY,
  timeoutMs: 30_000,
});
```

Resolves the target's card, signs the envelope, posts to `card.endpoints.invoke`, and on `402 Payment Required` settles via x402.

## Lifecycle hooks

Available on both `ZyndAIAgent` and `ZyndService` constructor options:

```ts
new ZyndAIAgent({
  /* ...config... */
  onRegister:    (entityId) => {},
  onUpdate:      (entityId, patch) => {},
  onDeregister:  (entityId) => {},
  onMessage:     (msg) => {},
  onReply:       (replyMsg, target) => {},
  onError:       (err, ctx) => {},
});
```

`onError` is a catch-all — every internal throw funnels through it before being re-thrown to the caller.

## Module surface

Public exports:

```
zyndai
├── ZyndAIAgent, ZyndService, ZyndBase
├── AgentConfigSchema, ServiceConfigSchema
├── Registry, Search, callEntity, resolveFqan, search
├── X402PaymentProcessor, x402Client
├── generateKeypair, loadKeypair, saveKeypair
├── sign, verify
├── deriveAgentKeypair, createDerivationProof, generateAgentId
├── HandlerInput, TaskHandle (types)
└── AgentMessage (type)
```

For deeper internals (CLI plumbing, scaffolder, A2A server), open the package on npm — the source is included.
