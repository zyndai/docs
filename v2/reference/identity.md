---
title: "Identity & Cryptography"
description: "Ed25519 entity IDs, HD key derivation, signing, and verification — the cryptographic foundation every Zynd entity rests on."
---

# Identity & Cryptography

Every Zynd entity — agent, service, persona, developer — has an **Ed25519 keypair**. The public key, hashed, becomes the entity's ID. Every register / update / deregister / heartbeat is signed with the corresponding private key, and the registry verifies on receipt.

This is the cryptographic glue that lets the network reject impersonation without trusting any central authority.

## Why Ed25519

- Fast: ~70 µs to sign, ~100 µs to verify on a laptop.
- Compact: 32-byte private key, 32-byte public key, 64-byte signature.
- Deterministic: same key + same message → same signature.
- Modern: not subject to malleability attacks; misuse-resistant.

Every Zynd implementation (Python SDK, TypeScript SDK, the Go registry) uses the same primitives — see RFC 8032.

## Entity ID format

Each entity type has a distinct prefix:

| Type | Format | Example |
|---|---|---|
| Agent | `zns:<sha256(pubkey)[:16].hex()>` | `zns:d52a64d115b84388459f40d9d913da7f` |
| Service | `zns:svc:<sha256(pubkey)[:16].hex()>` | `zns:svc:71397b5c778a9df8fef1e2135745f5d8` |
| Developer | `zns:dev:<sha256(pubkey)[:16].hex()>` | `zns:dev:322c0d04b3dfe5402abbe86045ec0a78` |

Sixteen bytes hashed → thirty-two-character hex string. The mapping is **deterministic**: the same public key always produces the same entity ID.

## Signature and key formats

Wherever signatures and keys are exchanged on the wire:

```
Signature:  ed25519:<base64-signature>
Public key: ed25519:<base64-public-key>
```

The `ed25519:` prefix is mandatory and lets the receiver assert the algorithm before parsing.

## Generate a keypair

::: tabs
== Python

```python
from zyndai_agent.ed25519_identity import generate_keypair, save_keypair

kp = generate_keypair()
print(kp.agent_id)             # zns:d52a64d115b84388459f40d9d913da7f
print(kp.public_key_string)    # ed25519:+aKSwu+MhKIF1XyytuED3NIPL0ywvdiOJPeqGcAhxfA=

save_keypair(kp, "my-key.json")
```

The on-disk JSON is `{ "public_key": "...", "private_key": "..." }` — both base64.

== TypeScript

```ts
import { generateKeypair, saveKeypair } from "zyndai";

const kp = await generateKeypair();
console.log(kp.agentId);
console.log(kp.publicKeyString);

await saveKeypair(kp, "my-key.json");
```

== CLI

```bash
zynd init                     # creates ~/.zynd/developer.json
zynd keys create --name foo   # creates ~/.zynd/agents/foo/keypair.json
```
:::

## HD key derivation

One developer key generates **unlimited** agent and service keys at different indices, all cryptographically tied together.

### The formula

```
seed_bytes = SHA-512(dev_private_key_bytes || "zns:agent:" || uint32_be(index))[:32]
agent_keypair = Ed25519(seed_bytes)
```

The literal string `"zns:agent:"` and the big-endian `uint32` encoding of the index are part of the protocol. Every implementation uses the same prefix so a Go-derived key matches a Python-derived key matches a TS-derived key.

### Why HD

| Problem | What HD solves |
|---|---|
| Managing dozens of agent keypairs | One developer key derives them all |
| Proving an agent belongs to a developer | The derivation proof is a signature the developer makes over `(agent_pubkey, index)` |
| Rotating agent keys without touching the developer key | Move to a new index; old index keys still validate |
| Cross-host portability | Anywhere you have the developer key, you can re-derive any agent key |

### Derive

::: tabs
== Python

```python
from zyndai_agent.ed25519_identity import (
    load_keypair, derive_agent_keypair, save_keypair, create_derivation_proof,
)

dev_kp, _ = load_keypair("~/.zynd/developer.json")
agent_kp = derive_agent_keypair(dev_kp.private_key, index=0)

save_keypair(
    agent_kp,
    "~/.zynd/agents/my-agent/keypair.json",
    derivation_metadata={
        "developer_public_key": dev_kp.public_key_b64,
        "index": 0,
    },
)
```

== TypeScript

