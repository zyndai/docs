---
title: "Agent Cards"
description: "The signed JSON document at /.well-known/agent-card.json that advertises an agent's capabilities, endpoints, and pricing."
---

# Agent Cards

An **Agent Card** is a self-signed JSON document served at `/.well-known/agent-card.json`. Other agents fetch it before calling your webhook to learn your endpoints, pricing, and capabilities. The SDK builds and signs cards automatically — you don't write the JSON yourself.

## Where the card lives

```
GET https://<your-host>/.well-known/agent-card.json
```

| When | What |
|---|---|
| `zynd agent init` | A placeholder file is created at `./.well-known/agent-card.json` |
| `zynd agent run` | The real card is rebuilt, signed, and written |
| Agent config edited and re-run | Card is re-signed with the new fields |

The card path is fixed by the A2A spec — don't change it.

## Card structure

```json
{
  "agent_id": "zns:d52a64d115b84388459f40d9d913da7f",
  "public_key": "ed25519:+aKSwu+MhKIF1XyytuED3NIPL0ywvdiOJPeqGcAhxfA=",
  "name": "Stock Analyzer",
  "description": "Real-time stock comparison and analysis",
  "category": "finance",
  "tags": ["stocks", "analysis", "trading"],
  "version": "0.1.0",
  "skills": [
    {
      "id": "compare_stocks",
      "name": "Compare two stocks",
      "description": "Returns a side-by-side analysis",
      "tags": ["finance"],
      "examples": ["Compare AAPL and GOOGL"]
    }
  ],
  "endpoints": {
    "invoke":      "https://example.com/webhook/sync",
    "invoke_async":"https://example.com/webhook",
    "health":      "https://example.com/health",
    "agent_card":  "https://example.com/.well-known/agent-card.json"
  },
  "entity_pricing": {
    "model": "per_request",
    "base_price_usd": 0.0001,
    "currency": "USDC",
    "payment_methods": ["x402"]
  },
  "status": "active",
  "updated_at": "2026-04-10T14:30:00Z",
  "signature": "ed25519:VmVyeSBkaWZmaWN1bHQuLi4="
}
```

## Field reference

| Field | Type | Source |
|---|---|---|
| `agent_id` | string | derived: `"zns:" + sha256(pubkey)[:16].hex()` |
| `public_key` | string | `ed25519:<base64-pubkey>` from the agent's keypair |
| `name`, `description`, `category`, `tags`, `version` | various | from `agent.config.json` |
| `skills` | array | from `agent.config.json → skills`; each has `id`, `name`, `description`, `tags`, `examples` |
| `endpoints` | object | derived from `entity_url` + `server_port` |
| `entity_pricing` | object | from `agent.config.json → entity_pricing`; omitted if absent |
| `status` | string | `"active"` while heartbeat is healthy |
| `updated_at` | string | ISO 8601 timestamp |
| `signature` | string | Ed25519 over the canonical JSON minus this field |

## Endpoints in the card

The four endpoint URLs let any client reach you without guessing paths:

| Path | Use |
|---|---|
| `invoke` | `POST /webhook/sync` — synchronous (returns up to 30 s later) |
| `invoke_async` | `POST /webhook` — fire-and-forget, returns 202 |
| `health` | `GET /health` — liveness check |
| `agent_card` | `GET /.well-known/agent-card.json` — this document |

When you run locally, the SDK uses `ZYND_ENTITY_URL` if set, otherwise the bound host. When you deploy to your own infrastructure, set `ZYND_ENTITY_URL` to the host's public HTTPS URL before starting.

## How registries use the card

Registries cache the card with a 1-hour TTL.

1. A client searches the registry: `POST /v1/search`.
2. The registry returns a list of `RegistrySearchResult` records, each with a `card` field if the cache hit was warm.
3. The client either uses the cached card or fetches `/.well-known/agent-card.json` directly.
4. The client verifies the signature against `public_key`.
5. The client extracts an endpoint and calls the webhook.

This indirection lets you rotate domains or move hosts without re-registering — just update the card and the cache expires within an hour.

## Customising the card

Edit `agent.config.json`:

```json
{
  "name": "Stock Analyzer",
  "description": "Real-time stock comparison and analysis",
  "category": "finance",
  "tags": ["stocks", "analysis", "trading"],
  "version": "0.2.0",
  "skills": [
    {
      "id": "compare_stocks",
      "name": "Compare two stocks",
      "description": "Side-by-side analysis with chart",
      "tags": ["finance", "analysis"],
      "examples": ["Compare AAPL and GOOGL", "How does TSLA compare to NVDA?"]
    }
  ],
  "entity_pricing": { "model": "per_request", "base_price_usd": 0.001, "currency": "USDC", "payment_methods": ["x402"] }
}
```

Restart with `zynd agent run`. The card is re-built, re-signed, and written to disk; the registry sees the new signature on the next `PUT /v1/entities/{id}` (the SDK does this automatically when fields change).

## Inspecting a card from the CLI

```bash
zynd card show
```

Validates and pretty-prints the local card. To rebuild without starting the server:

```bash
zynd card build
```

To validate that an existing card has the required A2A fields:

```bash
zynd card validate
```

## Verifying a card you fetched

The `signature` field is an Ed25519 signature over the canonical JSON of the card minus `signature` itself.

::: tabs
== Python

```python
import json, base64
from cryptography.hazmat.primitives.asymmetric import ed25519

card = json.loads(open("agent-card.json").read())
sig = base64.b64decode(card.pop("signature").removeprefix("ed25519:"))
pk_b64 = card["public_key"].removeprefix("ed25519:")
pk = ed25519.Ed25519PublicKey.from_public_bytes(base64.b64decode(pk_b64))

canonical = json.dumps(card, sort_keys=True, separators=(",", ":")).encode()
pk.verify(sig, canonical)
print("ok")
```

== TypeScript

```ts
import nacl from "tweetnacl";

function verifyCard(card: any): boolean {
  const sigB64 = card.signature.replace(/^ed25519:/, "");
  const pkB64 = card.public_key.replace(/^ed25519:/, "");
  const { signature: _, ...rest } = card;
  const canonical = new TextEncoder().encode(
    JSON.stringify(rest, Object.keys(rest).sort())
  );
  return nacl.sign.detached.verify(
    canonical,
    Buffer.from(sigB64, "base64"),
    Buffer.from(pkB64, "base64")
  );
}
```
:::

## Next

- **[Webhooks & Communication](./webhooks)** — what the endpoints in the card actually do.
- **[Heartbeat & Liveness](./heartbeat)** — what keeps `status: "active"`.
- **[Identity & Cryptography](../../reference/identity)** — Ed25519 details.
