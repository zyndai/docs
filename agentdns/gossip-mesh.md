---
title: Gossip Mesh
description: Transport, gossip protocol, peer manager, bootstrap, bloom filters, and federated search.
---

# Gossip Mesh

**Source:** `internal/mesh/`

The mesh is a peer-to-peer overlay that propagates registrations, updates, status changes, and ZNS bindings between registry nodes. It uses a length-prefixed JSON wire protocol over TCP+TLS, and runs a heartbeat / bloom-filter exchange every 30 s.

## Transport

`internal/mesh/transport.go` runs a TCP listener on the configured `[mesh].listen_port` (default 4001). Connections use TLS derived from each node's Ed25519 key.

**Wire format:**

```
[4 bytes big-endian length][JSON payload]
```

- Max message size: 1 MB
- Write timeout: 10 s
- Read timeout: 90 s (3× heartbeat interval)

**Message types:**

| Type | Purpose |
|------|---------|
| `MsgHello` | Initial handshake — registry ID, public key, version, agent count. |
| `MsgHeartbeat` | Liveness + bloom filter exchange + peer addresses. |
| `MsgGossip` | Signed announcement (see below). |
| `MsgSearch` | Federated search request. |
| `MsgSearchAck` | Federated search response. |
| `MsgDHT` | Kademlia messages. |

The handshake is two `HELLO` messages. Self-connections and duplicates are rejected.

## Gossip protocol

`internal/mesh/gossip.go` implements signed, hop-counted, deduplicated gossip.

### Announcement types

| Type | Triggered by |
|------|--------------|
| `agent_announce` | Agent registration / update / deregister. |
| `developer_announce` | Developer identity registration. |
| `dev_handle` | Handle claim and verification. |
| `name_binding` | ZNS FQAN registration. |
| `registry_proof` | Registry identity proof publication. |
| `peer_attestation` | Peer-to-peer verification record. |

### Incoming pipeline

When a peer delivers an announcement:

1. **Deduplication** — `(type + ID + timestamp)` checked against a 300 s seen-set; duplicates dropped.
2. **Signature verification** — Ed25519 signature checked against the sender's public key.
3. **Origin authorization** — for updates / deregisters / status changes, the sender's `OriginPublicKey` must match the key pinned on first registration. Backwards-compatible with pre-pinning entries.
4. **Hop check** — drop if `HopCount >= MaxHops` (default 10).
5. **Store** — upsert into the right `gossip_*` table.
6. **Index** — fire the search engine indexing callback.
7. **Forward** — increment hop count, broadcast to all peers except the sender.

### Origin key pinning

The first `agent_announce` for an `agent_id` writes `OriginPublicKey` into `gossip_entries`. Every subsequent `update` / `deregister` / `agent_status` message for that ID must come from the same key — otherwise it's silently dropped. This prevents a malicious registry from stealing another registry's agents by reusing their `agent_id`.

Pre-pinning entries (records that pre-date this protection) accept any key as a one-time backwards-compatibility shim.

## Peer manager

`internal/mesh/peers.go` tracks connected peers in a `PeerInfo` struct (registry ID, name, address, agent count, last seen, bloom filter).

- `[mesh].max_peers` (default 15) caps the connection set. When exceeded, the peer with the oldest `last_seen` is evicted.
- **Smart peer selection** for federated search: peers are scored by the number of bloom-filter matches against the query's tokens, so the top N most-likely-to-have-results peers are queried first.

## Bootstrap & reconnect

`internal/mesh/bootstrap.go`:

- On startup, dial each `[mesh].bootstrap_peers` entry with exponential backoff (1 s → 60 s cap, unlimited retries).
- A reconnect loop runs every 30 s and re-establishes connections to any disconnected bootstrap peer.

This is what `zns-boot.zynd.ai` exists for — every fresh node lists it as a bootstrap peer to find its first hop into the mesh, then learns about other peers through gossip and `MsgHeartbeat`.

## Heartbeat & peer exchange

Every 30 s, each node broadcasts a `MsgHeartbeat` containing:

- Registry ID and current agent count.
- Serialized local bloom filter.
- A list of known peer addresses (drives **peer exchange** — new nodes get discovered without ever needing the bootnode again).

Peers update their `PeerInfo.last_seen` on receipt and refresh the bloom filter snapshot they hold for that peer.

## Bloom filters

`internal/mesh/bloom.go` is a probabilistic data structure for routing queries to the right peers.

- Sized for the expected token count with a configurable false-positive rate (default 1%).
- Double hashing — FNV-1a + FNV-1 — for index computation.
- Tokens: agent names, categories, tags, summaries.
- Rebuilt every 5 minutes from all local + gossip agents.

Each peer stores the bloom filters of every other connected peer. When a search arrives, `MatchCount(query_tokens, peer_bloom)` is computed and the peers with the highest scores are picked first for federated fan-out. In a mesh of dozens of peers this typically eliminates 80–95% of fan-out.

## Federated search

`internal/mesh/federated.go` is invoked when a `POST /v1/search` request has `federated: true`:

1. Tokenize the query (keywords + category + tags).
2. Score every connected peer by bloom-filter match count.
3. Pick the top N (default 10).
4. Concurrently fan out `MsgSearch` to each, with `TTL=1` so they don't recurse.
5. Collect responses with a 1.5 s timeout.
6. Merge into the local result set.

Peers receiving a federated search execute it as a **local-only** search (`Federated=false`) — that's what stops infinite forwarding loops.

## Diagrams

### Gossip propagation

```
Local event (registration, update, heartbeat)
         │
         ▼
    CreateAnnouncement() — sign with registry key
         │
         ▼
    BroadcastAnnouncement() — send to all connected peers
         │
    ════════════════════════════════════════════════
         │              │              │
    Peer A          Peer B          Peer C
         │              │              │
         ▼              ▼              ▼
    HandleAnnouncement():
    1. Dedup check
    2. Verify signature
    3. Verify origin key pin
    4. Hop count < max_hops
    5. Upsert into gossip_*
    6. Trigger search indexing
    7. Increment hop, forward
```

### Federated search fan-out

```
POST /v1/search { query, federated: true }
         │
         ▼
   Local search (BM25 + semantic + gossip)
         │
         ▼
   Score peers by bloom MatchCount
         │
         ▼
   ┌──────┬──────┬──────┐
   │ Peer │ Peer │ Peer │   ← top 10, in parallel
   │  1   │  2   │  3   │     each runs local-only
   └──┬───┴──┬───┴──┬───┘
      │      │      │
      ▼      ▼      ▼
   Collected within 1.5 s
         │
         ▼
   Merge → dedup → rank → enrich top 10 → return
```

## Next

- **[Search Engine](/agentdns/search-engine)** — what runs locally inside each node when it receives a search.
- **[DHT](/agentdns/dht)** — the second discovery layer for when gossip hasn't reached every peer yet.
