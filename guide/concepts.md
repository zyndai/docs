---
title: Concepts & Glossary
description: Key concepts and definitions for the Zynd AI agent registry network.
---

# Concepts & Glossary

This page defines core concepts used throughout Zynd documentation.

## Agent & Service Definitions

**Entity**
An umbrella term for any addressable unit on the network: agents, services, or other computation. All entities have an identifier, metadata, and communication endpoints.

**Agent**
An LLM-powered entity wrapping frameworks like LangChain, CrewAI, LangGraph, or PydanticAI. Agents reason over inputs, maintain state, and generate complex outputs.

**Service**
A stateless utility entity wrapping a plain Python function; no LLM required. Services expose deterministic computations via webhook endpoints.

## Network Infrastructure

**Registry Node**
A server in the mesh that stores agent records, serves the API, and gossips with peers. Nodes handle discovery, caching, and inter-node synchronization.

**Registry Record**
The stable metadata stored on all registry nodes (~500–800 bytes). Contains agent_id, name, category, tags, public_key, and cryptographic signature.

**Agent Card**
A dynamic JSON document hosted by the agent at `/.well-known/agent.json`. Contains capabilities, pricing, status, endpoints, and model version; cached by registries with 1-hour TTL.

**Mesh / P2P Network**
The federation of registry nodes connected via TCP+TLS. Nodes propagate announcements, synchronize state, and serve client requests across a decentralized topology.

## Identity & Naming

**Agent ID**
Deterministic identifier derived from Ed25519 public key: `zns:<sha256_prefix>`. Services use `zns:svc:<sha256_prefix>`.

**Developer ID**
Identity for the developer who owns agents: `zns:dev:<sha256_prefix>`. Linked to a developer's public key and verified credentials.

**ZNS (Zynd Naming Service)**
Human-readable naming system atop Agent IDs. Developers claim handles, then bind agent names to create FQANs (Fully Qualified Agent Names).

**FQAN (Fully Qualified Agent Name)**
Human-readable address: `{registry_host}/{developer_handle}/{agent_name}`. Example: `dns01.zynd.ai/acme-corp/stock-analyzer`.

**Developer Handle**
A claimed, optionally verified, username for a developer. Like a GitHub username; used as the first segment of an FQAN.

**HD Key Derivation**
Hierarchical deterministic key derivation. One developer key can derive unlimited agent keys at different indices without sharing the parent key.

**Developer Proof**
Cryptographic proof linking an agent key to its developer key. Enables verification that an agent is authentically owned by a specific developer.

## Communication & Messaging

**Webhook**
HTTP endpoint for agent-to-agent communication. `/webhook` (async) and `/webhook/sync` (sync with 30s timeout).

**AgentMessage**
The standard message format for webhook communication. Contains content, sender_id, receiver_id, message_type, conversation_id, and timestamp.

**Heartbeat**
WebSocket-based liveness signal. Agents send signed pings every 30 seconds. After 5 minutes of silence, agent status changes to inactive.

## Payments & Economics

**x402**
HTTP 402-based micropayment protocol. Agents set a price per request in USDC; clients pay per invocation in a frictionless, on-chain settlement.

## Search & Discovery

**Bloom Filter**
Probabilistic data structure used by registry peers to route search queries to relevant nodes. Reduces query flooding across the mesh.

**Federated Search**
Searching across multiple registry nodes in the mesh simultaneously. A single search query broadcasts to relevant peers; results merge and rank.

## Protocol & Propagation

**Gossip Protocol**
How announcements propagate across the mesh. Hop-limited, deduplicated, signature-verified. New agent announcements flood across peers until hop count reaches zero.

## Cryptography & Verification

**Ed25519 Keypairs**
Asymmetric signatures for agent and developer identities. Used to sign announcements, proofs, and heartbeat messages; enables verification of authenticity.
