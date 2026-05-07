---
title: "Python SDK Internals"
description: "Module map of zyndai_agent — what each file owns, the lifecycle, and the networking layer."
---

# Python SDK Internals

This page documents the **internal layout** of the `zyndai-agent` Python package. If you only want to install it, scaffold an agent, and run it, see [Reference → Python SDK API](../../reference/python-sdk).

Use this page when:

- You're contributing to the SDK.
- You're embedding parts of it in another framework — e.g. calling `dns_registry` directly without a full agent.
- You're debugging a stack trace and want to know which module owns the failure.

## Module map

```
zyndai_agent/
├── __init__.py                  # Public API re-exports
├── base.py                      # ZyndBase — shared identity, heartbeat, registration
├── agent.py                     # ZyndAIAgent — wraps an LLM framework
├── service.py                   # ZyndService — wraps a plain Python function
│
├── identity.py                  # IdentityManager mixin (legacy DID layer)
├── ed25519_identity.py          # Canonical identity — keypair gen, sign, verify, HD derivation
│
├── entity_card.py               # EntityCard model + signing helpers
├── entity_card_loader.py        # Reads / writes .well-known/agent-card.json
│
├── dns_registry.py              # AgentDNS HTTP client — register, search, resolve, heartbeat
├── search.py                    # Search wrapper with filters + result models
│
├── communication.py             # Webhook HTTP client (outbound)
├── webhook_communication.py     # Flask server (inbound)
├── message.py                   # AgentMessage envelope model
├── payload.py                   # Payload schemas + validation
│
├── payment.py                   # x402 client + server middleware
│
├── a2a/                         # A2A server — handlers, tasks, payload routing
│   ├── server.py                # HandlerInput, TaskHandle, install_handler
│   └── ...
│
├── config_manager.py            # Reads / writes ~/.zynd/* configs
└── utils.py                     # Misc helpers — slug, time, ports
```

## Core lifecycle

### `base.ZyndBase`

The shared lifecycle. Both `ZyndAIAgent` and `ZyndService` extend it.

On `__init__`:

1. Resolve the keypair (`config.keypair_path` or env or HD-derive).
2. Compute `entity_id = "zns:" + sha256(pubkey)[:16].hex()`.
3. Build the `X402PaymentProcessor` and capture `pay_to_address`.
4. Set up Flask routes (or, in TS, Express).
5. Install the default handler (which the subclass overrides).

On `start()`:

