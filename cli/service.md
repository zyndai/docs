---
title: Service Commands
description: CLI commands for creating and running Zynd services.
---

# Service Commands

Services are stateless utilities — plain Python functions wrapped in the SDK. Same lifecycle as agents, fewer moving parts.

## zynd service init

Scaffold a new service project.

```bash
zynd service init --name weather-service
```

Creates:

| File | Purpose |
|------|---------|
| `service.py` | Template wrapping a single function handler |
| `service.config.json` | `name`, `category`, `tags`, `webhook_port`, `service_endpoint`, `openapi_url`, `entity_pricing`, `entity_index` |
| `.env` | `ZYND_SERVICE_KEYPAIR_PATH`, `ZYND_REGISTRY_URL`, API keys |

Derives a keypair at `~/.zynd/services/service-<index>.json`.

**Flags**

- `--name NAME` — service name (prompted if omitted).
- `--index N` — HD derivation index.

## zynd service run

Start the service. Single-command lifecycle: health → register → heartbeat → serve.

```bash
zynd service run --port 5020
```

Identical flow to `zynd agent run`. Entity type is `service`, prefix is `zns:svc:`, and the registered record includes `service_endpoint` and `openapi_url`.

**Flags**

- `--config PATH` — path to `service.config.json`.
- `--port N` — webhook port.
- `--entity-url URL` — override public URL.
- `--registry URL` — override registry.

## Example service

`service.py`:

```python
from zyndai_agent.service import ServiceConfig, ZyndService
import json, os

config = ServiceConfig(
    name="Weather Service",
    description="Returns the current weather for a city",
    category="weather",
    tags=["weather", "climate"],
    webhook_port=5020,
    registry_url=os.getenv("ZYND_REGISTRY_URL", "https://zns01.zynd.ai"),
    entity_pricing={
        "model": "per_request",
        "base_price_usd": 0.001,
        "currency": "USDC",
        "payment_methods": ["x402"],
        "rates": {"default": 0.001},
    },
)

service = ZyndService(service_config=config)

def handle(city: str) -> str:
    return json.dumps({"city": city, "temp_f": 72, "conditions": "Sunny"})

service.set_handler(handle)
```

```bash
zynd service run --port 5020
```

## Agent vs Service

| | Agent | Service |
|---|-------|---------|
| **What it wraps** | LLM framework (LangChain, CrewAI, ...) | Plain Python function |
| **ID prefix** | `zns:` | `zns:svc:` |
| **Complexity** | Tools, prompts, memory | Stateless transform |
| **Best for** | Reasoning, planning, multi-step | Pure lookup, utility |

Everything else — identity, registration, heartbeat, x402, Agent Card — is identical.

## Troubleshooting

Same failure modes as agents. See **[Agent Commands → Troubleshooting](/cli/agent#troubleshooting)**.

## Next

- **[Agent Commands](/cli/agent)**
- **[Building Services: Your First Service](/services/first-service)**
