---
title: Storage Schema
description: Every PostgreSQL table the agentdns binary writes to.
---

# Storage Schema

**Source:** `internal/store/store.go`, `internal/store/postgres.go`

The store is a PostgreSQL-backed persistence layer (~60 methods on the `Store` interface). All long-lived state — local registrations, gossip entries, developers, ZNS bindings, attestations, tombstones — lives here. Redis is only for caches and rate limit counters.

## Connection pool

Uses `pgxpool` with:

- Max connections: 20
- Min idle: 2
- Max connection lifetime: 30 minutes
- Max idle time: 5 minutes

Tune via `[registry]` config if you're running on a beefy box or behind PgBouncer.

## `agents` — locally registered agents

The agents that registered against *this* node directly.

```sql
agent_id        TEXT PRIMARY KEY        -- agdns:<hash>
name            TEXT NOT NULL
owner           TEXT NOT NULL
agent_url       TEXT NOT NULL           -- where to fetch the Agent Card
category        TEXT
tags            JSONB                   -- ["python", "security"]
summary         TEXT                    -- max 200 chars
public_key      TEXT NOT NULL           -- ed25519:<base64>
home_registry   TEXT
registered_at   TIMESTAMPTZ
updated_at      TIMESTAMPTZ
ttl             INTEGER                 -- seconds
signature       TEXT
status          TEXT DEFAULT 'active'   -- active | inactive
last_heartbeat  TIMESTAMPTZ
developer_id    TEXT                    -- agdns:dev:<hash>
entity_index    INTEGER                 -- HD derivation index
developer_proof JSONB                   -- derivation proof
codebase_hash   TEXT                    -- SHA-256 of agent source (optional)
```

Indexes: `category`, `name`, `owner`, `updated_at DESC`, `tags` (GIN), `developer_id`, `status`.

## `gossip_entries` — remote agents learned via gossip

Same schema as `agents`, plus three extra columns:

- `received_at` — when the gossip arrived.
- `tombstoned`, `tombstone_at` — soft-delete markers, GC'd hourly.
- `origin_public_key` — pinned on first registration to prevent takeover (see [key pinning](/registry/trust-verification#origin-authorization-key-pinning)).

## `developers`

```sql
developer_id          TEXT PRIMARY KEY
name                  TEXT
public_key            TEXT UNIQUE
profile_url           TEXT
github                TEXT
home_registry         TEXT
dev_handle            TEXT              -- ZNS handle (e.g. "acme-corp")
dev_handle_verified   BOOLEAN
verification_method   TEXT              -- "dns" | "github"
verification_proof    TEXT              -- domain or username
```

In `onboarding_mode = open`, rows are created implicitly on first handle claim or entity registration. In `restricted` mode, `POST /v1/developers` is required and gated by webhook auth.

## `zns_names` — FQAN → agent mappings

```sql
fqan              TEXT PRIMARY KEY      -- "dns01.zynd.ai/acme-corp/doc-translator"
entity_name       TEXT
developer_handle  TEXT
registry_host     TEXT
agent_id          TEXT REFERENCES agents(agent_id)
developer_id      TEXT
current_version   TEXT
capability_tags   TEXT[]
```

## `zns_versions` — version history per FQAN

```sql
fqan         TEXT     -- composite PK
version      TEXT     -- composite PK
agent_id     TEXT
build_hash   TEXT
```

Used for canary releases and rollbacks. See [ZNS — Name Versioning](/registry/zns#name-versioning).

## Other tables

| Table | Purpose |
|-------|---------|
| `tombstones` | Deletion markers with TTL — garbage-collected hourly. Honored across the mesh for the duration of their TTL. |
| `attestations` | Reputation observations from peer registries (input to EigenTrust). |
| `registry_identity_proofs` | Cached `/.well-known/zynd-registry.json` documents from peers. |
| `peer_attestations` | Co-signed verification records used to compute mesh-verified tier. |
| `gossip_developers` | Remote developer records learned via gossip. |
| `gossip_zns_names` | Remote ZNS bindings learned via gossip. |

## Why two tables for agents (and dev / ZNS)?

Local writes have stronger guarantees than gossip — they're signed by clients we just authenticated, indexed for our own search, and "owned" by this node for republish. Splitting `agents` from `gossip_entries` (and similarly for developers / ZNS names) lets us:

- Apply different indexing strategies (the local table has more aggressive indexes).
- Prefer local hits before falling back to gossip in `GET /v1/entities/{id}` lookups.
- Re-broadcast our own records on republish without accidentally re-broadcasting gossip from elsewhere.

## Lookup precedence

`GET /v1/entities/{id}` runs three tiers in order:

1. `agents` table (local).
2. `gossip_entries` table (learned via gossip).
3. DHT lookup over the mesh (if `[dht].enabled`).

The first hit wins. The same precedence applies to developers and ZNS names.

## Migrations

Schema lives in `scripts/init-db.sql` (Docker entrypoint runs it on first boot) and idempotent migrations are applied at startup by the store package. Run `agentdns init` against a fresh Postgres database for a clean slate.

## Next

- **[Gossip Mesh](/agentdns/gossip-mesh)** — how `gossip_entries`, `gossip_developers`, and `gossip_zns_names` get populated.
- **[DHT](/agentdns/dht)** — third-tier lookups when neither table has the record.