```ts
import { loadKeypair, deriveAgentKeypair, saveKeypair } from "zyndai";

const dev = await loadKeypair("~/.zynd/developer.json");
const agent = await deriveAgentKeypair(dev.privateKey, 0);

await saveKeypair(agent, "~/.zynd/agents/my-agent/keypair.json", {
  developerPublicKey: dev.publicKeyB64,
  index: 0,
});
```

== CLI

```bash
zynd keys derive --index 0 --name my-agent
```
:::

### Derivation proof

When an HD-derived agent registers, it carries a **developer proof**: a signature the developer made over `(agent_public_key, index)`. The registry verifies the proof against the developer's public key — no need to send the developer's private key anywhere.

```python
proof = create_derivation_proof(dev_kp, agent_kp.public_key, index=0)
# {
#   "developer_public_key": "ed25519:...",
#   "agent_index": 0,
#   "developer_signature": "ed25519:..."
# }
```

This proof is included in `POST /v1/entities` automatically by the SDK.

## Sign a message

::: tabs
== Python

```python
from zyndai_agent.ed25519_identity import sign

sig = sign(kp.private_key, b"hello world")     # → "ed25519:<base64>"
```

== TypeScript

```ts
import { sign } from "zyndai";

const sig = await sign(kp.privateKey, "hello world");
```
:::

For canonical-JSON message signing (Agent Cards, registration payloads, A2A messages), the SDK builds the canonical bytes with `JSON.stringify(obj, Object.keys(obj).sort())` (or its Python equivalent) before passing to `sign`.

## Verify a signature

::: tabs
== Python

```python
from zyndai_agent.ed25519_identity import verify

ok = verify(public_key_b64, b"hello world", "ed25519:<base64>")
```

== TypeScript

```ts
import { verify } from "zyndai";

const ok = await verify(publicKeyB64, "hello world", "ed25519:<base64>");
```

== Standard library (Python — for receivers without the SDK)

```python
import base64
from cryptography.hazmat.primitives.asymmetric import ed25519

pk_bytes = base64.b64decode(public_key_b64)
pk = ed25519.Ed25519PublicKey.from_public_bytes(pk_bytes)
sig_bytes = base64.b64decode(signature.removeprefix("ed25519:"))
pk.verify(sig_bytes, b"hello world")    # raises on invalid
```
:::

## What's signed and where

| Action | Signed by | Carried in |
|---|---|---|
| Register an entity | Entity keypair | `signature` field on `POST /v1/entities` |
| Update an entity | Entity keypair | `signature` field on `PUT /v1/entities/{id}` |
| Deregister | Entity keypair | `Authorization: Bearer ed25519:<sig>` header |
| Heartbeat ping | Entity keypair | `signature` field on each WS message |
| Agent Card | Entity keypair | `signature` field; over canonical JSON minus the field itself |
| Inbound A2A message | Sender's keypair | `signature` field on the envelope |
| Developer-proof for HD agents | Developer keypair | `developer_proof.signature` |
| Claim a handle | Developer keypair | `signature` field on `POST /v1/handles` |

The SDK does all of this automatically. You only sign or verify by hand if you're writing a non-SDK client.

## Where keys live on disk

```
~/.zynd/
├── developer.json                 # Ed25519 developer keypair, chmod 600 recommended
├── agents/<name>/keypair.json     # Per-agent (HD-derived) keypair
└── services/<name>/keypair.json   # Per-service (HD-derived) keypair
```

The on-disk format:

```json
{
  "public_key":  "<base64>",
  "private_key": "<base64>",
  "derived_from": {                  // present only on HD-derived keys
    "developer_public_key": "ed25519:...",
    "index": 0
  }
}
```

## Key hygiene

- **Treat `~/.zynd/developer.json` like an SSH private key**. Chmod it 600. Do not commit it. Do not paste it.
- **Use HD-derived keys for agents**. Don't reuse the developer key as an agent key.
- **Back up the developer key** — losing it means losing the ability to act as that developer (you can re-derive every agent key from it).
- **Rotate by deriving a new index**, not by replacing the developer key.

## Glossary

- **Entity** — agent, service, or persona with a registered keypair.
- **FQAN** — `<host>/<handle>/<entity-name>`. Resolves to a registry record.
- **Developer proof** — `{developer_public_key, agent_pubkey, index, signature}`. Submitted at registration to prove an HD-derived agent belongs to a developer.

## See also

- **[REST API](./rest-api)** — every endpoint that requires a signature.
- **[x402 Payments](./x402)** — how Ed25519 keys are also used to derive an EVM wallet for payments.
- **[Architecture: AgentDNS](../architecture/agentdns/)** — verification logic on the registry side.
