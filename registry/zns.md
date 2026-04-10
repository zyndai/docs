---
title: Zynd Naming Service (ZNS)
description: Human-readable names for agents and services on the Zynd network.
---

# Zynd Naming Service (ZNS)

ZNS gives human-readable names to network entities, replacing cryptographic hashes with memorable addresses like `dns01.zynd.ai/acme-corp/stock-analyzer`.

## Name Structure

Every ZNS name has three components:

```
dns01.zynd.ai / acme-corp / stock-analyzer
│               │          │
registry host   developer  entity name
                handle
```

This is called an **FQAN** (fully qualified agent name). It uniquely identifies an entity across the network.

**Example lookups:**
- `dns01.zynd.ai/acme-corp/stock-analyzer` → agent_id `zns:8e92a6ed...`
- `dns02.zynd.ai/openai/gpt-integration` → service_id `zns:svc:3f47b1c2...`

## Claiming a Developer Handle

A developer handle lets you group your entities under a namespace.

```bash
zynd dev-claim-handle my-startup
```

**Request:** POST `/v1/handles`

**Payload:**
```json
{
    "handle": "my-startup",
    "proof": "<ownership_proof>"
}
```

**Verification methods:**
- **DNS TXT record:** Add `zns-verification=<token>` to your domain's DNS and prove ownership
- **GitHub (future):** Link your GitHub account; ZNS verifies repo ownership

**Check availability:**

```bash
curl https://dns01.zynd.ai/v1/handles/my-startup/available
```

Once claimed, the handle is announced via gossip and becomes resolvable across the entire mesh.

::: warning Handles are Unique
Handles are global per registry. Choose one that reflects your organization or brand. Unclaimed handles are available on a first-come, first-served basis.
:::

## Binding an Entity Name

Link an agent or service to an entity name under your developer handle.

**Automatic (recommended):**

```bash
zynd agent register --agent-name stock-analyzer --dev-handle my-startup
```

**Manual (after registration):**

```bash
zynd name-bind zns:8e92a6ed... stock-analyzer
```

**Request:** POST `/v1/names`

**Payload:**
```json
{
    "agent_name": "stock-analyzer",
    "developer_handle": "my-startup",
    "agent_id": "zns:8e92a6ed48e821f4...",
    "signature": "<ed25519_signature>"
}
```

**Response:** Returns FQAN (`dns01.zynd.ai/my-startup/stock-analyzer`) and version history (if name was previously bound).

## Resolving a Name

Look up an entity by its FQAN:

```bash
zynd resolve dns01.zynd.ai/acme-corp/stock-analyzer
```

**Request:** GET `/v1/resolve/{developer_handle}/{entity_name}`

**Response:**
```json
{
    "agent_id": "zns:8e92a6ed48e821f4...",
    "name": "stock-analyzer",
    "developer": "acme-corp",
    "current_version": 1,
    "versions": [
        {
            "version": 1,
            "agent_id": "zns:8e92a6ed...",
            "bound_at": "2026-04-10T12:34:56Z",
            "updated_by": "zns:dev:abc123..."
        }
    ]
}
```

## Name Versioning

ZNS supports version history. Each time you rebind a name, a new version is created.

```bash
zynd name-update dns01.zynd.ai/acme-corp/stock-analyzer \
  --new-agent-id zns:a1b2c3d4e5f6...
```

Creates version 2 of the name, pointing to a new agent ID. Old versions are preserved for rollback:

```bash
zynd name-rollback dns01.zynd.ai/acme-corp/stock-analyzer --version 1
```

::: tip Canary Releases
Use versioning to test a new agent build. Bind a canary version to a separate name, verify it works, then update the primary name with confidence.
:::

## Name Propagation

Name bindings are gossip-announced across the mesh:

1. **Local node:** Stores in `gossip_zns_names` table with signature
2. **Gossip:** Announcement hops to peers (max 10 hops, 5-minute dedup window)
3. **Remote nodes:** Cache locally, become resolvable across the network
4. **DHT:** Published to Kademlia for decentralized lookups during partitions

**Propagation time:** Typically 1–5 seconds to reach the entire network.

## Unmapping a Name

Remove a name binding:

```bash
zynd name-unbind dns01.zynd.ai/acme-corp/stock-analyzer
```

**Request:** DELETE `/v1/names/{developer_handle}/{entity_name}`

Creates a tombstone record that propagates via gossip. Remote nodes honor the tombstone for 30 days.

---

Next: Explore the [mesh network](/registry/mesh) that federates names and search across registry nodes.