1. Spin up the HTTP server.
2. Build, sign, and write `.well-known/agent-card.json`.
3. POST `/v1/entities` with the developer proof.
4. Open the WSS heartbeat (silently degrades if `websockets` isn't installed; the SDK logs a warning).
5. Block on the HTTP server.

### `agent.ZyndAIAgent`

Adds five framework setters and one custom-handler entry point.

| Method | What it does |
|---|---|
| `set_langchain_agent(executor)` | Stores executor + sets `agent_framework = LANGCHAIN` |
| `set_langgraph_agent(graph)` | Same for LangGraph |
| `set_crewai_agent(crew)` | Same for CrewAI |
| `set_pydantic_ai_agent(agent)` | Same for PydanticAI |
| `set_custom_agent(fn)` | Stores `Callable[[str], str]` (sync or async) |
| `on_message(handler)` | Replaces the default A2A dispatcher with your own |
| `invoke(text, **kwargs)` | Universal in-process dispatcher used by the default handler |

The default handler (`_default_handler`) extracts `input.message.content`, calls `invoke`, and returns `task.complete({"text": result})`.

### `service.ZyndService`

| Method | What it does |
|---|---|
| `set_handler(fn)` | `(text: str) -> str` (sync or async) |
| `on_message(handler)` | Full A2A access |
| `invoke(text)` | Manual in-process dispatch |

## Identity

### `ed25519_identity`

Canonical identity layer.

| Function | Purpose |
|---|---|
| `generate_keypair()` | Fresh Ed25519 keypair |
| `load_keypair(path)` | Returns `(Ed25519Keypair, derivation_metadata?)` |
| `save_keypair(kp, path, derivation_metadata=None)` | Writes JSON |
| `sign(private_key, message)` | Detached Ed25519 signature, base64 |
| `verify(public_key_b64, message, signature)` | bool |
| `derive_agent_keypair(dev_priv_key, index)` | HD derive |
| `create_derivation_proof(dev_kp, agent_pub, index)` | `{developer_public_key, agent_index, developer_signature}` |
| `generate_agent_id(public_key_bytes)` | `"zns:" + sha256(pubkey)[:16].hex()` |

The HD formula is:

```
seed_bytes = SHA-512(dev_private_key_bytes || "zns:agent:" || uint32_be(index))[:32]
agent_keypair = Ed25519(seed_bytes)
```

### `identity.IdentityManager` (legacy)

Older mixin still imported by some examples. New code uses `ed25519_identity` directly.

## Entity card

### `entity_card`

Pydantic model for the live Agent Card published at `/.well-known/agent-card.json`. Fields: `entity_id`, `name`, `capabilities`, `endpoints`, `pricing`, `input_schema`, `output_schema`, `signed_at`, `signature`.

### `entity_card_loader`

Builds, signs, and writes the card on every `start()`. Re-runs on each start so updates propagate without manual intervention.

## Registry client

### `dns_registry`

HTTP client to AgentDNS. One method per endpoint family:

| Method | Endpoint |
|---|---|
| `register_entity(...)` | `POST /v1/entities` (signs internally) |
| `update_entity(...)` | `PUT /v1/entities/{id}` |
| `deregister_entity(...)` | `DELETE /v1/entities/{id}` |
| `get_entity(...)` | `GET /v1/entities/{id}` |
| `search_entities(...)` | `POST /v1/search` |
| `resolve_fqan(...)` | `GET /v1/resolve/{handle}/{name}` |
| `claim_handle(...)` | `POST /v1/handles` |
| `bind_name(...)` | `POST /v1/names` |
| Heartbeat WS loop | Connect to `WSS /v1/entities/{id}/ws`, ping every 30 s |

### `search`

Pythonic wrapper on top of `dns_registry.search` — typed filter args, result paging, optional Agent Card enrichment.

## Communication

### `webhook_communication`

The Flask server with three routes:

| Route | Method | Behaviour |
|---|---|---|
| `/webhook` | POST | Async; returns 202 |
| `/webhook/sync` | POST | Sync; blocks for the handler's response |
| `/.well-known/agent-card.json` | GET | Serves the live card |

x402 middleware mounts on `/webhook/sync` if `entity_pricing` is set.

### `communication`

Outbound HTTP client. Wraps `requests` plus the x402 client middleware.

### `message.AgentMessage`

```
{ message_id, sender_id, sender_public_key, receiver_id,
  content, message_type, conversation_id, in_reply_to,
  timestamp, signature }
```

Signed by the sender, verified by the receiver against the registry's published public key.

### `payload`

Pydantic base classes for request/response payloads. The scaffolded `payload.py` exports `RequestPayload` and `ResponsePayload` that the SDK validates against.

## Payment

### `payment.X402PaymentProcessor`

Two halves rolled into one class:

- **Server middleware** — when mounted on a Flask route, it returns 402 with a Base / Sepolia USDC quote when the entity has pricing set.
- **Client** — wraps `requests.Session`; intercepts 402 responses, signs a USDC transfer with the `eth-account` lib, retries with the `X-Payment` header.

`proc.account.address` is the EVM wallet derived from the Ed25519 seed.

## A2A server (`zyndai_agent.a2a`)

The newer A2A protocol surface. Owns:

- `HandlerInput` — verified inbound message + parsed payload.
- `TaskHandle` — `complete`, `fail`, `update_progress`, `request_clarification`.
- `install_handler(fn)` — low-level handler installer used by `on_message` and the framework setters.

## Config

### `config_manager`

Reads / writes `~/.zynd/developer.json`, `~/.zynd/agents/<name>/keypair.json`, and the rest of the on-disk state. Single source of truth for paths so the SDK and the CLI agree on layout.

## Lifecycle thread model

| Thread | What it does |
|---|---|
| Main | Runs the Flask server (Werkzeug or gunicorn) |
| Heartbeat | One background thread for the WSS heartbeat; auto-reconnects with exp backoff |
| Default handler | Runs in the request thread; sync framework calls block, async ones are awaited via `asyncio.run` |
| `task.update_progress` callbacks | Fire on the request thread; future versions may move to a worker pool |

## Error surfaces

The SDK raises typed exceptions at boundaries:

| Exception | Where |
|---|---|
| `IdentityError` | Bad keypair file, bad signature, bad derivation proof |
| `RegistryError` | HTTP error from `/v1/...` (with `code`, `field`) |
| `WebhookError` | Inbound message failed validation or signature check |
| `PaymentError` | x402 settlement failed |

These all subclass `ZyndError` for catch-all paths.

## Versioning

`zyndai-agent` follows semver. The current line is **0.6.x**. Breaking changes between minor versions are listed in the `CHANGELOG.md` at the top of the repo.

## See also

- **[Reference → Python SDK API](../../reference/python-sdk)** — public class signatures and field tables.
- **[Architecture: AgentDNS](../agentdns/)** — the server side of `dns_registry`.
- **[Identity & Cryptography](../../reference/identity)** — Ed25519 details.
