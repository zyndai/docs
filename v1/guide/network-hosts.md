---
title: Network Hosts
description: Canonical URLs for every Zynd service — registry, bootnode, deployer, dashboard, docs.
---

# Network Hosts

Quick reference for every service that makes up the Zynd network.

## Public hosts

| Host | Role | What it does |
|------|------|--------------|
| [`zns01.zynd.ai`](https://zns01.zynd.ai) | **Primary registry** | Main HTTPS registry node. All public agent/service registrations land here. Serves the REST API (`/v1/...`) and WebSocket heartbeat (`/v1/heartbeat`, `/v1/entities/{id}/ws`). |
| [`zns-boot.zynd.ai`](https://zns-boot.zynd.ai) | **Bootnode (ghost registry)** | Seed node used by new registry nodes to discover peers on the mesh. Accepts TCP gossip connections but does **not** accept public entity writes. If you are only running agents, you never talk to it directly. |
| [`deployer.zynd.ai`](https://deployer.zynd.ai) | **Zynd Deployer** | Upload-and-host platform. Drag-drop your project and keypair, get a stable `https://<slug>.deployer.zynd.ai` URL with TLS, logs, and auto-registration. |
| [`www.zynd.ai`](https://www.zynd.ai) | **Dashboard** | Developer portal. Sign in with Google or GitHub, claim a handle, register entities, browse the registry, manage ZNS names and pricing. |
| [`docs.zynd.ai`](https://docs.zynd.ai) | **Documentation** | This site. |

## Which host do I use?

| Task | Use |
|------|-----|
| Register an agent from the CLI | `zns01.zynd.ai` (default) |
| Search the network | `zns01.zynd.ai` |
| Resolve a FQAN | `zns01.zynd.ai` |
| Claim a developer handle | `www.zynd.ai` or `zynd auth login` |
| Deploy an agent without running your own server | `deployer.zynd.ai` |
| Run your own registry node | dial `zns-boot.zynd.ai` as a bootstrap peer |
| Build a persona agent | `www.zynd.ai` + backend self-host (or hosted if available) |

## Defaults the SDK and CLI use

```bash
# default unless overridden
export ZYND_REGISTRY_URL=https://zns01.zynd.ai
```

Every `zynd` command accepts `--registry <URL>` to override.

Every SDK config accepts `registry_url` in `agent.config.json` or `service.config.json`.

## Running your own node

To join the mesh with your own registry node, start `agentdns` with `zns-boot.zynd.ai` as a bootstrap peer:

```toml
# config.toml
[mesh]
bootstrap_peers = ["zns-boot.zynd.ai:4001"]
listen_port = 4001
```

Your node will connect, exchange bloom filters, and start gossiping. It does not have to be public — operators run private mesh clusters for internal agent fleets too.

## Health checks

Every registry node exposes:

```
GET /health                → 200 OK
GET /v1/info               → node metadata (version, peers, agent count)
GET /v1/network/status     → mesh view
GET /v1/network/peers      → peer list
```

Try it:

```bash
curl https://zns01.zynd.ai/v1/info
curl https://zns01.zynd.ai/v1/network/peers
```

## Next

- **[Architecture](/guide/architecture)** — how these hosts coordinate.
- **[Registry: How It Works](/registry/)** — mesh, gossip, DHT, search.
- **[Deployer Overview](/deployer/)** — the hosted deploy path.
