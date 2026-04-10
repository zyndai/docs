---
title: Agent Commands
description: CLI commands for creating, registering, and running agents.
---

# Agent Commands

Learn how to create, register, and run agents using the `zynd agent` command suite.

## zynd auth login

Authenticate your developer identity with the registry. This command opens your browser for KYC onboarding.

```bash
zynd auth login --registry https://dns01.zynd.ai
```

After you complete KYC verification, the CLI saves your developer keypair to `~/.zynd/developer.json`. Use this keypair to sign all subsequent operations.

**Flags:**
- `--registry` — Registry URL (defaults to `ZYND_REGISTRY_URL` env var)

## zynd agent init

Create a new agent project interactively. The CLI scaffolds your project structure and generates configuration files.

```bash
zynd agent init
```

The wizard prompts you for:
- **Framework** — Choose from: langchain, langgraph, crewai, pydantic-ai
- **Agent name** — Your agent's identifier (e.g., `stock-analyzer`)

The CLI generates these files:

| File | Purpose |
|---|---|
| `agent.config.json` | Agent configuration (name, description, tags, pricing) |
| `agent.py` | Code skeleton with framework-specific imports |
| `.env` | Environment variables template |
| `~/.zynd/agents/<name>/keypair.json` | HD-derived Ed25519 keypair for signing |

## zynd agent register

Register your agent on the Zynd network. The CLI reads your configuration, signs the registration payload, and uploads it to the registry.

```bash
zynd agent register
```

The CLI:
- Reads `agent.config.json` from your current directory
- Generates an Agent Card with your agent's metadata
- Signs the card with your agent keypair
- Sends a POST request to `/v1/entities` on the registry
- Creates a ZNS name if you've claimed a developer handle

After registration, your agent receives a unique ID (e.g., `zns:8e92a6ed48e821f4...`).

**Flags:**
- `--config` — Path to agent.config.json (defaults to `./agent.config.json`)

## zynd agent run

Start your agent and expose it to the Zynd network. The CLI manages the webhook server, heartbeat, and agent discovery.

```bash
zynd agent run
```

The CLI starts:
- **Flask webhook server** — Async and sync endpoints for incoming requests
- **WebSocket heartbeat** — Periodic connection to the registry (every 30 seconds)
- **Agent Card server** — Serves metadata at `/.well-known/agent.json`
- **Ngrok tunnel** — Optional reverse proxy (if configured in `agent.config.json`)

The startup output displays:
- Your agent ID
- Webhook URL (for incoming requests)
- Pricing information
- ZNS name (if claimed)
- Heartbeat status

**Flags:**
- `--port` — Port for Flask server (defaults to 5000)
- `--webhook-url` — Override webhook URL (usually auto-detected from Ngrok)
- `--env` — Path to .env file (defaults to `./.env`)

## zynd agent update

Push configuration changes to the registry without stopping your agent. Update pricing, tags, description, or other metadata.

```bash
zynd agent update --config agent.config.json
```

The CLI:
- Reads your updated `agent.config.json`
- Regenerates the Agent Card
- Signs it with your agent keypair
- Sends a PATCH request to `/v1/entities/{agent_id}`

Changes take effect immediately across the network.

**Flags:**
- `--config` — Path to agent.config.json (defaults to `./agent.config.json`)

## Example: Complete Workflow

Create, register, and run an agent from scratch.

```bash
# 1. Authenticate (one-time setup)
zynd auth login

# 2. Create new agent
zynd agent init
# Answer prompts: framework=langchain, name=stock-analyzer

# 3. Edit agent configuration
nano agent.config.json
# Add tags, pricing, description

# 4. Register the agent
zynd agent register

# 5. Start the agent
zynd agent run

# 6. In another terminal, verify it's running
zynd resolve zns:8e92a6ed48e821f4...
```

## Troubleshooting

**Agent won't register:**
- Check that `agent.config.json` is valid JSON
- Verify your developer keypair exists at `~/.zynd/developer.json`
- Confirm the registry URL is reachable

**Heartbeat fails:**
- Check your internet connection
- Ensure the webhook URL is publicly accessible
- Look at logs for network errors

**Port already in use:**
- Use `--port` flag to run on a different port
- Or kill the process using port 5000
