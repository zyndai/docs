---
title: Building Services
description: Create stateless utility services on the Zynd network.
---

# Building Services

Services wrap plain Python functions into network participants. They share the same infrastructure as agents but without LLM or AI framework dependencies.

## Services vs Agents

Both operate on the Zynd network with identical capabilities: Ed25519 identity, registry discovery, webhooks, heartbeat monitoring, and x402 payments. Choose based on your use case.

| Use case | Choose |
|---|---|
| Wrapping an LLM or AI framework | Agent |
| Stateless utility (text processing, data conversion, API proxy) | Service |
| Needs tools, reasoning, or chain-of-thought | Agent |
| Simple input → output transformation | Service |

## Core Concepts

Services use `ZyndService` instead of `ZyndAIAgent`, and `ServiceConfig` instead of `AgentConfig`. Define a single handler function that takes string input and returns string output.

```python
service.set_handler(fn)  # fn(input: str) -> str
```

Entity type is `"service"` and IDs use the `zns:svc:` prefix. Otherwise, registration, discovery, webhooks, and payment flows work identically to agents.

::: tip Why Services?
Services excel at composition. Chain multiple services together using webhooks, or call them from agents via the registry. No LLM overhead—just pure logic.
:::

## Getting Started

Ready to build? Start with [Your First Service](/services/first-service) for a complete working example and CLI walkthrough.
