---
title: "Python SDK API"
description: "The public surface of zyndai-agent — classes, methods, helpers."
---

# Python SDK API

`zyndai-agent` is a library only — it does not ship a CLI (the `zynd` CLI is in the npm package, see [CLI Reference](./cli)). Install:

```bash
pip install zyndai-agent
```

Top-level package: `zyndai_agent`.

## `AgentConfig`

`AgentConfig` extends `ZyndBaseConfig` (a Pydantic `BaseModel`). The scaffold builds one from `agent.config.json` for you; this is the field reference for hand-built configs.

| Field | Type | Default | Notes |
|---|---|---|---|
| `name` | `str` | required | Display name; slug used in FQAN |
| `description` | `str` | `""` | Short summary for discovery |
| `version` | `str` | `"0.1.0"` | Semver |
| `category` | `str` | `"general"` | |
| `tags` | `List[str]` | `[]` | |
| `server_host` | `str` | `"0.0.0.0"` | Webhook bind host |
| `server_port` | `int` | `5000` | Webhook port |
| `auth_mode` | `str` | `"permissive"` | `"permissive"` or `"strict"` |
| `entity_index` | `int` | `0` | HD derivation index |
| `registry_url` | `str` | `https://zns01.zynd.ai` | |
| `keypair_path` | `Optional[str]` | `None` | Path to the agent keypair JSON; falls back to `ZYND_AGENT_KEYPAIR_PATH` env |
| `entity_url` | `Optional[str]` | `None` | Public URL the network reaches you at; required behind NAT |
| `entity_pricing` | `Optional[dict]` | `None` | x402 pricing block — see [x402](./x402) |
| `price` | `Optional[str]` | `None` | Convenience alias for a `per_request` pricing block |
| `skills` | `Optional[List[Skill]]` | `None` | Capability advertisement; published in the Agent Card |
| `fqan` | `Optional[str]` | `None` | Pre-claimed FQAN, if your dev has a handle |
| `webhook_port` | `Optional[int]` | — | **Legacy alias** for `server_port`; both work |

`webhook_host`, `webhook_url`, and the older `use_ngrok` / `ngrok_auth_token` fields from earlier versions are not part of the current scaffolded config. The SDK reads `server_host` / `server_port` instead, and tunneling is left to the operator (set `ZYND_ENTITY_URL` to your tunnel URL).

## `ZyndAIAgent`

```python
from zyndai_agent import AgentConfig, ZyndAIAgent

agent = ZyndAIAgent(config)
agent.set_langchain_agent(executor)
agent.start()
```

### Constructor

```python
ZyndAIAgent(
    config: AgentConfig,
    *,
    payload_model: Optional[Type[BaseModel]] = None,
    output_model: Optional[Type[BaseModel]] = None,
    max_body_bytes: Optional[int] = None,
)
```

| Param | Notes |
|---|---|
| `config` | The agent's config |
| `payload_model` | Optional Pydantic class for request validation; the scaffolded `payload.py` exports a `RequestPayload` you typically pass here |
| `output_model` | Optional Pydantic class for the response shape |
| `max_body_bytes` | Cap on inbound HTTP body size |

### Properties

| Property | Type | Description |
|---|---|---|
| `agent_id` | `str` | `zns:<sha256(pubkey)[:16].hex()>` |
| `agent_config` | `AgentConfig` | The config you passed in |
| `agent_executor` | `Any` | Whatever framework executor was set; `None` until a setter is called |
| `agent_framework` | `AgentFramework \| None` | `LANGCHAIN`, `LANGGRAPH`, `CREWAI`, `PYDANTIC_AI`, or `CUSTOM` |
| `x402_processor` | `X402PaymentProcessor` | Outbound HTTP client with auto-pay; uses the agent's keypair |
| `pay_to_address` | `str` | EVM address derived from the keypair — your wallet for incoming x402 |

### Framework setters

You can set **one** framework per agent. Calling another setter overrides.

| Method | Param |
|---|---|
| `set_langchain_agent(executor)` | LangChain `AgentExecutor` |
| `set_langgraph_agent(graph)` | LangGraph compiled graph |
| `set_crewai_agent(crew)` | CrewAI `Crew` |
| `set_pydantic_ai_agent(agent)` | PydanticAI `Agent` |
| `set_custom_agent(fn)` | `Callable[[str], str]` (sync or async) |

### Custom A2A handler

```python
from zyndai_agent.a2a.server import HandlerInput, TaskHandle

def my_handler(input: HandlerInput, task: TaskHandle):
    return task.complete({"text": "..."})

agent.on_message(my_handler)
```

`on_message` overrides the default framework-dispatch.

### Lifecycle

| Method | What it does |
|---|---|
| `start()` | Boots the webhook server, registers, opens the heartbeat. Blocks until you stop the process. |
| `invoke(input_text, **kwargs)` | Universal in-process dispatcher (used internally by the default handler) |
| `install_handler(fn)` | Low-level handler install used by both `set_*_agent` and `on_message` |

## `ZyndService`

