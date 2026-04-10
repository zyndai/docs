---
title: Mesh Network
description: How registry nodes connect, gossip, and federate search across the Zynd network.
---

# Mesh Network

The Zynd registry is a mesh of autonomous nodes that replicate data via gossip and collaborate on search without a central authority. Understanding the mesh helps you run your own node and troubleshoot federation.

## Peer Discovery

Nodes find each other through bootstrap and peer exchange.

**Bootstrap:**
- Start with configured seed peers (e.g., dns01.zynd.ai, dns02.zynd.ai)
- Dial seed peers via TCP+TLS
- Exchange peer lists during initial handshake

**Peer exchange (during heartbeat):**
- Connected peers share their peer lists periodically
- Each peer can connect to up to N peers (configurable, default 15)
- Maintains a healthy mesh topology even when peers join/leave

**Peer attestation:**
- High-quality peers earn reputation
- Gossip announcements include peer attestation signals
- Nodes preferentially route through trustworthy peers

::: tip Mesh Size
With 15 peers per node and max 10 gossip hops, a mesh can efficiently reach 10^15 nodes. Typical networks run 5–50 public nodes.
:::

## Gossip Protocol

Gossip spreads announcements organically without requiring all-to-all communication.

**Announcement lifecycle:**

1. **Origin:** A node creates an announcement (e.g., agent_announce with name, tags, public key)
2. **Signing:** Signed with the origin node's private key
3. **Propagation:** Sent to all connected peers
4. **Rebroadcast:** Each peer forwards to its peers (up to max_hops)
5. **Deduplication:** Tracked by 5-minute windows; duplicate announcements are dropped

**Announcement types:**

| Type | Triggered by |
|---|---|
| `agent_announce` | Agent registered via POST /v1/entities |
| `service_announce` | Service registered via POST /v1/entities |
| `dev_handle` | Developer claimed handle via POST /v1/handles |
| `name_binding` | Entity name bound via POST /v1/names |
| `registry_proof` | Registry quorum consensus (cross-chain validation) |
| `peer_attestation` | Peer reputation updates during heartbeat |

**Signature verification:**
- Every announcement is checked against the origin registry's public key
- Nodes maintain pinned keys for known registry nodes
- Invalid signatures are dropped immediately (prevents spoofing)

::: warning Trust on First Use (TOFU)
When connecting to a registry for the first time, you should verify its public key out-of-band (e.g., from its website). Subsequent gossip announcements from that registry are signature-verified.
:::

## Message Protocol (TCP+TLS)

Nodes communicate over TCP with optional TLS encryption. Messages use length-prefixed framing:

```
[4-byte big-endian length][JSON payload]
```

Maximum message size: 1 MB.

**Message types:**

| Message | Direction | Purpose |
|---|---|---|
| `hello` | Both | Initial handshake, exchange identity & capabilities |
| `heartbeat` | Periodic | Liveness check, peer list, bloom filter exchange |
| `gossip` | Propagation | Broadcast announcement to peer |
| `search` | Query | Request search for agents matching criteria |
| `search_ack` | Response | Return search results |
| `dht` | P2P | Kademlia DHT messages (STORE, FIND_VALUE, etc.) |

**Example heartbeat message:**

```json
{
    "type": "heartbeat",
    "registry_id": "dns01.zynd.ai",
    "timestamp": "2026-04-10T12:34:56Z",
    "peers": [
        {"host": "dns02.zynd.ai", "port": 5000, "reputation": 0.95},
        {"host": "dns03.zynd.ai", "port": 5000, "reputation": 0.88}
    ],
    "bloom_filter": "base64:AQIDBAUGBwg...",
    "agent_count": 3452,
    "service_count": 287
}
```

## Bloom Filters for Smart Routing

When a search query arrives, the node needs to decide which peers to ask. Bloom filters answer this cheaply.

**How it works:**

1. **Build filter:** Each peer builds a bloom filter of its agents' tags and categories
2. **Exchange:** Filters are sent during heartbeats
3. **Query:** When a search arrives, check each peer's filter against the query terms
4. **Route:** Send search only to peers whose filters indicate a possible match

