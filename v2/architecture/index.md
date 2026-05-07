---
title: "Architecture (Deep Dive)"
description: "How every Zynd component is built. Read this when you want to operate, debug, or contribute."
---

# Architecture (Deep Dive)

This section is for operators, contributors, and anyone who wants to know what's actually happening when an entity registers, gossip propagates, or a deployer worker rebuilds a Caddy route.

If you only want to **use** Zynd, you can skip this entire section. The earlier chapters ([Build](../build/), [Discover & Integrate](../discover-integrate/)) cover the user view.

## What's here

| Page | What it covers |
|---|---|
| **[Registry Spec](./registry-spec/)** | The protocol every registry node implements — mesh, gossip, DHT, search ranking, EigenTrust, ZNS. Implementation-agnostic. |
| **[AgentDNS (Implementation)](./agentdns/)** | The Go reference implementation of the spec — subsystem map, startup sequence, background loops, wire protocol. |
| **[Dashboard (Implementation)](./dashboard/)** | Internals of `www.zynd.ai` — Next.js + Supabase Auth + Prisma + AES-256-GCM key encryption. |
| **[Python SDK Internals](./python-sdk-internals/)** | Module map of `zyndai_agent` — what each file owns. |
| **[MCP Server Internals](./mcp-server/)** | How the persona-runner is detached, the mailbox flow, launchd/systemd integration. |

## How the surfaces relate

```mermaid
graph TB
    subgraph "Spec"
        Spec[Registry Spec]
    end

    subgraph "Implementations"
        AgentDNS[AgentDNS — Go binary]
        Other[Other implementations could exist<br/>that conform to the same spec]
    end

    subgraph "Surfaces clients use"
        SDK[Python + TS SDKs]
        MCP[MCP Server]
    end

    subgraph "Hosted services built on the SDK"
        Dashboard[Dashboard<br/>www.zynd.ai]
        Persona[Persona Backend]
    end

    Spec -.->|conforms to| AgentDNS
    Spec -.->|conforms to| Other

    SDK -->|REST + WSS| AgentDNS
    MCP -->|REST + WSS| AgentDNS

    Dashboard -->|uses| SDK
    Persona -->|uses| SDK
```

The **spec** is the source of truth. **AgentDNS** is the canonical implementation. **SDKs** speak the spec. **Hosted services** are user-facing apps built on top of the SDKs.

## Reading order

If you're new here, read in this order:

1. **[Registry Spec](./registry-spec/)** — what the network is.
2. **[AgentDNS](./agentdns/)** — how one node serves the spec.
3. **[Python SDK Internals](./python-sdk-internals/)** — how a client speaks to it.
4. **[Dashboard](./dashboard/)** — a concrete consumer of the SDK.
5. **[MCP Server](./mcp-server/)** — a chat-bridged consumer.
