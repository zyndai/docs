---
title: DHT (Kademlia)
description: Decentralized agent lookups when gossip and local store come up empty.
---

# DHT (Kademlia)

**Source:** `internal/dht/`

The DHT is the third discovery layer. Local store and gossip cover most lookups, but the DHT is what saves you when:

- A peer just came online and gossip hasn't propagated all entries to it yet.
- A network partition split the mesh into islands that need to find each other's records.
- You need to look up a specific `agent_id` and full-mesh gossip would be overkill.

## Design

| Property | Value |
|----------|-------|
| Node ID | 256-bit (32 bytes), `SHA-256(public_key)` |
| Distance metric | XOR |
| Routing table | 256 k-buckets — one per bit |
| Bucket size (K) | 20 |
| Lookup concurrency (α) | 3 |

## Operations

| Operation | Description |
|-----------|-------------|
| `Ping` | Check liveness, add the peer to the routing table on response. |
| `Store` | Store an agent record at the K closest nodes to its key. |
| `FindValue` | Look up an agent by key (local first, then network). |
| `FindNode` | Find the K closest nodes to a target ID. |

## Iterative lookup

Standard Kademlia:

1. Select the α closest known nodes to the target.
2. Query them in parallel.
3. If any return closer nodes, query those next.
4. Repeat until no closer nodes are found, or K closest are identified.
5. For `FindValue`, return the value as soon as any node has it; cache it locally for next time.

## Background loops

| Loop | Interval | Purpose |
|------|----------|---------|
| Republish | 1 hour | Re-stores all locally-owned records at the K closest nodes — keeps records alive in the DHT even as nodes churn. |
| Expire | 10 minutes | Removes records older than 24 hours so dead entries fade out. |

A record will sit in the DHT for at most 24 hours after the last republish from its origin.

## Mesh transport adapter

`internal/dht/mesh_adapter.go` bridges DHT messages to the existing mesh transport. DHT messages serialize to JSON and travel over the same TCP+TLS connections used for gossip — there's no second listener and no second port. The wire frame is just a `MsgDHT` envelope.

## When the DHT runs

`GET /v1/entities/{id}` resolves in this order:

1. `agents` table (local).
2. `gossip_entries` table.
3. DHT lookup (only if `[dht].enabled = true`).

If all three miss, you get a `404`. The DHT is opt-in because for small meshes (<5 peers) gossip alone reaches every node within seconds and the DHT just adds latency.

## Tuning

```toml
[dht]
enabled = true
k = 20
alpha = 3
republish_interval_seconds = 3600
expiry_seconds = 86400
```

For very large meshes (hundreds of registries), bump `k` to 30 and `alpha` to 5 to widen lookup parallelism. For small private meshes, you can set `enabled = false` and rely on gossip.

## Next

- **[Agent Cards & Caching](/agentdns/cards-cache)** — once you have an `agent_id`, this is what fetches its live card.
- **[Mesh Network](/registry/mesh)** — the user-facing perspective on the same protocol.
