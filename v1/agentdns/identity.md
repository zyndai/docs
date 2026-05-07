---
title: Identity Layer
description: Ed25519 keypairs, deterministic IDs, and HD developer→agent key derivation.
---

# Identity Layer

**Source:** `internal/identity/identity.go`

Every entity in the network — registries, developers, agents — has an Ed25519 keypair. All IDs are deterministically derived from public keys, which means an ID is unforgeable: if you can sign for an ID, you own it.

## ID generation

```
Public Key (32 bytes)
    │
    ▼ SHA-256
Hash (32 bytes)
    │
    ▼ Take first 16 bytes, hex-encode
"agdns:" + hex
```

| Entity | ID format | Example |
|--------|-----------|---------|
| Agent | `agdns:<hex>` | `agdns:7f3a9c2e1d8b4a06` |
| Registry | `agdns:registry:<hex>` | `agdns:registry:a1b2c3d4e5f6` |
| Developer | `agdns:dev:<hex>` | `agdns:dev:f2a1c3e8b9d7` |

::: tip Prefix note
The user-facing docs and SDKs use the rebranded `zns:` prefix — the on-wire format stays `agdns:` for backward compatibility with existing gossip entries. Both refer to the same value.
:::

## Developer → Agent derivation (HD-style)

A developer can deterministically derive child agent keypairs from their own seed, similar to BIP-32 hierarchical wallets:

```
Developer Private Key (seed bytes)
    │
    ▼ SHA-512( dev_seed || "agdns:agent:" || uint32_be(index) )
64 bytes
    │
    ▼ Take first 32 bytes as agent seed
Agent Ed25519 Keypair
```

**Properties:**
- Same `(developer, index)` pair always produces the same agent keypair — recoverable from the developer key alone.
- Different indexes produce uncorrelated keys.
- The developer signs a **derivation proof** over `(agent_pub_key || index)` so anyone with the developer's public key can verify the link.
- No private key ever appears in storage — only the index does.

This is what the persona backend uses to mint per-user identities from a single root developer key. See [Persona — Deploy](/persona/deploy) for the consumer side.

## Derivation proof

A registration with a derivation proof looks like this on the wire:

```json
{
  "name": "stock-analyzer",
  "public_key": "ed25519:<agent_pub>",
  "developer_id": "agdns:dev:f2a1c3e8b9d7",
  "developer_proof": {
    "developer_public_key": "ed25519:<dev_pub>",
    "agent_public_key": "ed25519:<agent_pub>",
    "index": 0,
    "signature": "ed25519:<dev_signature_over(agent_pub || index)>"
  },
  "signature": "ed25519:<agent_signature_over_payload>"
}
```

On `POST /v1/entities` the registry runs both checks:

1. The agent signature verifies against `public_key`.
2. The developer signature in `developer_proof` verifies against `developer_public_key`, and that key resolves to `developer_id`.

If both pass, `owner = developer_id` is set and the agent gets attributed under the developer's namespace.

## Signing convention

All signatures are emitted as `ed25519:<base64(signature)>` and all public keys as `ed25519:<base64(pubkey)>`. The canonical signable bytes for any record exclude the `signature` field itself — sign over the JSON-encoded payload minus that key.

## TLS from Ed25519

Each node generates a **self-signed TLS certificate** from its Ed25519 key for the mesh port. There's no CA chain to validate — the application-layer `HELLO` handshake verifies that the peer's TLS public key matches the Ed25519 identity the peer claims (and that you've previously pinned via gossip / RIP / DNS TXT).

The HTTP API port is the opposite: standard CA-issued cert (Let's Encrypt). Clients trust the domain via TLS, then load `/.well-known/zynd-registry.json` to bind the domain to the Ed25519 key.

## Identity files

| File | Created by | Contains |
|------|-----------|----------|
| `~/.zynd/identity.json` | `agentdns init` | Registry node's Ed25519 keypair (private key included — back this up) |
| `~/.zynd/developer.json` | `zynd init` (Python SDK CLI) | Developer's Ed25519 keypair, used to derive agent keys |
| `agents` table, `public_key` column | `POST /v1/entities` | Public keys only — private keys stay client-side |

::: warning Losing the developer key
If you lose `developer.json` you cannot re-derive any of your agent keypairs, which means you can't sign updates or deregisters for them. Back it up the same way you'd back up a wallet seed.
:::

## Next

- **[Storage Schema](/agentdns/storage)** — where these IDs and keys land in PostgreSQL.
- **[Trust & Verification](/registry/trust-verification)** — how identities are verified across the mesh.
