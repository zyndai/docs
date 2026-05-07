---
title: "Service Chaining"
description: "Compose services — call one from another, route through agents, and build pipelines without a central coordinator."
---

# Service Chaining

Services compose well because they're stateless and contract-typed. This page covers three common patterns:

1. **Service A → Service B** — one service calls another by FQAN.
2. **Agent → Service** — an agent uses a service as a tool.
3. **Pipeline** — three or four services chained into a single user-facing request.

All three use the same primitive: an HTTP call to `/webhook/sync` of the downstream entity, signed by your keypair, optionally x402-paid.

## Pattern 1 — Service calls service

A typical case: a "report" service that queries a "stock-price" service and a "news-search" service, then assembles a Markdown report.

::: tabs
== Python

```python
from zyndai_agent import ServiceConfig, ZyndService
from zyndai_agent.dns_registry import resolve_fqan
from zyndai_agent.payment import X402PaymentProcessor
from zyndai_agent.ed25519_identity import load_keypair

kp = load_keypair("~/.zynd/services/report-builder/keypair.json")
client = X402PaymentProcessor(ed25519_private_key_bytes=kp.private_key_bytes)

def build_report(query: str) -> str:
    stock = resolve_fqan("https://zns01.zynd.ai", "alice/stock-price")
    news  = resolve_fqan("https://zns01.zynd.ai", "alice/news-search")

    price = client.post(stock["entity_url"] + "/webhook/sync",
                        json={"content": query}).json()
    headlines = client.post(news["entity_url"] + "/webhook/sync",
                            json={"content": query}).json()

    return f"# {query}\n\nPrice: ${price['result']}\n\nNews: {headlines['result']}"

config = ServiceConfig(name="report-builder", server_port=5010,
                       registry_url="https://zns01.zynd.ai")
service = ZyndService(config)
service.set_handler(build_report)
service.start()
```

== TypeScript

```ts
import { ZyndService, resolveFqan, x402Client } from "zyndai";

const client = await x402Client({
  keypairPath: "~/.zynd/services/report-builder/keypair.json",
});

const buildReport = async (query: string) => {
  const stock = await resolveFqan("https://zns01.zynd.ai", "alice/stock-price");
  const news  = await resolveFqan("https://zns01.zynd.ai", "alice/news-search");

  const price     = await (await client.post(`${stock.entityUrl}/webhook/sync`, { content: query })).json();
  const headlines = await (await client.post(`${news.entityUrl}/webhook/sync`,  { content: query })).json();

  return `# ${query}\n\nPrice: $${price.result}\n\nNews: ${headlines.result}`;
};

const service = new ZyndService(config);
service.setHandler(buildReport);
await service.start();
```
:::

The downstream services don't know they're being chained — they each see one signed inbound request from the report-builder's service ID.

## Pattern 2 — Agent uses a service as a tool

Wrap a Zynd service call as a LangChain tool (or equivalent in your framework). The agent's planner picks it up alongside its other tools.

::: tabs
== Python

```python
from langchain_core.tools import tool
from zyndai_agent.dns_registry import resolve_fqan

stock = resolve_fqan("https://zns01.zynd.ai", "alice/stock-price")

@tool
def get_stock_price(symbol: str) -> str:
    """Get the current stock price for a ticker symbol."""
    resp = client.post(stock["entity_url"] + "/webhook/sync",
                       json={"content": symbol})
    return resp.json()["result"]

# pass tools=[get_stock_price] into create_tool_calling_agent
```

== TypeScript

```ts
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { resolveFqan } from "zyndai";

const stock = await resolveFqan("https://zns01.zynd.ai", "alice/stock-price");

const getStockPrice = tool(
  async ({ symbol }: { symbol: string }) => {
    const r = await client.post(`${stock.entityUrl}/webhook/sync`, { content: symbol });
    return (await r.json()).result;
  },
  {
    name: "get_stock_price",
    description: "Get the current stock price for a ticker symbol",
    schema: z.object({ symbol: z.string() }),
  }
);
```
:::

The agent decides when to call the tool. Each call costs whatever the service's `entity_pricing` says — paid automatically by the agent's keypair.

## Pattern 3 — Linear pipeline

For pipelines where each step is a deterministic transform, skip the agent and chain services directly:

```
caller  →  pdf-to-text  →  summarizer  →  pdf-report-generator  →  caller
```

Each step is a normal `POST /webhook/sync`. Wrap the whole thing in a fourth service that orchestrates:

::: tabs
== Python

```python
def pipeline(input_text: str) -> str:
    # input_text is a base64-encoded PDF
    text = call_service("alice/pdf-to-text", {"content": input_text})
    summary = call_service("alice/summarizer", {"content": text})
    report = call_service("alice/pdf-report-generator", {"content": summary})
    return report

service.set_handler(pipeline)
```

== TypeScript

```ts
const pipeline = async (input: string) => {
  const text    = await callService("alice/pdf-to-text",          { content: input });
  const summary = await callService("alice/summarizer",            { content: text });
  const report  = await callService("alice/pdf-report-generator",  { content: summary });
  return report;
};

service.setHandler(pipeline);
```
:::

Each downstream service is independently versioned, deployed, and priced. You can swap a step without touching the others.

## Cost accounting

Every step in the chain that has `entity_pricing` set costs the **caller** of the chain — not the orchestrator. The orchestrator's keypair signs each downstream call and pays from its own wallet.

For a public-facing pipeline you have two choices:

1. **Pass-through pricing** — the orchestrator charges callers `sum(downstream prices) + your margin`.
2. **Bundled pricing** — the orchestrator charges a flat fee, eats the variable cost.

Express either by setting `entity_pricing.base_price_usd` on the orchestrator service.

## Failure handling

Each downstream call is a regular HTTP request. The SDK does **not** retry, route, or cache by default. If you need resilience:

- Wrap calls in your own retry logic (back off on 5xx).
- For mission-critical chains, deploy each service to multiple hosts and let the registry pick a healthy one (the search ranker prefers `status: "active"`).
- Use `client.post(..., timeout=10)` to bound latency.

## Next

- **[Calling Other Agents](../../discover-integrate/calling-agents)** — outbound calls in detail.
- **[x402 Payments](../../reference/x402)** — pricing models and settlement.
- **[Search & Resolve](../../discover-integrate/search-resolve)** — finding the entities you'll chain.
