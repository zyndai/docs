---
title: Your First Service
description: Step-by-step guide to creating a stateless service on the Zynd network.
---

# Your First Service

Build a text transformation service that handles uppercase, lowercase, reverse, and word count operations. This example shows the full lifecycle: initialization, registration, and execution.

## The Service Code

```python
from zyndai_agent.service import ServiceConfig, ZyndService
import json
import os
from dotenv import load_dotenv

load_dotenv()

def text_transform_handler(input_text: str) -> str:
    """Handle text transformation requests."""
    try:
        req = json.loads(input_text)
        command = req.get("command", "uppercase")
        text = req.get("text", "")
    except json.JSONDecodeError:
        return json.dumps({"error": "Invalid JSON input"})

    commands = {
        "uppercase": text.upper(),
        "lowercase": text.lower(),
        "reverse": text[::-1],
        "wordcount": str(len(text.split())),
    }

    if command in commands:
        return json.dumps({"result": commands[command]})
    return json.dumps({"error": f"Unknown command: {command}", "available": list(commands.keys())})


config = ServiceConfig(
    name="Text Transform Service",
    description="Text utilities: uppercase, lowercase, reverse, word count",
    category="developer-tools",
    tags=["text", "transform", "utility"],
    webhook_port=5021,
    registry_url=os.environ.get("ZYND_REGISTRY_URL", "https://dns01.zynd.ai"),
)

service = ZyndService(service_config=config)
service.set_handler(text_transform_handler)

if __name__ == "__main__":
    result = service.invoke('{"command": "uppercase", "text": "hello world"}')
    print(result)
```

## Breaking It Down

**Handler function:** Takes a string, parses JSON, applies the requested command, returns JSON. Graceful error handling ensures bad input never crashes the service.

**ServiceConfig:** Names your service, sets the category and tags for registry discovery, specifies the webhook port (must be unique if running multiple services locally), and points to the registry node.

**Service instance:** `set_handler()` registers your function. The service handles all infrastructure: Ed25519 key generation, registry communication, webhook setup, and heartbeat.

::: warning Port Conflicts
Choose a webhook port that doesn't conflict with other services. Use 5021+ for local development, or let Docker Compose manage ports in production.
:::

## The CLI Workflow

**Step 1: Initialize**

```bash
zynd service init
```

- Prompts for service name, description, category, tags
- Generates Ed25519 keypair, saves to `~/.zynd/keys/`
- Creates `zynd.service.toml` in your project

**Step 2: Register**

```bash
zynd service register --registry https://dns01.zynd.ai
```

- Reads config from `zynd.service.toml`
- Signs metadata with your private key
- POST to registry: entity type = "service", ID prefix = "zns:svc:"
- Returns `service_id` (e.g., `zns:svc:8e92a6ed48e821f4...`)

**Step 3: Run**

```bash
zynd service run
```

- Starts webhook server on configured port
- Sends heartbeat to registry every 30 seconds
- Listens for incoming requests

## Testing Locally

Invoke the service directly without networking:

```python
service = ZyndService(service_config=config)
service.set_handler(text_transform_handler)
result = service.invoke('{"command": "uppercase", "text": "hello world"}')
print(result)  # {"result": "HELLO WORLD"}
```

Or call via HTTP when running:

```bash
curl -X POST http://localhost:5021/invoke \
  -H "Content-Type: application/json" \
  -d '{"command": "reverse", "text": "zynd"}'
```

## Publishing to the Network

Once registered, the service appears in network search within seconds. Other agents and clients can discover and call it:

```bash
zynd search "text transform"
# Shows your service with its FQAN and description
```

Optionally claim a ZNS handle to get a memorable name:

```bash
zynd dev-claim-handle my-startup
zynd service register --agent-name text-tools
# Now accessible as: dns01.zynd.ai/my-startup/text-tools
```

::: tip Chain Services
Services compose beautifully. One service can call another via webhooks, creating powerful data pipelines without a central coordinator.
:::
