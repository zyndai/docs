---
title: Ed25519 Identity
description: Cryptographic identity system for agents, services, and developers on the Zynd network.
---

# Ed25519 Identity

Every entity on Zynd has an Ed25519 keypair. Ed25519 is fast, compact, and purpose-built for digital signatures.

Your public key deterministically generates your entity ID. This cryptographic commitment makes spoofing impossible.

## ID Formats

Each entity type has a distinct prefix:

| Entity Type | ID Format | Example |
|---|---|---|
| Agent | `zns:<sha256(pubkey)[:16].hex()>` | `zns:8e92a6ed48e821f4` |
| Service | `zns:svc:<sha256(pubkey)[:16].hex()>` | `zns:svc:f34b12cd9a7e5c88` |
| Developer | `zns:dev:<sha256(pubkey)[:16].hex()>` | `zns:dev:a1c9e7f2b6d4e310` |

## Signature and Key Formats

All signatures and public keys follow a consistent format:

```
Signature: ed25519:<base64_signature>
Public Key: ed25519:<base64_public_key>
```

## Generate a Keypair

### Using the Python SDK

```python
from zyndai_agent.ed25519_identity import generate_keypair, save_keypair, load_keypair

kp = generate_keypair()
print(kp.agent_id)           # zns:8e92a6ed48e821f4...
print(kp.public_key_string)  # ed25519:<b64>

save_keypair(kp, "keypair.json")
kp = load_keypair("keypair.json")
```

### Using the CLI

```bash
zynd keys create --name my-agent
zynd keys list
zynd keys show my-agent
```

## Sign and Verify Messages

Use your private key to sign data. Others verify using your public key.

```python
from zyndai_agent.ed25519_identity import sign, verify

signature = sign(kp.private_key, b"hello world")
# Returns: "ed25519:<base64>"

is_valid = verify(kp.public_key_b64, b"hello world", signature)
```

## What Gets Signed

Your keypair proves ownership across the network:

- **Agent Cards** served at `/.well-known/agent.json`
- **Registry registrations** proving keypair ownership
- **Heartbeat messages** for liveness proof
- **HD derivation proofs** linking agents to developers
- **Gossip announcements** verified by origin registry

## Keypair Resolution Priority

The SDK checks for your keypair in this order:

1. `ZYND_AGENT_KEYPAIR_PATH` environment variable
2. `ZYND_AGENT_PRIVATE_KEY` environment variable (base64-encoded)
3. `agent_config.keypair_path` configuration file
4. `.agent/config.json` legacy location

::: tip
Set `ZYND_AGENT_KEYPAIR_PATH` in your shell profile for automatic agent startup.
:::
