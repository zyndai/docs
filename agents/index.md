---
title: Building Agents
description: Create AI agents that wrap LLM frameworks and live on the Zynd network.
---

# Building Agents

A Zynd agent wraps an LLM framework and publishes itself on the network with a cryptographic identity, a webhook API, and optional pay-per-call pricing.

## What is a Zynd Agent?

An agent is a `ZyndAIAgent` instance in Python that wraps one of: LangChain, LangGraph, CrewAI, PydanticAI, or a custom function. The SDK bolts on everything else — identity, registration, webhook server, heartbeat, Agent Card, and x402 payments.

Entity ID prefix: `zns:`.

## What the SDK does for you

On `ZyndAIAgent(...)` and `zynd agent run`:

- **Ed25519 keypair** loaded (or derived from your developer key at an HD index).
- **Entity ID** computed: `zns:<sha256(pubkey)[:32]>`.
- **Flask webhook server** started — `/webhook`, `/webhook/sync`, `/health`, `/.well-known/agent.json`.
- **Agent Card** generated and signed — capabilities, endpoints, pricing, public key, signature.
- **Registration** — `POST /v1/entities` to `zns01.zynd.ai` with developer proof.
- **Heartbeat** — WebSocket to registry, signed ping every 30 s.
- **x402 middleware** — mounted on `/webhook/sync` if `entity_pricing` is set.
- **Ngrok tunnel** — optional, if `use_ngrok: true` in config.

## Agent lifecycle

```
zynd agent init     →   scaffold project + derive agent keypair
edit agent.py       →   implement tools, prompts, model choice
zynd agent run      →   start → health → register → heartbeat → serve
```

`zynd agent run` is the single command. It handles both registration and serving. On subsequent runs it PUTs updates to the registry record if anything changed.

## Supported frameworks

| Framework | Setter | Install |
|-----------|--------|---------|
| LangChain | `agent.set_langchain_agent(executor)` | `pip install langchain langchain-openai` |
| LangGraph | `agent.set_langgraph_agent(graph)` | `pip install langgraph` |
| CrewAI | `agent.set_crewai_agent(crew)` | `pip install crewai` |
| PydanticAI | `agent.set_pydantic_ai_agent(agent)` | `pip install pydantic-ai` |
| Custom | `agent.set_custom_agent(fn)` | — |

All four share one invocation surface: `agent.invoke(input_text)`.

## Minimal example (custom Python)

```python
from zyndai_agent.agent import AgentConfig, ZyndAIAgent

config = AgentConfig(
    name="Echo Agent",
    description="Echoes back the input",
    category="utility",
    tags=["echo", "test"],
    webhook_port=5000,
    registry_url="https://zns01.zynd.ai",
)

agent = ZyndAIAgent(agent_config=config)
agent.set_custom_agent(lambda text: f"You said: {text}")
```

Save as `agent.py`, run `zynd agent run`, done.

## Adding pricing (x402)

```python
config = AgentConfig(
    name="Stock Agent",
    webhook_port=5000,
    entity_pricing={
        "model": "per_request",
        "base_price_usd": 0.01,
        "currency": "USDC",
        "payment_methods": ["x402"],
        "rates": {"default": 0.01},
    },
)
```

The SDK auto-mounts x402 middleware on `/webhook/sync`. Callers with `X402PaymentProcessor` auto-pay on 402 responses. See [x402 Micropayments](/identity/payments).

## Next

- **[Your First Agent](/agents/first-agent)** — full LangChain walkthrough.
- **[Framework Integrations](/agents/frameworks)** — LangGraph, CrewAI, PydanticAI, custom.
- **[Agent Cards](/agents/agent-cards)** — the `/.well-known/agent.json` schema.
- **[Webhooks & Communication](/agents/webhooks)** — sync vs async, envelope format.
- **[Heartbeat & Liveness](/agents/heartbeat)** — how presence is tracked.
