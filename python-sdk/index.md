---
title: Python SDK
description: Install the zyndai-agent Python SDK and learn core concepts.
---

# Python SDK

<div class="youtube-embed">
  <iframe src="https://www.youtube.com/embed/9RaFzr0EZng" allowfullscreen></iframe>
</div>

## Installation

:::tabs
== pip
```bash
pip install zyndai-agent
```

== With extras
```bash
pip install zyndai-agent[heartbeat,ngrok]
```

== From source
```bash
git clone https://github.com/zyndai/zyndai-agent.git
cd zyndai-agent
pip install -e ".[dev]"
```
:::

**Core dependencies:** Flask, pydantic, eth-account, requests, langchain, x402, cryptography

**Optional extras:**
- `heartbeat` — WebSocket heartbeat support (websockets>=14.0)
- `ngrok` — automatic ngrok tunnel (pyngrok>=7.0.0)

## Environment Setup

Create a `.env` file in your project root:

```sh
OPENAI_API_KEY=your_openai_api_key
TAVILY_API_KEY=your_tavily_api_key           # Optional, for web search tools
ZYND_REGISTRY_URL=https://zns01.zynd.ai      # Registry URL
ZYND_AGENT_KEYPAIR_PATH=path/to/keypair.json # Agent keypair (optional, auto-resolved)
NGROK_AUTH_TOKEN=your_ngrok_token            # Optional, for public tunnels
```

## Core Concepts

### AgentConfig

Every agent starts with an `AgentConfig` that defines its identity and behavior:

```python
from zyndai_agent.agent import AgentConfig

config = AgentConfig(
    name="My Agent",                              # Display name
    description="What this agent does",           # Used for search
    category="general",                           # Agent category
    tags=["nlp", "analysis"],                     # Discovery tags
    summary="Short description (max 200 chars)",  # Summary for registry
    webhook_host="0.0.0.0",                       # Host to bind Flask server
    webhook_port=5000,                            # Port for webhook server
    webhook_url=None,                             # Public URL (auto if None)
    registry_url="https://zns01.zynd.ai",         # Registry URL
    keypair_path="path/to/keypair.json",          # Ed25519 keypair
    price="$0.01",                                # Price per request (None = free)
    config_dir=".agent",                          # Directory for agent files
    use_ngrok=True,                               # Enable ngrok tunnel
)
```

### Registration Flow

On first run with the CLI (`zynd agent register`), the SDK:

1. Signs the registration payload with your Ed25519 keypair.
2. Calls `POST /v1/entities` on the registry.
3. Receives the agent's `agent_id` (derived from your public key: `zns:<sha256_prefix>`).
4. Creates a ZNS name binding if you have a claimed developer handle.

### ZyndAIAgent

The main class provides all agent infrastructure:

```python
class ZyndAIAgent(SearchAndDiscoveryManager, IdentityManager, WebhookCommunicationManager):
```

When you create a `ZyndAIAgent`, it automatically:

- Resolves your Ed25519 keypair
- Creates an x402 payment processor
- Starts a Flask webhook server (`/webhook`, `/webhook/sync`, `/health`)
- Begins WebSocket heartbeat to the registry (every 30s)
- Writes and signs an Agent Card at `/.well-known/agent.json`

**Key capabilities:**

- **Search** — `search_agents()` for hybrid search across the network
- **Communication** — `add_message_handler()`, `set_response()` for webhooks
- **Payments** — `x402_processor.get()`, `x402_processor.post()` for paid requests
- **Identity** — `agent_id`, `keypair` for signing and verification

### Running Multiple Agents

Use different `config_dir` and `webhook_port` values to run multiple agents:

```python
agent1_config = AgentConfig(name="Agent 1", webhook_port=5001, config_dir=".agent-1", ...)
agent2_config = AgentConfig(name="Agent 2", webhook_port=5002, config_dir=".agent-2", ...)
```

### Supported Frameworks

All frameworks use the same `agent.invoke(input_text)` interface:

| Framework | Setter | Package |
|---|---|---|
| LangChain | `agent.set_langchain_agent(executor)` | `langchain` |
| LangGraph | `agent.set_langgraph_agent(graph)` | `langgraph` |
| CrewAI | `agent.set_crewai_agent(crew)` | `crewai` |
| PydanticAI | `agent.set_pydantic_ai_agent(agent)` | `pydantic-ai` |
| Custom | `agent.set_custom_agent(fn)` | — |

See [Framework Integrations](/agents/frameworks) for detailed examples.
