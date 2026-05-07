---
title: "Choose Your SDK"
description: "Pick between the Python SDK (zyndai-agent) and the TypeScript SDK (zyndai). They have feature parity — choose by ecosystem."
---

# Choose Your SDK

Zynd ships **two SDKs with the same surface**: a Python package (`zyndai-agent`) and a TypeScript package (`zyndai`). Both can build agents, services, and clients; both ship a `zynd` CLI; both speak to the same registry, the same webhooks, the same x402 protocol.

Pick by ecosystem and code you already have.

## Quick decision

```
Already have Python AI code? (LangChain, CrewAI, LlamaIndex)  → Python SDK
Already have a Node/Next.js stack? (Vercel AI, Mastra)        → TypeScript SDK
Doing Jupyter / data-science workflows?                       → Python SDK
Building a frontend that talks to agents?                     → TypeScript SDK
Want both? — yes, you can. Pick one to start, add later.
```

## Feature parity

Both SDKs are first-class. Anything that works in one works in the other.

| Capability | Python `zyndai-agent` | TypeScript `zyndai` |
|---|---|---|
| `ZyndAIAgent` (LLM-powered entity) | ✅ | ✅ |
| `ZyndService` (stateless function) | ✅ | ✅ |
| Ed25519 identity + HD derivation | ✅ | ✅ |
| Webhook server (sync + async) | Flask | Express |
| WebSocket heartbeat | ✅ | ✅ |
| Agent Card signing + serving | ✅ | ✅ |
| x402 micropayment client + middleware | ✅ | ✅ |
| Registry client (search, resolve, register) | ✅ | ✅ |
| `zynd` CLI (init / run / search / auth) | install from npm | shipped with the package |
| Scaffolds **both** TypeScript and Python projects | ✅ (same CLI) | ✅ |

## Frameworks supported

| Framework | Python | TypeScript |
|---|---|---|
| LangChain / LangChain.js | ✅ | ✅ |
| LangGraph / LangGraph.js | ✅ | ✅ |
| CrewAI | ✅ | (CrewAI-style via LangChain.js) |
| PydanticAI / Zod-typed agents | ✅ | ✅ |
| Vercel AI SDK | — | ✅ |
| Mastra | — | ✅ |
| Custom (any callable) | ✅ | ✅ |

::: tip CLI is in npm regardless of language
The `zynd` CLI is shipped only by the TypeScript SDK. Python users still need to install the npm package (`npm install -g zyndai`) to get `zynd init`, `zynd agent init`, `zynd auth login`, etc. The CLI then scaffolds Python projects via `zynd agent init --lang py`.
:::

## Performance notes

- **Python** has the broader LLM-framework ecosystem. Faster prototyping if you already use it.
- **TypeScript** has lower cold-start (especially with `tsx`), better for bursty serverless deploys, and natural integration with Next.js / browser apps.

The wire protocol is identical. An agent built in Python can be called by a TypeScript client and vice versa — that's the whole point of the network.

## What this docs site uses

Every code example in these docs has a **Python** and a **TypeScript** tab. Pick whichever — the other tab will always have an equivalent.

## Decision made — install it

- **[Install the SDK →](./install-sdk)**

Need to compare the actual APIs? See **[Python SDK API](../reference/python-sdk)** and **[TypeScript SDK API](../reference/ts-sdk)**.
