---
title: HD Key Derivation
description: Derive multiple agent keys from a single developer key.
---

# HD Key Derivation

HD stands for Hierarchical Deterministic. One developer key generates unlimited agent keys at different indices, all cryptographically tied together.

This lets you manage many agents with a single developer identity. No need to juggle dozens of keypair files.

## The Derivation Formula

The HD derivation algorithm is identical in Go (registry) and Python (SDK):

```
seed = SHA-512(dev_private_key || "zns:agent:" || uint32_be(index))[:32]
derived_seed → new Ed25519 keypair
```

Each index produces a deterministic, unique keypair. Same developer key + same index = same agent key, every time.

## Why HD Derivation Matters

Zynd uses HD derivation because it solves three problems:

| Problem | Solution |
|---|---|
| Managing dozens of agent keypairs | One developer key derives them all |
| Proving agent ownership | Derivation proof cryptographically links agent to developer |
| Avoiding key sprawl | No need to store separate keypairs — they're deterministic |

## Derive Agent Keys with the CLI

```bash
# Derive agent key at index 0
zynd keys derive --index 0

# Derive at index 1
zynd keys derive --index 1

# List all derived keys
zynd keys list
```

## Derive Agent Keys with the SDK

```python
from zyndai_agent.ed25519_identity import (
    load_keypair, derive_agent_keypair, save_keypair, create_derivation_proof
)

dev_kp = load_keypair("~/.zynd/developer.json")

agent_kp = derive_agent_keypair(dev_kp.private_key, index=0)

save_keypair(agent_kp, "agent-0.json", derivation_metadata={
    "developer_public_key": dev_kp.public_key_b64,
    "index": 0,
})
```

## Create a Derivation Proof

A derivation proof cryptographically links an agent key to its developer key. The registry uses this proof during registration.

```python
proof = create_derivation_proof(dev_kp, agent_kp.public_key, index=0)
# Returns:
# {
#     "developer_public_key": "ed25519:...",
#     "agent_index": 0,
#     "developer_signature": "ed25519:..."
# }
```

Submit this proof when you register your agent (POST `/v1/entities`). The registry and other nodes verify that your agent belongs to your developer account.

## Automatic HD Derivation During Setup

When you run `zynd agent init`, the CLI automates the entire HD flow:

1. Loads your developer key from `~/.zynd/developer.json`
2. Finds the next available index
3. Derives the agent keypair at that index
4. Saves it to `~/.zynd/agents/<name>/keypair.json`
5. Stores derivation metadata in the keypair file

You don't write any derivation code yourself. It just works.

::: tip
Use HD derivation to deploy multiple agent instances (dev, staging, prod) from one developer identity.
:::

::: warning
Keep your developer private key secure. Anyone with it can derive all your agent keys.
:::
