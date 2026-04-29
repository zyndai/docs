---
title: TypeScript SDK
description: Build agents and services on the Zynd network from Node.js or modern browsers.
---

# TypeScript SDK

`zyndai` is the TypeScript SDK for the Zynd network. Dual ESM/CJS, Node ≥ 18, works with both `import` and `require`.

It has the same surface as the Python SDK — `ZyndBase`, `ZyndAIAgent`, `ZyndService`, x402, registry client — plus a richer **CLI** (`npx zynd ...`) for scaffolding TypeScript or Python projects.

## Install

```bash
npm install zyndai
# or
pnpm add zyndai
# or
yarn add zyndai
```

## Quickstart — CLI

::: warning Webhook URL must be public
The Zynd network calls back into your agent over HTTP. `localhost` will never receive callbacks. For local dev expose the port with a tunnel:

```bash
ngrok http 5000
# or
cloudflared tunnel --url http://localhost:5000
```

Then set `ZYND_ENTITY_URL` to the tunnel URL before starting.
:::

### 1. Create your developer identity

```bash
npx zynd init
```

Generates `~/.zynd/developer.json` (Ed25519, mode 0600). Run once per machine. Every agent and service key is derived from this file.

### 2. Scaffold an agent or service

```bash
npx zynd agent init
```

Three prompts: language → framework → name.

```
Select a language
  ❯ TypeScript  — Node.js agent — npm, tsx, Zod
    Python      — Python agent — pip, pydantic

Select a framework (TypeScript)
  ❯ LangChain.js              — Tool-calling agents with memory and search
    LangGraph.js              — Graph-based agent with explicit state
    CrewAI-style (LangChain)  — Multi-agent researcher + analyst
    PydanticAI-style (Zod)    — Type-safe, schema-validated outputs
    Vercel AI SDK             — Tool-calling, streaming, generateObject
    Mastra                    — Full-stack TS agent framework
    Custom                    — Bring your own framework
```

Skip prompts in CI:

```bash
npx zynd agent init --lang ts --framework langchain --name stock-agent
npx zynd agent init --lang py --framework crewai --name research-crew
npx zynd service init --lang ts --name weather-api
```

### 3. Add API keys

Edit the generated `.env`. Set `ZYND_ENTITY_URL` to the public URL when behind NAT or a tunnel.

### 4. Run

```bash
npx zynd agent run
# or
npx zynd service run
```

`zynd agent run` reads `agent.config.json`, detects TS vs Python from the `language` field, and spawns `npx tsx agent.ts` or `python3 agent.py`. If no entry file exists, the CLI falls back to a built-in echo agent so you can verify registration + heartbeat against the registry.

## Quickstart — programmatic

### Service

```ts
import { ZyndService } from "zyndai";

const service = new ZyndService({
  name: "text-transform",
  description: "Converts text to uppercase",
  capabilities: { text: ["transform"] },
  webhookPort: 5000,
  entityUrl: "https://your-public-domain.com",
  registryUrl: "https://dns01.zynd.ai",
  keypairPath: process.env.ZYND_SERVICE_KEYPAIR_PATH,
});

service.setHandler((input) => input.toUpperCase());
await service.start();
console.log("Webhook:", service.webhookUrl);
```

### Agent (LangChain.js)

```ts
import { ZyndAIAgent } from "zyndai";
import { ChatOpenAI } from "@langchain/openai";
import { AgentExecutor, createToolCallingAgent } from "langchain/agents";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";

const tools = [new TavilySearchResults()];
const llm = new ChatOpenAI({ model: "gpt-4o-mini" });
const agent = await createToolCallingAgent({ llm, tools, prompt: ... });
const exec  = new AgentExecutor({ agent, tools });

const zynd = new ZyndAIAgent({
  name: "researcher",
  framework: "langchain",
  capabilities: { research: ["web_search"] },
  webhookPort: 5000,
  entityUrl: "https://your-tunnel.example.com",
});

zynd.setExecutor(exec);
await zynd.start();
```

## Repository layout

```
zyndai-ts-sdk/
├── src/
│   ├── index.ts                # Public exports
│   ├── base.ts                 # ZyndBase — shared lifecycle
│   ├── agent.ts                # ZyndAIAgent
│   ├── service.ts              # ZyndService
│   ├── identity.ts             # Ed25519 keypair, derive
│   ├── crypto.ts               # sign / verify primitives
│   ├── entity-card.ts          # EntityCard model
│   ├── entity-card-loader.ts   # Build + sign + write .well-known/agent.json
│   ├── registry.ts             # AgentDNS HTTP client
│   ├── search.ts               # Search helper
│   ├── webhook.ts              # Express server
│   ├── message.ts              # AgentMessage
│   ├── payload-schema.ts       # Zod payload schemas
│   ├── payment.ts              # x402 client + middleware
│   ├── config-manager.ts       # ~/.zynd/* IO
│   ├── types.ts
│   ├── cli/                    # npx zynd commands
│   │   ├── index.ts            # Entrypoint, command dispatch
│   │   ├── init.ts             # zynd init (developer keypair)
│   │   ├── auth.ts             # zynd auth login (browser flow)
│   │   ├── agent.ts            # zynd agent init / run
│   │   ├── service.ts          # zynd service init / run
│   │   ├── register.ts         # zynd register
│   │   ├── deregister.ts       # zynd deregister
│   │   ├── search.ts           # zynd search
│   │   ├── resolve.ts          # zynd resolve
│   │   ├── card.ts             # zynd card <id>
│   │   ├── status.ts           # zynd status
│   │   ├── info.ts             # zynd info
│   │   ├── keys.ts             # zynd keys list / rotate
│   │   ├── config.ts           # zynd config get / set
│   │   ├── prompts.ts          # Inquirer prompts
│   │   ├── scaffold-ts.ts      # TS template renderer
│   │   └── scaffold-identity.ts
│   └── templates/              # Project templates copied at scaffold time
│       ├── frameworks.ts       # Framework registry (langchain, langgraph, crewai, ...)
│       ├── ts/                 # TypeScript templates
│       └── py/                 # Python templates
└── examples/
    ├── custom-agent.ts
    ├── simple-service.ts
    └── x402-payment.ts
```

## Pages in this section

- **[CLI Reference](/ts-sdk/cli)** — every `npx zynd` command and flag.
- **[Programmatic API](/ts-sdk/programmatic)** — `ZyndAIAgent`, `ZyndService`, `Registry`, `Search`.
- **[Entity Card & x402](/ts-sdk/entity-card)** — card structure, signing, x402 settlement.

## See also

- **[Python SDK](/python-sdk/)** — same surface, Python flavor.
- **[Agent DNS Registry](/registry/)** — the network this SDK talks to.
- **[Deployer](/deployer/)** — host an agent built with this SDK.
