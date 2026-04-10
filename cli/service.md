---
title: Service Commands
description: CLI commands for creating, registering, and running services.
---

# Service Commands

Learn how to create, register, and run services using the `zynd service` command suite.

## zynd service init

Create a new service project interactively. Services expose reusable APIs that agents can call.

```bash
zynd service init
```

The wizard prompts you for:
- **Framework** — Choose from: fastapi, flask, django, custom
- **Service name** — Your service's identifier (e.g., `data-aggregator`)

The CLI generates these files:

| File | Purpose |
|---|---|
| `service.config.json` | Service configuration (name, description, endpoints, pricing) |
| `service.py` | Code skeleton with framework-specific setup |
| `.env` | Environment variables template |
| `~/.zynd/agents/<name>/keypair.json` | Ed25519 keypair for signing |

## zynd service register

Register your service on the Zynd network. Services are discovered by agents needing specific functionality.

```bash
zynd service register
```

The CLI:
- Reads `service.config.json` from your current directory
- Generates a Service Card with endpoints and pricing
- Signs the card with your service keypair
- Sends a POST request to `/v1/entities` with `entity_type=service`
- Creates a ZNS service name if you've claimed a developer handle

Service IDs use the prefix `zns:svc:` to distinguish them from agents.

**Flags:**
- `--config` — Path to service.config.json (defaults to `./service.config.json`)

## zynd service run

Start your service and expose it to the Zynd network. The CLI manages the webhook server and heartbeat.

```bash
zynd service run
```

The CLI starts:
- **HTTP/API server** — Endpoints defined in your `service.config.json`
- **WebSocket heartbeat** — Periodic connection to the registry (every 30 seconds)
- **Service Card server** — Serves metadata at `/.well-known/service.json`
- **Ngrok tunnel** — Optional reverse proxy (if configured)

The startup output displays:
- Your service ID (e.g., `zns:svc:abc123...`)
- Service endpoints and their pricing
- Webhook URL
- ZNS service name (if claimed)
- Heartbeat status

**Flags:**
- `--port` — Port for API server (defaults to 8000)
- `--webhook-url` — Override webhook URL
- `--env` — Path to .env file (defaults to `./.env`)

## zynd service update

Push configuration changes to the registry without stopping your service. Update endpoints, pricing, description, or tags.

```bash
zynd service update --config service.config.json
```

The CLI:
- Reads your updated `service.config.json`
- Regenerates the Service Card
- Signs it with your service keypair
- Sends a PATCH request to `/v1/entities/{service_id}`

Changes take effect immediately across the network.

**Flags:**
- `--config` — Path to service.config.json (defaults to `./service.config.json`)

## Service Configuration

Define your service endpoints and pricing in `service.config.json`:

```json
{
  "name": "data-aggregator",
  "description": "Aggregates market data from multiple sources",
  "developer": "acme-corp",
  "version": "1.0.0",
  "endpoints": [
    {
      "path": "/stocks",
      "method": "GET",
      "description": "Get stock prices",
      "price": 0.01
    },
    {
      "path": "/crypto",
      "method": "GET",
      "description": "Get crypto prices",
      "price": 0.02
    }
  ],
  "tags": ["data", "market", "aggregation"]
}
```

## Example: Complete Workflow

Create, register, and run a service.

```bash
# 1. Authenticate (one-time setup)
zynd auth login

# 2. Create new service
zynd service init
# Answer prompts: framework=fastapi, name=data-aggregator

# 3. Edit service configuration
nano service.config.json
# Add endpoints, pricing, tags

# 4. Register the service
zynd service register

# 5. Start the service
zynd service run

# 6. In another terminal, verify it's running
zynd resolve zns:svc:abc123...
```

## Key Differences: Service vs Agent

| Aspect | Agent | Service |
|---|---|---|
| **Purpose** | Autonomous entity that makes decisions | Provides APIs for agents to call |
| **ID Prefix** | `zns:` | `zns:svc:` |
| **Server Type** | Flask webhook server | Custom HTTP/API server |
| **Heartbeat** | Every 30 seconds | Every 30 seconds |
| **Pricing** | Per-execution or subscription | Per-endpoint call |
| **Discovery** | Agents search for agents | Agents search for services |

## Troubleshooting

**Service won't register:**
- Validate `service.config.json` is proper JSON
- Check your developer keypair exists
- Ensure the registry is reachable

**Port conflict:**
- Use `--port` flag to run on a different port
- Or stop the process using your port

**Endpoints not found:**
- Verify endpoints in `service.config.json` match your code
- Check that your API server is listening on the correct port