**Example:**
- Peer dns02 has agents tagged: `["finance", "stocks", "crypto"]`
- Its bloom filter says: "I might have agents matching 'finance' or 'stocks'"
- Incoming query: "crypto trading"
- Bloom filter check fails; search is NOT routed to dns02
- No false negatives—the filter might have false positives, but missed results are acceptable

**Bloom filter parameters:** false positive rate ~5%, size ~1 KB per 1000 agents.

::: tip Efficiency Gain
Bloom filters eliminate 80–95% of unnecessary inter-node search requests. Large meshes notice significant latency improvements.
:::

## Kademlia DHT

Beyond gossip reach (e.g., when peers are offline), use DHT for decentralized storage and lookup.

**Operations:**

```python
# Publish
dht.store(agent_id, node_address, ttl=3600)

# Query
node_address = dht.find_value(agent_id)

# Peer discovery
peers = dht.find_node(agent_id, k=20)

# Liveness
dht.ping(peer_address)
```

**Parameters:**
- **k=20:** Bucket size (store 20 closest peers per bucket)
- **alpha=3:** Concurrent lookups
- **1-hour republish:** Re-announce agent locations periodically
- **24-hour expiry:** Data older than 24 hours is purged

**Use cases:**
- Long-lived service discovery (agents offline from gossip)
- Network partitions (DHT bridges islands of mesh)
- Backup storage (survive node failures)

## Running Your Own Node

Want to operate a registry node and join the network?

**Prerequisites:**
- PostgreSQL 13+
- Redis 6+
- Docker or system Python 3.9+

**Quick start with Docker Compose:**

Create `docker-compose.yml`:

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: zynd_registry
      POSTGRES_PASSWORD: dev-only-not-production
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  registry:
    image: zynd-registry:latest
    environment:
      DATABASE_URL: postgresql://postgres:dev-only-not-production@postgres:5432/zynd_registry
      REDIS_URL: redis://redis:6379
      NODE_ID: dns-node-001.local
      REGISTRY_PORT: 5000
      MESH_LISTEN_PORT: 5001
      MESH_MAX_PEERS: 15
      MESH_BOOTSTRAP_PEERS: dns01.zynd.ai:5001,dns02.zynd.ai:5001
      MESH_TLS_ENABLED: "true"
    ports:
      - "5000:5000"
      - "5001:5001"
```

**Configuration (config.toml):**

```toml
[server]
listen = "0.0.0.0:5000"
registry_url = "https://my-registry.example.com"

[database]
url = "postgresql://user:pass@localhost:5432/zynd_registry"

[cache]
redis_url = "redis://localhost:6379"

[mesh]
listen_port = 5001
max_peers = 15
bootstrap_peers = ["dns01.zynd.ai:5001", "dns02.zynd.ai:5001"]
tls_enabled = true
tls_cert = "/etc/zynd/cert.pem"
tls_key = "/etc/zynd/key.pem"

[gossip]
max_hops = 10
dedup_window_seconds = 300

[dht]
enabled = true
k = 20
alpha = 3
republish_interval_seconds = 3600
```

**Start the node:**

```bash
docker-compose up -d

# Check logs
docker-compose logs -f registry
```

**Verify connectivity:**

```bash
# Should list connected peers
curl http://localhost:5000/health
```

**Register with the bootstrap network** (optional, so others discover you):

```bash
zynd registry register https://my-registry.example.com
```

This publishes your node's endpoint to the gossip network. Other operators can optionally add you as a bootstrap peer.

::: warning TLS Certificates
Production deployments require valid TLS certificates (e.g., from Let's Encrypt). Use self-signed certs only for local testing.
:::

::: tip Testbed Setup
The repository includes a 3-node Docker Compose testbed in `examples/mesh-testbed/` for local development and experimentation.
:::

---

Next: [Build your first agent](/agents/first-agent) and [register it](/registry/registration) on the network.
