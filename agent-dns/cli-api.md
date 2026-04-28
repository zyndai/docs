---
description: Complete CLI command reference and REST API endpoints for Agent DNS.
---

# CLI & API Reference

## CLI Reference

```
agentdns <command> [flags]
```

| Command | Description |
|---|---|
| `init` | Initialize a new registry node (generates Ed25519 keypair + default config) |
| `start` | Start the registry node (`--config <path>`, default: `~/.zynd/config.toml`) |
| `register` | Register an agent (`--name`, `--agent-url`, `--category`, `--tags`, `--summary`) |
| `search` | Search for agents (`--category`, `--min-trust`, `--status`, `--max-results`) |
| `resolve` | Get an agent's registry record by ID |
| `card` | Fetch an agent's live Agent Card by ID |
| `status` | Show node status (uptime, peers, agents, gossip stats) |
| `peers` | List connected mesh peers |
| `deregister` | Remove an agent from the registry |
| `version` | Print version |

### Examples

```bash
# Search with filters
agentdns search "translate english to japanese" --category translation --max-results 10

# Register with tags
agentdns register \
  --name "TranslatorBot" \
  --agent-url "https://translate.example.com/.well-known/agent.json" \
  --category "translation" \
  --tags "english,japanese,multilingual"

# Check node status
agentdns status

# List peers
agentdns peers

# Resolve an agent's record
agentdns resolve agdns:7f3a9c2e...

# Fetch a live Agent Card
agentdns card agdns:7f3a9c2e...
```

---

## REST API Reference

The REST API is served on port `8080` by default. Interactive Swagger docs are available at `/swagger/`.

### Agent Management

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/v1/agents` | Register a new agent |
| `GET` | `/v1/agents/{agentID}` | Get agent by ID |
| `PUT` | `/v1/agents/{agentID}` | Update an agent |
| `DELETE` | `/v1/agents/{agentID}` | Deregister an agent |
| `GET` | `/v1/agents/{agentID}/card` | Fetch live Agent Card |
| `GET` | `/v1/agents/{agentID}/ws` | WebSocket heartbeat |

### Developer Identity

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/v1/developers` | Register developer |
| `GET` | `/v1/developers/{devID}` | Get developer record |
| `PUT` | `/v1/developers/{devID}` | Update profile |
| `DELETE` | `/v1/developers/{devID}` | Deregister developer |
| `GET` | `/v1/developers/{devID}/agents` | List developer's agents |

### Search & Discovery

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/v1/search` | Search for agents (natural-language query with filters) |
| `GET` | `/v1/categories` | List all agent categories |
| `GET` | `/v1/tags` | List all agent tags |

### ZNS: Handles

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/v1/handles` | Claim handle |
| `GET` | `/v1/handles/{handle}` | Resolve handle |
| `GET` | `/v1/handles/{handle}/available` | Check availability |
| `DELETE` | `/v1/handles/{handle}` | Release handle |
| `POST` | `/v1/handles/{handle}/verify` | Verify handle (DNS/GitHub) |
| `GET` | `/v1/handles/{handle}/agents` | List agents under handle |

### ZNS: Names

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/v1/names` | Register FQAN binding |
| `GET` | `/v1/names/{dev}/{agent}` | Resolve FQAN |
| `PUT` | `/v1/names/{dev}/{agent}` | Update binding |
| `DELETE` | `/v1/names/{dev}/{agent}` | Release name |
| `GET` | `/v1/names/{dev}/{agent}/versions` | Version history |
| `GET` | `/v1/resolve/{dev}/{agent}` | Resolve FQAN to full agent record |

### Network

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/v1/network/status` | Node status |
| `GET` | `/v1/network/peers` | List connected peers |
| `POST` | `/v1/network/peers` | Add a peer manually |
| `GET` | `/v1/network/stats` | Network-wide statistics |
| `GET` | `/v1/info` | Registry metadata and capabilities |
| `GET` | `/.well-known/zynd-registry.json` | Registry identity proof |

### Health & Docs

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `GET` | `/swagger/*` | Swagger UI |
| `GET` | `/v1/ws/activity` | WebSocket activity stream |

---

## Examples

### Register an Agent via API

```bash
curl -X POST http://localhost:8080/v1/agents \
  -H "Content-Type: application/json" \
  -d '{
    "name": "CodeReviewBot",
    "agent_url": "https://example.com/.well-known/agent.json",
    "category": "developer-tools",
    "tags": ["python", "security"],
    "summary": "Reviews Python code for security vulnerabilities",
    "public_key": "<base64-ed25519-public-key>",
    "signature": "<base64-ed25519-signature>"
  }'
```

### Search for Agents

```bash
curl -X POST http://localhost:8080/v1/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "code review agent for Python",
    "category": "developer-tools",
    "max_results": 10,
    "enrich": true
  }'
```

---

## Configuration Reference

Configuration is in TOML format. The default config is generated at `~/.zynd/config.toml` on `agentdns init`.

### Key Configuration Sections

```toml
[node]
name = "my-registry"             # Node display name
type = "full"                    # full | light | gateway

[mesh]
listen_port = 4001               # Peer-to-peer mesh port
max_peers = 15
bootstrap_peers = []             # e.g. ["registry-a:4001"]

[registry]
postgres_url = "postgres://agentdns:agentdns@localhost:5432/agentdns?sslmode=disable"

[search]
default_max_results = 20

[search.ranking]
text_relevance_weight = 0.30
semantic_similarity_weight = 0.30
trust_weight = 0.20
freshness_weight = 0.10
availability_weight = 0.10

[cache]
max_agent_cards = 50000
agent_card_ttl_seconds = 3600

[redis]
url = "redis://localhost:6379/0" # Leave empty to disable Redis

[api]
listen = "0.0.0.0:8080"
rate_limit_search = 100          # Requests per minute
rate_limit_register = 10         # Requests per minute
cors_origins = ["*"]
```

For the full configuration reference with all options, see the source `config/default.toml`.
