---
title: AgentDNS — The Registry Binary
description: Decentralized registry and discovery for AI agents — a single Go binary backed by PostgreSQL and Redis.
---

# AgentDNS

`agentdns` is the open-source reference implementation of a Zynd registry node. It's a single Go binary that runs the HTTP API, the TCP gossip mesh, the Kademlia DHT, the search engine, and the trust calculator — backed by PostgreSQL (always) and Redis (optional).

If [Agent DNS Registry](/registry/) is the network *spec*, this section is the *implementation* — what files live where, what tables look like, what background loops fire, and how to operate a node.

## When to read this section

- You're running a registry node and want to understand what each subsystem does.
- You're debugging gossip propagation, search ranking, or DHT lookups.
- You're contributing to the binary, or porting another runtime against the same wire protocol.

If you only want to **use** a Zynd registry as a client (search, register an agent, claim a handle), the [Agent DNS Registry](/registry/) section is what you want.

## What's in the binary

```
┌─────────────────────────────────────────────────────────────────┐
│                     agentdns Registry Node                      │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐   │
│  │ HTTP API │  │  Gossip  │  │   DHT    │  │    Search     │   │
│  │  :8080   │  │  Mesh    │  │(Kademlia)│  │   Engine      │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───────┬───────┘   │
│       │              │             │                │            │
│  ┌────┴──────────────┴─────────────┴────────────────┴───────┐   │
│  │                    Internal Event Bus                     │   │
│  └────┬──────────────┬─────────────┬────────────────┬───────┘   │
│       │              │             │                │            │
│  ┌────┴─────┐  ┌─────┴────┐  ┌────┴─────┐  ┌──────┴──────┐    │
│  │ Registry │  │ Identity │  │  Trust   │  │   Card      │    │
│  │  Store   │  │ (Ed25519)│  │(EigenTrust)│  │  Fetcher    │    │
│  └────┬─────┘  └──────────┘  └──────────┘  └─────────────┘    │
│       │                                                         │
│  ┌────┴─────────────────────────────────────────────────────┐   │
│  │              PostgreSQL          Redis (optional)         │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

Each block has its own page in this section.

## Quick start

```bash
git clone https://github.com/agentdns/agent-dns.git
cd agent-dns

# Interactive — pick the embedder and model
./install.sh

# Or one-shot defaults (ONNX + bge-small-en-v1.5)
./quick-install.sh
```

The installer detects OS/arch, checks Go ≥ 1.24, builds the binary into `/usr/local/bin`, and writes a default config to `~/.zynd/config.toml`.

```bash
agentdns init     # generates ~/.zynd/identity.json (Ed25519 keypair)
agentdns start    # opens :8080 (HTTP) and :4001 (mesh)
```

Without ONNX (zero external deps):

```bash
CGO_ENABLED=0 go build -o agentdns -ldflags="-s -w" ./cmd/agentdns
```

## Repository layout

```
agent-dns/
├── cmd/agentdns/         # CLI entry point
├── config/               # TOML config files
├── docs/                 # Source ARCHITECTURE.md, SETUP.md, swagger
├── internal/
│   ├── api/              # HTTP server, handlers, middleware, heartbeat, monitor
│   ├── cache/            # Redis cache layer
│   ├── card/             # Agent Card fetcher + LRU cache
│   ├── config/           # Config structs and loader
│   ├── dht/              # Kademlia DHT
│   ├── events/           # In-process event bus
│   ├── identity/         # Ed25519 keypair + signing
│   ├── mesh/             # Transport, gossip, peer mgmt, bloom filters
│   ├── models/           # Records, cards, search, trust, ZNS
│   ├── ranking/          # Multi-signal ranking
│   ├── search/           # BM25 + semantic + embedders + tokenizer
│   ├── store/            # PostgreSQL persistence
│   └── zns/              # Naming service, handles, DNS bridge
├── scripts/              # Docker entrypoints, DB init
└── tests/                # Integration tests
```

The [Architecture & Startup](/agentdns/architecture) page maps each subdirectory to a runtime responsibility and shows the boot sequence.

## Pages in this section

- **[Architecture & Startup](/agentdns/architecture)** — system overview, startup sequence, what each background loop does.
- **[Identity Layer](/agentdns/identity)** — Ed25519 keypairs, ID derivation, HD developer→agent keys, TLS-from-Ed25519.
- **[Storage Schema](/agentdns/storage)** — every PostgreSQL table the binary writes to.
- **[Gossip Mesh](/agentdns/gossip-mesh)** — TCP transport, gossip protocol, peer manager, bootstrap, bloom filters, federated search.
- **[Search Engine](/agentdns/search-engine)** — BM25 internals, embedding backends (Hash / ONNX / HTTP), tokenizer pipeline, ranking math.
- **[DHT (Kademlia)](/agentdns/dht)** — node IDs, routing table, iterative lookup, republish/expire loops.
- **[Agent Cards & Caching](/agentdns/cards-cache)** — registry record vs Agent Card, fetcher fallbacks, two-tier cache.
- **[CLI Reference](/agentdns/cli)** — every `agentdns` subcommand and flag.
- **[Configuration](/agentdns/configuration)** — full `~/.zynd/config.toml` reference.

## See also

- **[Agent DNS Registry](/registry/)** — the network-level spec (FQANs, gossip semantics, API contracts) that this binary implements.
- **[Trust & Verification](/registry/trust-verification)** — registry identity proofs and EigenTrust at the protocol level.
