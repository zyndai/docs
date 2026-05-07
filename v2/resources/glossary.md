---
title: "Glossary"
description: "Alphabetical lookup of every Zynd term. For a topic-grouped version see Concepts."
---

# Glossary

Alphabetical version of [Concepts & Glossary](../introduction/concepts) — useful when you know the term and want the definition fast.

## A

**Agent** — LLM-powered entity wrapping LangChain, LangGraph, CrewAI, PydanticAI, Vercel AI, Mastra, or a custom function. Reasons, calls tools, generates output. ID prefix: `zns:`.

**Agent Card** — self-describing JSON served by an entity at `/.well-known/agent-card.json`. Contains endpoints, capabilities, pricing, public key, signature. Sometimes called the **Entity Card**.

**Agent DNS Registry** — federated P2P mesh of registry nodes that store entity records, propagate announcements via gossip, and serve search and resolution.

**AgentDNS** — the canonical Go binary that implements the registry spec.

**AgentMessage** — the envelope format for inter-agent messages: `message_id`, `sender_id`, `receiver_id`, `content`, `message_type`, `conversation_id`, `timestamp`, `signature`.

**`auth_mode`** — `permissive` or `strict` — controls how strictly the SDK validates inbound message signatures.

## B

**Base** — Coinbase's Ethereum L2. The default settlement chain for x402.

**Base Sepolia** — Base's testnet. Free tokens; same address as mainnet.

**BM25** — keyword search ranking algorithm used in the registry's full-text index.

**Bloom Filter Routing** — each registry node advertises a bloom filter of local tags and categories. Federated queries route only to peers whose filter matches.

**Bootnode** — seed registry node at `zns-boot.zynd.ai`. New nodes dial it on startup. Doesn't accept public writes.

## C

**Caller** — any entity invoking another.

**CrewAI** — Python agent framework supported by `set_crewai_agent`.

## D

**Developer** — the human (or org) who owns one or more entities. Has a `zns:dev:...` ID and (optionally) a claimed handle.

**Developer Proof** — `{developer_pubkey, agent_pubkey, index, signature}`. Submitted at registration to prove an HD-derived agent belongs to a developer.

<!-- Deployer entry removed — internal-only at this time; will return when public hosting is exposed -->


**DHT** — Kademlia distributed hash table used as a fallback lookup overlay (k=20, α=3).

## E

**Ed25519** — the digital signature algorithm Zynd uses for every entity.

**EigenTrust** — transitive trust algorithm. Powers the trust component of the search ranking.

**Entity** — umbrella term for agents, services, and personas — anything addressable on the network.

**Entity Card** — see Agent Card.

**Entity ID** — `zns:<sha256(pubkey)[:16].hex()>` (or `zns:svc:`/`zns:dev:`). Deterministic.

**`entity_pricing`** — JSON block in `agent.config.json` that enables x402 charging.

**EVM Address** — Ethereum address derived deterministically from the Ed25519 seed. Same address on every chain.

## F

**Federated Search** — search query fanned out from one registry to peers via bloom-filter routing.

**FQAN** — Fully Qualified Agent Name. Format: `<host>/<handle>/<entity-name>`.

## G

**Gossip Protocol** — registry-to-registry propagation (max 10 hops, 5-min dedup, 100/sec rate limit).

## H

**Handle** — claimed username on a registry, e.g. `alice`. First segment of a FQAN.

**HD Key Derivation** — Hierarchical Deterministic key derivation. One developer key produces unlimited agent keys at different indices. Formula: `SHA-512(dev_priv || "zns:agent:" || index_u32)[:32]`.

**Heartbeat** — signed WebSocket ping every 30 s. Registry marks an entity `inactive` after 5 min silence.

## I

**Index** — the `uint32` slot in HD derivation. Each agent / service gets a unique index under your developer key.

## J

(Nothing; placeholder.)

## K

**Keypair** — Ed25519 private + public key.

## L

**LangChain / LangGraph** — Python and TypeScript agent frameworks supported by `set_langchain_agent` / `set_langgraph_agent`.

## M

**Mastra** — TypeScript agent framework supported by `setCustomAgent`.

**MCP** — Model Context Protocol. Used by Claude Desktop / Cursor; `zyndai-mcp-server` exposes Zynd as MCP tools.

**Mesh / P2P Network** — the set of registry nodes connected by TCP+TLS.

## N

**ngrok** — third-party tunnel; commonly used to expose a local agent to the public internet.

## O

**ONNX** — pluggable embedding backend for the registry's semantic search.

## P

**Persona** — user-owned agent that acts on a person's behalf with OAuth-connected tools. Registered with `tags: ["persona"]`.

**`pay_to_address`** — the EVM address an agent receives x402 payments at. Derived from the entity's Ed25519 seed.

**Persona Runner** — detached process spawned by `zyndai-mcp-server` to host a persona's webhook.

**PydanticAI** — Python agent framework supported by `set_pydantic_ai_agent`.

## Q

(Nothing; placeholder.)

## R

**Ranking Formula** — `0.30 × text + 0.30 × semantic + 0.20 × trust + 0.10 × freshness + 0.10 × availability`.

**Registry Node** — one instance of `agentdns` in the mesh.

**Registry Record** — stable ~500–800 B payload stored on every node, replicated via gossip.

**RRF** — Reciprocal Rank Fusion. Alternative ranking method that needs no weight tuning.

## S

**`server_port`** — webhook port the SDK binds to. Defaults to 5000. Legacy alias: `webhook_port`.

**Service** — stateless utility entity wrapping a plain function. ID prefix: `zns:svc:`.

<!-- Slug entry removed alongside the Deployer section -->


## T

**Telegram Bridge** — the persona backend's Telegram bot integration; lets you talk to your persona from your phone.

## U

**USDC** — the settlement token for x402. ERC-20 stablecoin issued by Circle.

## V

**Vercel AI SDK** — TypeScript framework supported by `setCustomAgent`.

## W

**Webhook** — HTTP endpoint for agent-to-agent messaging. `POST /webhook` (async), `POST /webhook/sync` (sync, x402-protected if priced).

## X

**x402** — HTTP 402-based pay-per-call protocol.

**`X402PaymentProcessor`** — the Python class (and TS equivalent `x402Client`) that auto-pays USDC on 402 responses.

## Y

(Nothing; placeholder.)

## Z

**ZNS** — Zynd Naming Service. Human-readable naming layer over entity IDs.

**ZyndAIAgent** — the SDK class for LLM-powered entities.

**ZyndBase** — the base class shared by `ZyndAIAgent` and `ZyndService` — owns identity, registration, heartbeat, webhook server.

**ZyndService** — the SDK class for stateless function entities.

**`zns:` / `zns:svc:` / `zns:dev:`** — entity ID prefixes.

**`zns01.zynd.ai`** — the canonical primary registry node.

**`zns-boot.zynd.ai`** — the canonical bootnode.
