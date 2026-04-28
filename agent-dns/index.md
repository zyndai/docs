---
description: Decentralized registry and discovery network for AI agents — like DNS, but for agents.
---

# Agent DNS

A **decentralized registry and discovery network** for AI agents. Like DNS maps domain names to IP addresses, Agent DNS maps natural-language queries to discoverable, verifiable AI agents across a federated peer-to-peer mesh.

Register agents with cryptographic identity, discover them via hybrid search, and resolve live Agent Cards — all through a single Go binary backed by PostgreSQL and Redis.

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/agentdns/agent-dns.git
cd agent-dns
./install.sh

# 2. Initialize and start
agentdns init
agentdns start

# 3. Register your first agent
agentdns register \
  --name "MyAgent" \
  --agent-url "https://example.com/.well-known/agent.json" \
  --category "tools" \
  --summary "Does useful things"

# 4. Search the network
agentdns search "my query"
```

See the [Setup Guide](/agent-dns/setup) for detailed installation options.

## Architecture Overview

```
                         ┌──────────────────────────────────────────┐
                         │            Agent DNS Network             │
                         │                                          │
   ┌──────────┐          │  ┌────────────┐       ┌────────────┐    │
   │  Client  │──HTTP───▶│  │ Registry A │◄─────▶│ Registry B │    │
   │  / CLI   │          │  │  :8080     │ Gossip │  :8081     │    │
   └──────────┘          │  └─────┬──────┘       └─────┬──────┘    │
                         │        │                     │           │
                         │        │    ┌────────────┐   │           │
                         │        └───▶│ Registry C │◄──┘           │
                         │             │  :8082     │               │
                         │             └────────────┘               │
                         │                                          │
                         │  ┌────────────┐       ┌────────────┐    │
                         │  │ PostgreSQL │       │   Redis    │    │
                         │  │  :5432     │       │   :6379    │    │
                         │  └────────────┘       └────────────┘    │
                         └──────────────────────────────────────────┘
```

## How It Works

1. **Registration** — Agent owners submit a `RegistryRecord` containing the agent's name, URL, category, tags, public key, and an Ed25519 signature. The agent receives a deterministic ID (`agdns:<sha256-prefix>`) derived from its public key.

2. **Gossip Propagation** — Registrations, updates, and deregistrations are packaged as `GossipAnnouncements` and propagated across the mesh with hop-count limits and deduplication.

3. **Hybrid Search** — Clients search using natural-language queries. The engine combines:
   - **BM25 keyword search** for text relevance
   - **Semantic vector search** using cosine similarity
   - Results are ranked with a weighted formula: text relevance (30%), semantic similarity (30%), trust (20%), freshness (10%), availability (10%)

4. **Agent Cards** — Beyond the static registry record, each agent hosts a dynamic Agent Card at its URL containing live capabilities, pricing, endpoints, and status. Cards are cached in a two-tier cache (in-process LRU + Redis).

5. **Trust & Reputation** — The EigenTrust algorithm computes global trust scores from signed attestations across registry peers. Trust is transitive but attenuated.

6. **Bloom Filter Routing** — Peers exchange bloom filters built from agent tags and categories, enabling smart query routing to the most relevant peers.

## Core Components

| Component | Description |
|---|---|
| **Registry Store** | PostgreSQL-backed storage for agent records, gossip entries, tombstones, and attestations |
| **Search Engine** | BM25 keyword + semantic vector search with multi-signal ranking |
| **Gossip Protocol** | Hop-counted announcements with dedup windows for mesh propagation |
| **Peer Manager** | Manages mesh connections, heartbeats, bootstrap, and peer eviction |
| **Agent Card Fetcher** | Two-tier cached fetcher (LRU + Redis) for live agent metadata |
| **EigenTrust** | Decentralized reputation scoring from weighted peer attestations |
| **Identity** | Ed25519 keypair generation, signing, and verification |
| **REST API** | Full HTTP API with Swagger docs, rate limiting, and CORS |

## Prerequisites

### For Installation Script (Recommended)
- **Go 1.24+** — [Download](https://go.dev/dl/)
- **Git** — For cloning the repository
- **sudo access** — For installing to `/usr/local/bin`

### For ONNX Embedder (Optional, Recommended)
- **Rust** — Installer can install this automatically
- **C Compiler** — Usually pre-installed (gcc/clang)

### For Running the Registry
- **PostgreSQL 16+** — Database for agent records
- **Redis 7+** — Optional, for caching

## Documentation

| Document | Description |
|----------|-------------|
| [Setup Guide](/agent-dns/setup) | Step-by-step setup for localhost and production — registry configuration, TLS, ZNS handle claiming, domain verification |
| [Architecture & Internals](/agent-dns/architecture) | How every layer works — identity, gossip mesh, search engine, DHT, ZNS naming, trust, caching, heartbeat, API, and event bus |
| [CLI & API Reference](/agent-dns/cli-api) | Complete CLI command reference and REST API endpoints |

## License

MIT
