---
title: "Registry Spec"
description: "The protocol every Zynd registry node implements — mesh, gossip, DHT, search ranking, ZNS, trust, two-tier metadata."
---

# Registry Spec

The Zynd registry is **a federated P2P mesh of nodes**, not a single server. Each node maintains a local database, gossips updates, runs a Kademlia DHT, exchanges bloom filters for query routing, and serves a `/v1/...` REST API.

This page is the protocol spec — implementation-agnostic. For the canonical Go binary that implements it, see **[AgentDNS](../agentdns/)**.

## High-level shape

```mermaid
graph TB
    A1["Agent A<br/>zns:8e92..."] -->|heartbeat WSS| R1["Registry Node<br/>zns01.zynd.ai"]
    A2["Agent B<br/>zns:3f47..."] -->|heartbeat WSS| R1
    S1["Service S<br/>zns:svc:a1b2..."] -->|heartbeat WSS| R1

    Boot["Bootnode<br/>zns-boot.zynd.ai<br/>(ghost registry)"]
    R1 -->|bootstrap peers| Boot
    R2["Peer Node"] -->|bootstrap peers| Boot
    R3["Peer Node"] -->|bootstrap peers| Boot

    R1 <-->|TCP+TLS gossip + DHT| R2
    R1 <-->|TCP+TLS gossip + DHT| R3
    R2 <-->|TCP+TLS gossip + DHT| R3

    Client[Client / Search] -.->|HTTPS| R1

    R1 -->|PostgreSQL| DB1["agents<br/>developers<br/>gossip_entries<br/>zns_names"]
    R1 -->|Redis (optional)| C1["agent cards<br/>rate limits<br/>bloom filters"]

    style Boot fill:#ffe0b2
    style R1 fill:#fff3e0
```

The bootnode at `zns-boot.zynd.ai` does **not** accept public agent writes — it exists only to bootstrap new peers into the mesh. New nodes dial it on startup, exchange peer lists, then mesh directly with everyone else.

## Storage model — every node holds three things

| Tier | Backend | Holds |
|---|---|---|
| Persistent | PostgreSQL | Agent + service records (500–800 B each), developer profiles, ZNS handle claims, gossip entries (replication log), search indexes |
| Cached (optional) | Redis | Tag/category indexes, Agent Card cache (1-hour TTL), bloom filters for peer routing |
| Local | In-process | BM25 full-text index + vector embeddings |

Redis is optional — without it the node still works, just slower.

## Two-tier metadata

The protocol separates **stable** registry metadata from **dynamic** card metadata.

### Registry Record

Stored on every node in the mesh.

| | |
|---|---|
| Size | 500–800 B |
| Mutability | Rarely changes |
| Replication | Gossip protocol |
| TTL | Indefinite (until deregistered) |

Fields: `entity_id`, `name`, `category`, `tags`, `summary`, `public_key`, `signature`, `entity_url`, `developer_id`, `developer_proof`, `created_at`, `last_heartbeat`, `status`.

### Agent Card

Hosted by the entity itself at `/.well-known/agent-card.json`.

| | |
|---|---|
| Size | 2–10 KB |
| Mutability | Updates often |
| Replication | Fetched on demand by registries |
| TTL | 1 hour cache |

Holds the live capabilities, pricing, endpoints, public key, signature, status, and JSON schemas.

### Why two tiers?

- Records propagate slowly across the mesh (gossip) but are replicated for resilience.
- Cards are fetched fresh by any node that needs current data.

This balances decentralisation (everyone knows about every entity) with responsiveness (current pricing and online status come from the source).

## Gossip protocol

Announcements hop across peers to reach the entire network without central coordination.

### Propagation

- An announcement originates at one node (e.g., a developer registers an agent).
- Signed by the origin registry's private key.
- Hops up to **10 times** across peers.
- Deduplicated in a **5-minute window** — any node that has seen the same `(announcement_id, hop_count)` recently drops the duplicate.
- Rate-limited to **100 announcements/sec/peer** to prevent flooding.

### Verification

- Every announcement is signature-checked against the origin registry's public key.
- Origin public-key pinning prevents spoofing.
- Invalid signatures are dropped silently.

### Announcement types

| Type | Payload |
|---|---|
| `agent_announce` | New agent registered |
| `service_announce` | New service registered |
| `agent_status` | Active → inactive transition |
| `dev_handle` | Developer claimed a ZNS handle |
| `name_binding` | Entity claimed a ZNS name |
| `tombstone` | Entity deregistered (suppresses re-propagation of its record) |
| `registry_proof` | Proof of registry quorum agreement |
| `peer_attestation` | Peer reputation signal (used by EigenTrust) |

## Decentralised lookup — Kademlia DHT

Beyond gossip reach, peers can use a Kademlia DHT for direct lookups. Useful when a peer is offline or the network is partitioned.

### Operations

| Op | What it does |
|---|---|
| `STORE` | Publish `entity_id → node` mapping |
| `FIND_VALUE` | Retrieve entity metadata |
| `FIND_NODE` | Locate peers |
| `PING` | Check peer liveness |

### Parameters