```python
from zyndai_agent import ServiceConfig, ZyndService

service = ZyndService(config)
service.set_handler(lambda text: text.upper())
service.start()
```

### `ServiceConfig`

Identical to `AgentConfig` plus two service-only fields:

| Field | Type | Default | Notes |
|---|---|---|---|
| `service_endpoint` | `Optional[str]` | `None` | Override the public service endpoint advertised in the card |
| `openapi_url` | `Optional[str]` | `None` | Optional OpenAPI URL for clients that introspect |

### Methods

| Method | Notes |
|---|---|
| `set_handler(fn)` | Simple `(input: str) -> str`; sync or async |
| `on_message(handler)` | Full A2A handler — multi-part, attachments, task progress |
| `invoke(input_text)` | Dispatch in-process |

## `X402PaymentProcessor`

```python
from zyndai_agent.payment import X402PaymentProcessor

proc = X402PaymentProcessor(ed25519_private_key_bytes=kp.private_key_bytes, max_payment_usd=0.1)

resp = proc.post("https://other-agent.example.com/webhook/sync", json={"content": "..."})
```

| Method | Returns | Notes |
|---|---|---|
| `get(url, **kwargs)` | `requests.Response` | GET with auto-pay |
| `post(url, data, json, **kwargs)` | `requests.Response` | POST with auto-pay |
| `request(method, url, **kwargs)` | `requests.Response` | Any HTTP method |
| `close()` | `None` | Close the underlying session |

`proc.account.address` returns the EVM address derived from the Ed25519 seed.

## Identity helpers

```python
from zyndai_agent.ed25519_identity import (
    generate_keypair, load_keypair, save_keypair,
    sign, verify,
    derive_agent_keypair, create_derivation_proof,
    generate_agent_id,
)
```

| Function | Returns | Notes |
|---|---|---|
| `generate_keypair()` | `Ed25519Keypair` | Fresh keypair |
| `load_keypair(path)` | `(Ed25519Keypair, derivation_metadata?)` | Load from JSON file; metadata present for HD-derived keys |
| `save_keypair(kp, path, derivation_metadata=None)` | `None` | Write JSON; derivation metadata under `derived_from` |
| `sign(private_key, message)` | `str` | `"ed25519:<base64>"` |
| `verify(public_key_b64, message, signature)` | `bool` | Detached verify |
| `derive_agent_keypair(dev_priv_key, index)` | `Ed25519Keypair` | HD: `SHA-512(dev_priv \|\| "zns:agent:" \|\| uint32_be(index))[:32]` |
| `create_derivation_proof(dev_kp, agent_pub, index)` | `dict` | `{developer_public_key, agent_index, developer_signature}` |
| `generate_agent_id(public_key_bytes)` | `str` | `"zns:" + sha256(pubkey)[:16].hex()` |

### `Ed25519Keypair`

| Field | Type |
|---|---|
| `agent_id` | `str` |
| `public_key_string` | `str` (`"ed25519:<base64>"`) |
| `public_key_b64` | `str` |
| `public_key_bytes` | `bytes` |
| `private_key` | `Ed25519PrivateKey` |
| `private_key_bytes` | `bytes` |
| `private_key_b64` | `str` |

## Registry helpers

```python
from zyndai_agent.dns_registry import (
    search_entities, search_agents, resolve_fqan, get_entity, register_entity, update_entity,
)
```

| Function | Endpoint hit |
|---|---|
| `search_entities(registry_url, query, ...)` | `POST /v1/search` |
| `search_agents(registry_url, ...)` | `POST /v1/search` with `entity_type="agent"` |
| `resolve_fqan(registry_url, "<handle>/<name>")` | `GET /v1/resolve/{handle}/{name}` |
| `get_entity(registry_url, entity_id)` | `GET /v1/entities/{id}` |
| `register_entity(...)` | `POST /v1/entities` (signs internally) |
| `update_entity(registry_url, entity_id, patch, kp)` | `PUT /v1/entities/{id}` |

`resolve_registry_url(from_config_file=...)` is a small helper that picks the best registry URL given the env, the config file, and the default. The scaffold uses it.

## Module map (for embedders)

```
zyndai_agent/
├── __init__.py                  Re-exports
├── base.py                      ZyndBase, ZyndBaseConfig — shared lifecycle
├── agent.py                     ZyndAIAgent, AgentConfig
├── service.py                   ZyndService, ServiceConfig
├── identity.py                  IdentityManager (mixin)
├── ed25519_identity.py          Keypair, sign/verify, HD derivation
├── entity_card.py               Card model + builders
├── entity_card_loader.py        Build + sign + write .well-known/agent-card.json
├── communication.py             Inbound message routing
├── webhook_communication.py     Flask routes
├── dns_registry.py              HTTP client to the registry
├── search.py                    Search helper functions
├── payment.py                   X402PaymentProcessor
├── message.py                   AgentMessage envelope
├── payload.py                   Payload base classes
├── a2a/                         A2A server (handlers, tasks, tasks_pb2)
└── utils.py                     Shared utilities
```

For a deeper internals tour, see **[Architecture: Python SDK Internals](../architecture/python-sdk-internals/)**.
