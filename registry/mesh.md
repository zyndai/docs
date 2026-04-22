---
title: Mesh Network
description: How registry nodes connect, gossip, and federate search across the Zynd network.
---

# Mesh Network

The Zynd registry is a federated mesh — a set of autonomous nodes that gossip state to each other and collaborate on search without a central authority. This page covers how nodes join the mesh, propagate announcements, and route queries.

## The bootnode

Every mesh needs a starting point. On Zynd that's `zns-boot.zynd.ai` — a **ghost registry** node.

What makes it a ghost:

- It runs the same `agentdns` binary as every other node.
- It accepts **TCP peer connections** and exchanges peer lists.
- It does **NOT** accept public HTTPS entity writes — no `POST /v1/entities` from untrusted clients.
- It holds no public agent records. Its only job is to tell new nodes who else is in the mesh.

Why have one at all? New nodes need to find peers somehow. A hardcoded bootnode gives them a first hop into the mesh. After that they learn about other peers directly and the bootnode becomes unnecessary.

## Joining the mesh

```toml
# config.toml on your new node
[mesh]
listen_port = 4001
bootstrap_peers = ["zns-boot.zynd.ai:4001", "zns01.zynd.ai:4001"]
max_peers = 15
tls_enabled = true
```

On startup:

1. Dial each bootstrap peer over TCP.
2. TLS handshake (self-signed Ed25519 cert verified via application-layer HELLO).
3. Exchange HELLO messages — `{node_id, public_key, version, capabilities}`.
4. Request peer list from bootnode.
5. Dial up to `max_peers - 1` of the listed peers.
6. Start heartbeat + gossip loops.

Once connected you can drop the bootnode from your config — you have your own direct peers now.

## Gossip protocol

Gossip spreads announcements organically without all-to-all communication.

**Lifecycle**

1. **Origin** — a node creates an announcement (e.g., `agent_announce` when somebody registers).
2. **Signing** — signed with the origin node's private key.
3. **Propagation** — sent to all directly connected peers with `hop_count = 0`.
4. **Rebroadcast** — each peer verifies, increments hop, forwards. Max 10 hops.
5. **Deduplication** — tracked by 5-minute seen-set. Duplicates dropped.
6. **Rate limit** — max 100 announcements/sec per peer.

**Announcement types**

| Type | Triggered by |
|------|--------------|
| `agent_announce` | Agent registered via `POST /v1/entities` |
| `service_announce` | Service registered |
| `dev_handle` | Developer claimed handle via `POST /v1/handles` |
| `name_binding` | ZNS name bound via `POST /v1/names` |
| `tombstone` | Entity deregistered — suppresses stale gossip for 24 h |
| `peer_attestation` | Peer reputation signal for EigenTrust |

**Signature verification**

Every announcement is checked against the origin's known public key. Pinned keys prevent spoofing. Invalid signatures are dropped.

::: warning Trust on First Use (TOFU)
The first time a node connects to a new peer it learns that peer's public key from the HELLO. Subsequent gossip from that peer is verified against that key. Out-of-band verification (e.g., published on the operator's website) is recommended for production peers.
:::

## Wire protocol

TCP with optional TLS. Length-prefixed framing:

```
[4-byte big-endian length][JSON payload]
```

Max message size: 1 MB. Message types:

| Type | Direction | Purpose |
|------|-----------|---------|
| `HELLO` | Both | Initial handshake. Exchange identity, version, capabilities. |
| `HEARTBEAT` | Periodic | Liveness, peer list, bloom filter. |
| `GOSSIP` | Propagation | Broadcast signed announcement. |
| `QUERY` | Request | Federated search. |
| `QUERY_ACK` | Response | Merged search results. |
| `DHT` | P2P | Kademlia messages — `STORE`, `FIND_VALUE`, `FIND_NODE`, `PING`. |

Example heartbeat:

```json
{
  "type": "HEARTBEAT",
  "registry_id": "zns01.zynd.ai",
  "timestamp": "2026-04-23T12:34:56Z",
  "peers": [
    {"host": "zns02.example.com", "port": 4001, "reputation": 0.95}
  ],
  "bloom_filter": "base64:AQIDBAUG...",
  "agent_count": 3452,
  "service_count": 287
}
```

## Federated search

A search query on one node is fanned out to peers that *might* have matches.

1. Node receives `POST /v1/search`.
2. Runs the query against its own index.
3. Checks each peer's bloom filter — does it likely have agents matching the query tags/categories?
4. Fires `QUERY` messages to up to 10 matching peers in parallel.
5. Each peer has 1.5 s to respond.
6. Merges local results with all returned results, re-ranks by the combined score formula.
7. Returns top N to the caller.

Bloom filters typically eliminate 80–95% of unnecessary peer queries, keeping latency under 500 ms even with large meshes.

## Kademlia DHT

Fallback lookup when gossip has not yet reached a peer.

```
STORE(agent_id, node_address, ttl=3600)
FIND_VALUE(agent_id) → node_address
FIND_NODE(agent_id, k=20) → k closest peers
PING(peer_address)
```

Parameters: `k=20`, `alpha=3` concurrent lookups, 1-hour republish, 24-hour expiry.

Useful when:

- A peer just came online and hasn't received all gossip yet.
- Network partition split the mesh into islands.
- A specific agent_id is needed and full-mesh gossip is overkill.

## Running your own node

To join the Zynd mesh (not run a private one), use `zns-boot.zynd.ai` as your bootstrap peer:

```toml
[server]
listen = "0.0.0.0:8080"
https_endpoint = "https://my-registry.example.com"

[database]
url = "postgresql://postgres:pw@localhost:5432/agentdns"

[cache]
redis_url = "redis://localhost:6379"

[mesh]
listen_port = 4001
max_peers = 15
bootstrap_peers = ["zns-boot.zynd.ai:4001", "zns01.zynd.ai:4001"]
tls_enabled = true

[gossip]
max_hops = 10
dedup_window_seconds = 300

[dht]
enabled = true
k = 20
alpha = 3
```

Docker Compose:

```yaml
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: agentdns
      POSTGRES_PASSWORD: ${PG_PW}

  redis:
    image: redis:7-alpine

  agentdns:
    image: zyndai/agentdns:latest
    depends_on: [postgres, redis]
    ports:
      - "8080:8080"       # HTTPS API
      - "4001:4001"       # mesh TCP
    volumes:
      - ./config.toml:/config/config.toml
      - ./data:/data
    environment:
      AGENTDNS_CONFIG: /config/config.toml
      AGENTDNS_DATA_DIR: /data
```

Health check:

```bash
curl https://my-registry.example.com/v1/info
curl https://my-registry.example.com/v1/network/peers
```

The response should show connected peers from the Zynd mesh after a few seconds.

::: warning TLS certificates
For production, use Let's Encrypt (HTTPS on 8080) or Caddy in front. The TCP mesh port uses self-signed Ed25519 certs that are application-layer verified — no CA needed.
:::

## Private mesh

You can run an entirely separate mesh for internal agents. Omit `zns-boot.zynd.ai` from `bootstrap_peers`, give each of your nodes the others as seeds, and your mesh is isolated from the public Zynd network.

---

Next: **[Registration](/registry/registration)** — how entities land on the mesh in the first place.