- **k = 20** (bucket size — keep the K closest nodes).
- **α = 3** (concurrent lookups).
- **Republish** every 1 hour for owned records.
- **Expiry** at 24 hours for stored values.

## Smart query routing — bloom filters

When a search query arrives, *which* peers should receive it? Bloom filters answer.

### How

- Each peer maintains a bloom filter of its agents' tags and categories.
- Peers exchange filters during heartbeats.
- When a query arrives, the receiving node checks which peers' filters match the query terms.
- The query is routed only to peers whose filters match.

Federated search doesn't flood the network — queries go to nodes most likely to have matching agents.

## Search & ranking

### Pipeline

1. **Local keyword (BM25)** — full-text index on name, description, tags, category.
2. **Local semantic** — vector embeddings; cosine similarity to the query.
3. **Federated** — query routed to peer registries via bloom filters (1.5 s timeout per peer).
4. **Dedup + rank** — merge results, score by multiple signals, sort.
5. **Enrich (optional)** — fetch live Agent Cards for top results.

### Ranking formula

```
score = 0.30 × text_relevance
      + 0.30 × semantic_similarity
      + 0.20 × trust_score
      + 0.10 × freshness
      + 0.10 × availability
```

Or Reciprocal Rank Fusion (RRF) as an alternative for operators who prefer not to tune weights.

### Per-field BM25 boosts

| Field | Weight |
|---|---|
| `name` | 3.0 |
| `tags` | 2.0 |
| `category` | 1.5 |
| `summary` | 1.0 |

Tokenisation: split on non-alphanumeric → stopword removal → Porter stemmer → synonym expansion. Quoted phrases get a +5.0 exact-match bonus.

## Embedding backends (operator-pluggable)

| Backend | Quality | Notes |
|---|---|---|
| Hash | basic | FNV-64a feature hashing; zero ML deps; fine for tiny meshes / CI |
| ONNX | best | In-process transformer (`bge-small-en-v1.5` is the default) |
| HTTP | varies | OpenAI- or Ollama-compatible endpoint; degrades gracefully |

Vectors are L2-normalised on insert, so cosine similarity is a single dot product. Brute-force scan is O(n) — fine up to ~100K entities per node; beyond that swap in an ANN index.

## ZNS (Zynd Naming Service)

The naming layer over entity IDs.

| Concept | Format | Example |
|---|---|---|
| Developer handle | `[a-z0-9-]{3,32}` | `alice` |
| Entity name | `[a-z0-9-]+` (unique within a handle) | `stock-analyzer` |
| FQAN | `<host>/<handle>/<entity-name>` | `zns01.zynd.ai/alice/stock-analyzer` |

A FQAN resolves to a Registry Record + (optionally) a live Agent Card. Handle and name bindings are versioned — `GET /v1/names/{handle}/{name}/versions` returns the full history.

### Verification

- Handles can be verified via DNS TXT or GitHub (`POST /v1/handles/{handle}/verify`).
- A verified handle gets `verified: true` and a `verification_method` field on the developer record.

## Trust — EigenTrust

Reputation is computed via a transitive trust algorithm.

- Peer attestations fuel global trust scores.
- Trust attenuates across hops (a peer's recommendation is worth less than direct experience).
- Used as one of the five ranking signals (weight 0.20).

## Registry identity proof

Every registry node serves `/.well-known/zynd-registry.json` — a signed proof binding the domain to:

- A TLS SPKI fingerprint
- An Ed25519 public key
- A registry ID

```json
{
  "domain": "zns01.zynd.ai",
  "registry_id": "zns:registry:a1b2c3d4...",
  "ed25519_public_key": "ed25519:gKH4...",
  "tls_spki_fingerprint": "sha256:b4de3a9f...",
  "signature": "ed25519:Pfix+qwQ..."
}
```

Clients and peers fetch this once during the verification handshake. It prevents domain takeover from compromising the entire mesh.

## Node roles

| Role | What it is |
|---|---|
| **Full node** | Complete PostgreSQL replica; maintains all gossip entries; participates in DHT and mesh consensus. The default. |
| **Light node** | Caches popular entities; syncs gossip selectively; reduced storage footprint. Edge deployments. |
| **Gateway** | Public HTTP endpoint that routes queries to full/light nodes; no persistent state. Useful for stateless horizontal scaling. |
| **Bootnode** | Seed for new peers. Accepts gossip but rejects public writes. `zns-boot.zynd.ai` plays this role. |

## Endpoints overview

The protocol is exposed over HTTPS on `/v1/*` plus two WebSocket endpoints. The full surface is in **[REST API](../../reference/rest-api)**. Categories:

- Health & node info
- Entities (CRUD)
- Search & discovery
- Resolution
- Developers
- Handles (ZNS — developer namespace)
- Names (ZNS — entity bindings)
- Network (peers, stats, status)
- Heartbeat (WSS)
- Live activity stream (WSS)
- Admin (restricted-mode only)

## See also

- **[AgentDNS Implementation](../agentdns/)** — the Go binary implementing this spec.
- **[REST API](../../reference/rest-api)** — every endpoint with request/response shapes.
- **[Run a Registry Node](../../operate/run-registry-node)** — operator's guide.
