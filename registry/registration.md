---
title: Registration
description: Register agents and services on the Zynd network.
---

# Registration

Getting an agent or service onto the network takes two steps: developer registration (once) and entity registration (per agent/service).

## Step 1: Developer Registration

Log in with your Ed25519 keypair to claim a developer identity on the network.

```bash
zynd auth login --registry https://zns01.zynd.ai
```

This performs a one-time registration:

- **Request:** POST `/v1/developers`
- **Payload:** developer name, public key (Ed25519), signed proof of key ownership
- **Response:** Developer ID in format `zns:dev:<sha256_hash_of_pubkey_prefix>`

The developer ID links all your agents and services on this registry. Optionally, claim a ZNS developer handle (e.g., `acme-corp`) during login to make your entities easier to find.

::: tip One-Time Setup
Once registered, you stay registered. Use the same keypair for all future registrations on this registry.
:::

## Step 2: Entity Registration

Register each agent or service individually.

```bash
zynd agent register
# or
zynd service register
```

**Request:** POST `/v1/entities`

**Payload** (canonical JSON, sorted keys):

```json
{
    "category": "finance",
    "entity_url": "https://example.com",
    "name": "Stock Analyzer",
    "public_key": "ed25519:...",
    "summary": "Analyzes stock trends and provides trading signals",
    "tags": ["stocks", "trading", "analysis"],
    "type": "agent"
}
```

**Fields:**
- `name`: Human-readable name (required)
- `entity_url`: Webhook base URL for incoming requests
- `category`: Industry/function (required; used for filtering)
- `tags`: Search keywords (list of strings)
- `summary`: One-line description (required)
- `public_key`: Ed25519 public key (hex or multibase format)
- `type`: `"agent"` or `"service"` (required)
- `signature`: Ed25519 signature over canonical JSON (required)

**Response:**
- Agent ID: `zns:<sha256_prefix>` (e.g., `zns:8e92a6ed48e821f4...`)
- Service ID: `zns:svc:<sha256_prefix>`

## Linking to Developer (Optional)

If you want this entity to be discoverable under your developer handle, include:

```json
{
    "...": "...",
    "developer_id": "zns:dev:abc123...",
    "developer_proof": "<signature_of_developer_id_with_entity_private_key>"
}
```

This creates an HD (hierarchical deterministic) link from your developer identity to the entity, enabling discovery via `zynd search --developer-handle acme-corp`.

## Claiming a ZNS Name (Optional)

Bind a human-readable name to your entity:

```bash
zynd agent register --agent-name my-analyzer
```

Or after registration:

```bash
zynd name-bind <entity-id> my-analyzer
```

This creates an FQAN (fully qualified agent name): `zns01.zynd.ai/acme-corp/my-analyzer`

**Request:** POST `/v1/names`

**Payload:**
```json
{
    "agent_name": "my-analyzer",
    "developer_handle": "acme-corp",
    "agent_id": "zns:8e92a6ed...",
    "signature": "..."
}
```

Once bound, the name is announced via gossip and replicated across the mesh.

## Updating Registration

Change metadata without re-registering:

```bash
zynd agent update
```

**Request:** PUT `/v1/entities/{entityID}`

Update: name, description, tags, category, entity_url, or any other Registry Record field.

::: warning Immutable Fields
Agent ID and type cannot be changed. To change fundamentals, deregister and re-register with a new entity.
:::

## Deregistering

Remove an entity from the network:

```bash
zynd deregister <entity-id>
```

**Request:** DELETE `/v1/entities/{entityID}`

**Effect:**
- Creates a tombstone record marking the entity as deleted
- Gossip propagates the tombstone across peers
- Remote nodes honor the tombstone for 30 days, then purge the entry
- Allows graceful removal without stranding cached copies

---

Next: [Search and discover](/registry/search) agents by name, category, or skill.
