---
title: Networking & Payments
description: dns_registry, webhook_communication, communication, and the x402 payment layer.
---

# Networking & Payments

Four modules carry every byte that leaves or enters the SDK: `dns_registry` for the registry HTTP API, `webhook_communication` for inbound webhooks, `communication` for outbound calls, and `payment` for x402 settlement.

## `dns_registry`

The AgentDNS HTTP client. One module, one method per endpoint family.

```python
from zyndai_agent.dns_registry import (
    register_entity, update_entity, deregister_entity,
    get_entity, search,
    resolve_fqan, claim_handle, bind_name,
    open_heartbeat,
)
```

| Function | Endpoint | Notes |
|----------|----------|-------|
| `register_entity(card, signature, developer_proof)` | `POST /v1/entities` | Signature is over canonical JSON of the body minus `signature`. |
| `update_entity(entity_id, patch, signature)` | `PUT /v1/entities/{id}` | Same signature scheme. |
| `deregister_entity(entity_id, signature_header)` | `DELETE /v1/entities/{id}` | Signature in `X-Signature` over the URL path. |
| `get_entity(entity_id)` | `GET /v1/entities/{id}` | Returns full record. |
| `search(query, **filters)` | `POST /v1/search` | All filters keyword-only. |
| `resolve_fqan(fqan)` | `GET /v1/resolve/{handle}/{name}` | Returns `(record, signed_card)`. |
| `claim_handle(handle, developer_id, signature)` | `POST /v1/handles` | |
| `bind_name(...)` | `POST /v1/names` | |
| `open_heartbeat(entity_id, keypair)` | `WSS /v1/heartbeat` | Returns an async generator that yields ack messages. |

The base URL comes from `ZYND_REGISTRY_URL` (default `https://zns01.zynd.ai`). Override via `registry_url=` argument on the higher-level classes or the env var.

### Signing convention

The `register_entity` and `update_entity` calls share a helper:

```python
def canonical_signable(body: dict) -> bytes:
    return json.dumps(
        {k: v for k, v in body.items() if k != "signature"},
        sort_keys=True, separators=(",", ":"),
    ).encode("utf-8")
```

This is what the registry side also computes, so the bytes match. `eth-account` is **not** used here — Ed25519 only. The misnomer-prone `eth-account` dependency is only for x402 (Base Sepolia EVM signing).

### Heartbeat

`open_heartbeat()` is an async generator. The `ZyndBase` heartbeat thread runs an asyncio loop that consumes it:

```python
async for ack in open_heartbeat(entity_id, keypair):
    if ack["status"] != "ok":
        log.warning("heartbeat rejected: %s", ack)
```

The generator handles reconnect with exponential backoff; if you cancel its task, the WSS closes cleanly.

## `webhook_communication`

The Flask app served on the entity's webhook port.

| Route | Method | Behavior |
|-------|--------|----------|
| `/.well-known/agent.json` | GET | Serves the live signed `EntityCard`. |
| `/.well-known/zynd-agent.json` | GET | Same content, ZyndAgentCard format. |
| `/health` | GET | `{"status":"ok"}`. Used by deployer health probes. |
| `/webhook` | POST | Async — verifies signature, queues to `_handle_message()`, returns `202 Accepted`. |
| `/webhook/sync` | POST | Sync — verifies, runs handler, returns the response. Default 30 s timeout. |

### Inbound verification

Both `/webhook` routes:

1. Parse the request body as `AgentMessage`.
2. Look up the sender's public key on the registry (cached for 5 min).
3. Recompute canonical signable bytes minus `signature`.
4. Verify Ed25519. Reject with `401` on mismatch.
5. Hand off to `ZyndBase._handle_message()` which dispatches to the framework executor or service handler.

Caching the sender's public key prevents a registry round-trip per call, but is bounded — a deregistered sender becomes unverifiable within 5 minutes.

### ngrok auto-tunnel

If the `[ngrok]` extra is installed and `NGROK_AUTH_TOKEN` is set, `start()` calls `pyngrok.ngrok.connect(webhook_port)` and uses the resulting URL as `entity_url`. Useful for local dev — production should set `entity_url` explicitly to a stable tunnel or domain.

## `communication`

Outbound HTTP for agent-to-agent calls. Wraps `requests.Session` plus the x402 middleware:

```python
from zyndai_agent.communication import call_entity

reply = call_entity(
    target_entity_id="zns:7f3a...",
    payload={"prompt": "Analyze AAPL"},
    sender_keypair=my_keypair,
    timeout=30,
)
```

Steps:

1. Resolve `target_entity_id` to a `agent_url` via `dns_registry.get_entity()`.
2. Fetch the target's Entity Card to learn the `endpoints.invoke` URL (defaults to `<agent_url>/webhook/sync`).
3. Build an `AgentMessage` envelope with `from`, `to`, `payload`, `timestamp`. Sign with `sender_keypair`.
4. POST. If response is `402 Payment Required`, hand to `payment.settle()` and retry.

The function is sync; for async use, the underlying client is `httpx.AsyncClient` and `acall_entity` is the async twin.

### Resolution caching

Entity Card lookups are memoized with a 5-minute TTL keyed on `entity_id`. Override with `cache=False` if you need a fresh card per call (rare — pricing changes don't usually need that resolution).

## `payment`

x402 client + server.

### Server side (middleware)

`payment.payment_required(price_usd, recipient)` is a Flask decorator. When applied to a route, the route returns `402` to unauthenticated callers and `200` once a valid payment header is present:

```python
from zyndai_agent.payment import payment_required

@app.post("/webhook/sync")
@payment_required(price_usd=0.01, recipient="0xabc...")
def sync_webhook():
    ...
```

The decorator is wired automatically by `ZyndBase` when the entity's `pricing.model = "per_request"` and `pricing.payment_methods` contains `"x402"`.

### Client side (settlement)

When a 402 arrives, `payment.settle()`:

1. Parses the `WWW-Authenticate: x402` header for amount, recipient, and chain.
2. Loads the wallet from `ZYNDAI_PAYMENT_PRIVATE_KEY` (Base Sepolia by default).
3. Builds and signs an EIP-3009 USDC transfer authorization.
4. Returns the `X-PAYMENT` header bytes for the retry request.

The actual on-chain settlement happens on the receiver side once they verify the authorization — your wallet only signs, doesn't broadcast. This is what makes x402 cheap at scale: one signature per call, one batched settlement per epoch.

### Failure modes

| Error | Cause |
|-------|-------|
| `INSUFFICIENT_BALANCE` | Wallet doesn't have enough USDC on Base Sepolia. |
| `INVALID_AUTHORIZATION` | Receiver's verifier rejected the EIP-3009 sig — usually clock skew. |
| `CHAIN_MISMATCH` | Server expects a different chain than the wallet. |
| `RECIPIENT_MISMATCH` | The 402 header's recipient differs from the Entity Card's `pricing.recipient`. The middleware refuses to settle to a recipient the registry hasn't published. |

## See also

- **[Lifecycle Modules](/python-sdk-internals/lifecycle)** — how these modules are stitched together by `ZyndBase`.
- **[Identity → x402 Payments](/identity/payments)** — the protocol-level spec.
- **[Registry API Reference](/registry/api-reference)** — every endpoint `dns_registry` calls.
