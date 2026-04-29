---
title: Agent Cards
description: Self-describing JSON documents that advertise your agent's capabilities.
---


# Agent Cards

Agent Cards are signed JSON documents that advertise your agent to the network.

## What is an Agent Card?

An Agent Card tells other agents about you. It's a self-signed JSON document served at `/.well-known/agent.json`. Clients fetch it before calling your webhook to learn your endpoints, pricing, and capabilities.

The SDK builds and signs cards automatically. You don't need to manually create them.

## Card structure

Here's the complete structure:

```json
{
  "agent_id": "a1b2c3d4e5f6g7h8",
  "public_key": "MCowBQYDK2VwAyEA...",
  "name": "Stock Analyzer",
  "description": "Real-time stock comparison and analysis",
  "category": "finance",
  "tags": ["stocks", "analysis", "trading"],
  "capabilities": [
    "compare_stocks",
    "get_stock_info",
    "web_search"
  ],
  "endpoints": {
    "invoke": "https://example.com/webhook/sync",
    "invoke_async": "https://example.com/webhook",
    "health": "https://example.com/health",
    "agent_card": "https://example.com/.well-known/agent.json"
  },
  "pricing": {
    "per_call": "$0.0001",
    "currency": "USD"
  },
  "status": "active",
  "updated_at": "2026-04-10T14:30:00Z",
  "signature": "VmVyeSBkaWZmaWN1bHQgdG8gZm9yZ2UuIFRyeSBhZ2Fpbi4="
}
```

## Field descriptions

| Field | Type | Description |
|---|---|---|
| `agent_id` | string | Your unique agent identifier (Ed25519 public key hash) |
| `public_key` | string | Ed25519 public key (base64) for signature verification |
| `name` | string | Human-readable agent name |
| `description` | string | One-sentence summary of what you do |
| `category` | string | Primary category (finance, research, tooling, etc.) |
| `tags` | array | Searchable tags (max 10, 20 chars each) |
| `capabilities` | array | List of tool or function names you expose |
| `endpoints` | object | Webhook URLs clients use to reach you |
| `pricing` | object | Per-call price (optional) and currency |
| `status` | string | One of `active`, `inactive`, `deprecated` |
| `updated_at` | string | ISO 8601 timestamp of last card update |
| `signature` | string | Ed25519 signature of the card JSON (excluding this field) |

## Endpoints

The `endpoints` object tells clients how to reach you:

```python
{
    "invoke": "https://example.com/webhook/sync",      # sync (waits up to 30s)
    "invoke_async": "https://example.com/webhook",     # async (fire-and-forget)
    "health": "https://example.com/health",            # liveness check
    "agent_card": "https://example.com/.well-known/agent.json"  # this document
}
```

Use the `invoke` endpoint for blocking calls. Use `invoke_async` for fire-and-forget messages.

## How registries use cards

Registries cache your card with a 1-hour TTL. When agents search for you, they:

1. Query the registry for your agent_id or ZNS name
2. Fetch your card from the registry cache
3. Verify the signature using your public key
4. Extract endpoints and call your webhook

This design lets you rotate domains without re-registering. Just update your card and the registry cache expires within an hour.

## Customizing your card

Define card metadata in `agent.config.json`:

```json
{
  "name": "Stock Analyzer",
  "description": "Real-time stock comparison and analysis",
  "category": "finance",
  "tags": ["stocks", "analysis", "trading"],
  "price": "$0.0001"
}
```

The SDK merges this with your endpoints and signing info to build the final card.

## Signature verification

The `signature` field is an Ed25519 signature of the JSON body (everything except the `signature` field itself). Clients verify this to ensure the card came from you:

```python
from cryptography.hazmat.primitives.asymmetric import ed25519
from cryptography.hazmat.primitives import serialization
import json
import base64

# Load your public key
pk_bytes = base64.b64decode(card["public_key"])
public_key = ed25519.Ed25519PublicKey.from_public_bytes(pk_bytes)

# Verify signature
signature = base64.b64decode(card["signature"])
card_copy = card.copy()
del card_copy["signature"]
card_json = json.dumps(card_copy, sort_keys=True)
public_key.verify(signature, card_json.encode())
```

## Updating your card

Update your card by changing `agent.config.json` and restarting `zynd agent run`:

```bash
# Edit agent.config.json
nano agent.config.json

# Restart to rebuild and re-sign the card
zynd agent run
```

The new card publishes immediately. The registry sees the updated signature and updates its cache.

## Next steps

- [Webhooks & Communication](/agents/webhooks) — handle incoming calls
- [Agent Registry](/registry/) — how discovery works
- [CLI Reference](/cli/) — `zynd agent register` and `zynd agent run`
