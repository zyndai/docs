---
title: API Reference
description: Complete API reference for the zyndai-agent Python SDK.
---

# API Reference

## AgentConfig

`AgentConfig` extends Pydantic's `BaseModel`:

| Field | Type | Default | Description |
|---|---|---|---|
| `name` | `str` | `""` | Agent display name |
| `description` | `str` | `""` | Agent description for discovery |
| `category` | `str` | `"general"` | Agent category |
| `tags` | `List[str]` | `[]` | Tags for discovery |
| `summary` | `str` | `""` | Short summary (max 200 chars) |
| `webhook_host` | `Optional[str]` | `"0.0.0.0"` | Host to bind webhook server |
| `webhook_port` | `Optional[int]` | `5000` | Port for webhook server |
| `webhook_url` | `Optional[str]` | `None` | Public URL (auto-generated if None) |
| `registry_url` | `str` | `"https://zns01.zynd.ai"` | Registry API URL |
| `keypair_path` | `Optional[str]` | `None` | Path to Ed25519 keypair JSON |
| `price` | `Optional[str]` | `None` | x402 price per request (e.g., `"$0.01"`) |
| `config_dir` | `Optional[str]` | `None` | Custom config directory for agent files |
| `use_ngrok` | `bool` | `False` | Enable ngrok tunnel |
| `ngrok_auth_token` | `Optional[str]` | `None` | Ngrok auth token (or use `NGROK_AUTH_TOKEN` env) |
| `auto_reconnect` | `bool` | `True` | Auto-reconnect heartbeat on failure |
| `message_history_limit` | `int` | `100` | Max messages in history |
| `developer_keypair_path` | `Optional[str]` | `None` | Path to developer keypair (for HD derivation) |
| `agent_index` | `int` | `0` | HD derivation index |
| `card_output` | `str` | `".well-known/agent.json"` | Agent Card output path |

---

## ZyndAIAgent

**Constructor:**

```python
ZyndAIAgent(agent_config: AgentConfig)
```

### Properties

| Property | Type | Description |
|---|---|---|
| `agent_id` | `str` | Unique agent identifier (`zns:<hash>`) |
| `keypair` | `Keypair` | Ed25519 keypair (public_key, private_key, agent_id) |
| `webhook_url` | `str` | Agent's public webhook URL |
| `x402_processor` | `X402PaymentProcessor` | Payment processor instance |

### Methods

| Method | Returns | Description |
|---|---|---|
| `invoke(input_text)` | `str` | Run the configured framework agent |
| `set_langchain_agent(executor)` | `None` | Set LangChain AgentExecutor |
| `set_langgraph_agent(graph)` | `None` | Set LangGraph CompiledStateGraph |
| `set_crewai_agent(crew)` | `None` | Set CrewAI Crew |
| `set_pydantic_ai_agent(agent)` | `None` | Set PydanticAI Agent |
| `set_custom_agent(fn)` | `None` | Set custom callable (str → str) |
| `add_message_handler(handler_fn)` | `None` | Register incoming message handler |
| `set_response(message_id, response)` | `None` | Set sync response for a message |
| `stop_heartbeat()` | `None` | Stop WebSocket heartbeat thread |

---

## ZyndService

**Constructor:**

```python
ZyndService(service_config: ServiceConfig)
```

### Methods

| Method | Returns | Description |
|---|---|---|
| `invoke(input_text)` | `str` | Run the handler function |
| `set_handler(fn)` | `None` | Set handler function (str → str) |
| `add_message_handler(handler_fn)` | `None` | Register incoming message handler |
| `set_response(message_id, response)` | `None` | Set sync response for a message |
| `stop_heartbeat()` | `None` | Stop WebSocket heartbeat thread |

---

## AgentMessage

```python
AgentMessage(
    content: str,
    sender_id: str,
    sender_public_key: str = None,
    receiver_id: str = None,
    message_type: str = "query",
    message_id: str = None,         # Auto-generated UUID
    conversation_id: str = None,    # Auto-generated UUID
    in_reply_to: str = None,
    metadata: dict = None
)
```

| Method | Returns | Description |
|---|---|---|
| `to_dict()` | `dict` | Convert to dictionary |
| `to_json()` | `str` | Convert to JSON string |
| `from_dict(data)` | `AgentMessage` | Class method: create from dict |
| `from_json(json_str)` | `AgentMessage` | Class method: create from JSON |

---

## X402PaymentProcessor

Handles automatic x402 micropayments for HTTP requests.

| Method | Returns | Description |
|---|---|---|
| `get(url, **kwargs)` | `requests.Response` | GET with auto-payment |
| `post(url, data, json, **kwargs)` | `requests.Response` | POST with auto-payment |
| `request(method, url, **kwargs)` | `requests.Response` | Any HTTP method with auto-payment |
| `close()` | `None` | Close session |

Supports context manager (`with` statement).

---

## SearchAndDiscoveryManager

| Method | Returns | Description |
|---|---|---|
| `search_agents(query, category, tags, ...)` | `dict` | Full hybrid search with filters |

See also the standalone function:

```python
from zyndai_agent.dns_registry import search_agents, get_agent, register_agent, update_agent

# Search
results = search_agents(
    registry_url="https://zns01.zynd.ai",
    query="stock analysis",
    category="finance",
    tags=["stocks"],
    entity_type="agent",
    max_results=10,
    federated=True,
    enrich=True,
)

# Get by ID
agent = get_agent(registry_url="https://zns01.zynd.ai", agent_id="zns:8e92...")
```

---

## Ed25519 Identity

```python
from zyndai_agent.ed25519_identity import (
    generate_keypair,
    load_keypair,
    save_keypair,
    sign,
    verify,
    derive_agent_keypair,
    create_derivation_proof,
    generate_agent_id,
)
```

| Function | Returns | Description |
|---|---|---|
| `generate_keypair()` | `Keypair` | Generate new Ed25519 keypair |
| `load_keypair(path)` | `Keypair` | Load keypair from JSON file |
| `save_keypair(kp, path, metadata)` | `None` | Save keypair to JSON file |
| `sign(private_key, message)` | `str` | Sign message, returns `"ed25519:<b64>"` |
| `verify(public_key_b64, message, signature)` | `bool` | Verify signature |
| `derive_agent_keypair(dev_private_key, index)` | `Keypair` | HD-derive agent key |
| `create_derivation_proof(dev_kp, agent_pub, index)` | `dict` | Create developer proof |
| `generate_agent_id(public_key_bytes)` | `str` | Generate `zns:<hash>` from public key |

### Keypair Object

| Property | Type | Description |
|---|---|---|
| `agent_id` | `str` | `zns:<sha256_prefix>` |
| `public_key_string` | `str` | `ed25519:<base64>` |
| `public_key_b64` | `str` | Base64-encoded public key |
| `private_key` | `Ed25519PrivateKey` | Private key object |
| `private_key_bytes` | `bytes` | Raw 32-byte seed |
| `private_key_b64` | `str` | Base64-encoded seed |

---

## Agent Card

```python
from zyndai_agent.agent_card import build_agent_card, sign_agent_card, build_endpoints
```

| Function | Returns | Description |
|---|---|---|
| `build_agent_card(agent_id, name, ...)` | `dict` | Build unsigned Agent Card |
| `sign_agent_card(card, keypair)` | `dict` | Sign card with Ed25519 key |
| `build_endpoints(base_url)` | `dict` | Generate endpoint URLs from base URL |
