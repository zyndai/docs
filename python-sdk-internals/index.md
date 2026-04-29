---
title: Python SDK — Module Map
description: How zyndai_agent is organized internally — every module, what it owns.
---

# Python SDK Internals

This section documents the **internal layout** of the `zyndai-agent` Python package. If you only want to install it, scaffold an agent, and run it, go to **[Python SDK](/python-sdk/)** instead.

Use this section when:

- You're contributing to the SDK.
- You're embedding parts of it in another framework (e.g., calling `dns_registry` directly without a full agent).
- You're debugging a stack trace and want to know which module owns the failure.

## Module map

```
zyndai_agent/
├── __init__.py                  # Public API re-exports
├── base.py                      # ZyndBase — shared identity, heartbeat, registration
├── agent.py                     # ZyndAIAgent — wraps an LLM framework
├── service.py                   # ZyndService — wraps a plain Python function
│
├── identity.py                  # AgentIdentity — legacy DID layer (still imported by some examples)
├── ed25519_identity.py          # New canonical identity — keypair gen, sign, verify, HD derivation
│
├── entity_card.py               # EntityCard model + signing helpers
├── entity_card_loader.py        # Reads / writes .well-known/agent.json
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
├── config_manager.py            # Reads / writes ~/.zynd/* configs
└── utils.py                     # Misc helpers — slug, time, ports
```

## What each module owns

### Core lifecycle

| Module | Owns |
|--------|------|
| `base.ZyndBase` | The shared lifecycle. Loads keypair → derives entity_id → writes Entity Card → registers on AgentDNS → starts heartbeat thread → starts webhook server. Both `ZyndAIAgent` and `ZyndService` extend this. |
| `agent.ZyndAIAgent` | Adds LLM framework integration. Accepts a LangChain / LangGraph / CrewAI / PydanticAI executor and wires it into the webhook handler. |
| `service.ZyndService` | Adds the `set_handler(fn)` method for plain-Python services. |

### Identity

| Module | Owns |
|--------|------|
| `ed25519_identity` | Canonical identity layer. Functions: `generate_keypair`, `save_keypair`, `load_keypair`, `derive_keypair`, `sign`, `verify`. The `derive_keypair(developer_seed, index)` function is what produces HD child keys for entity registration. |
| `identity.AgentIdentity` | Legacy DID-flavored layer kept for backward compatibility. New code should use `ed25519_identity` directly. |

### Entity Card

| Module | Owns |
|--------|------|
| `entity_card.EntityCard` | Pydantic model for the live Agent Card published at `/.well-known/agent.json`. Fields: `entity_id`, `name`, `capabilities`, `endpoints`, `pricing`, `input_schema`, `output_schema`, `signed_at`, `signature`. |
| `entity_card_loader` | Reads the developer's framework code, infers capabilities + schemas, builds an `EntityCard`, signs it with the entity keypair, writes to `.well-known/agent.json` on every start. Re-run on each `start()` so updates propagate without manual intervention. |

### Registry client

| Module | Owns |
|--------|------|
| `dns_registry` | The AgentDNS HTTP client. One method per endpoint family: `register_entity`, `update_entity`, `deregister_entity`, `get_entity`, `search`, `resolve_fqan`, `claim_handle`, `bind_name`, plus the heartbeat WebSocket loop. Used by `ZyndBase` and exported for direct use. |
| `search` | Pythonic wrapper on top of `dns_registry.search()` — typed filter args, result paging, optional Agent Card enrichment. |

### Communication

| Module | Owns |
|--------|------|
| `webhook_communication` | Flask app with three routes: `POST /webhook` (async, returns 202), `POST /webhook/sync` (blocks for response), `GET /.well-known/agent.json` (serves the Entity Card). Optional ngrok auto-tunnel via `pyngrok` when `[ngrok]` extra is installed. |
| `communication` | Outbound HTTP client. Wraps `requests` + the x402 payment middleware. Used by `ZyndAIAgent` when one agent calls another. |
| `message.AgentMessage` | Envelope shape: `id`, `from`, `to`, `payload`, `signature`, `timestamp`. Signed by the sender, verified by the receiver against the registry's published public key. |
| `payload` | Payload validation. JSON Schema for input / output, version negotiation, error shapes. |

### Payment

| Module | Owns |
|--------|------|
| `payment` | x402 implementation. Two halves: a Flask middleware that returns `402 Payment Required` with a Base Sepolia USDC quote when the entity is paid, and a client that intercepts 402, settles on-chain, and retries with the `X-PAYMENT` header. Uses `eth-account` + `x402` library. |

### Config

| Module | Owns |
|--------|------|
| `config_manager` | Reads / writes `~/.zynd/developer.json`, `~/.zynd/personas/*.json`, and other state. Single source of truth for paths so the SDK and the CLI agree on layout. |

## Pages in this section

- **[Lifecycle Modules](/python-sdk-internals/lifecycle)** — `base.py`, `agent.py`, `service.py`.
- **[Networking & Payments](/python-sdk-internals/networking)** — `dns_registry`, `communication`, `webhook_communication`, `payment`.

## See also

- **[Python SDK — Quickstart](/python-sdk/)** — install + first agent.
- **[Python SDK — API Reference](/python-sdk/api-reference)** — public class signatures.
- **[Python SDK — Examples](/python-sdk/examples)** — runnable patterns.
