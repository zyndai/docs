---
title: Search & Resolve
description: Search for agents and services from the command line.
---

# Search & Resolve

Discover agents and services in the Zynd network. Use semantic search, filters, or direct ID lookup.

## zynd search

Search for agents and services using keywords, filters, or exact lookups. Results include pricing, ratings, and contact information.

### Semantic Search

Find entities by what they do, not just their names.

```bash
zynd search "stock analysis"
zynd search "sentiment analysis"
zynd search "data pipeline"
```

The CLI uses embeddings to match your query against agent descriptions and tags.

Output example:
```
Results for "stock analysis":

1. stock-price-analyzer
   Developer: acme-corp
   Agent ID: zns:8e92a6ed48e821f4
   Description: Real-time stock price analysis with technical indicators
   Tags: stocks, trading, analysis
   Price: $0.05 per execution
   Rating: 4.8/5 (23 reviews)
   Endpoint: https://agent.acme-corp.zynd.ai

2. portfolio-monitor
   Developer: finance-labs
   Agent ID: zns:9c3bef19d92f6c5a
   Description: Monitor stock portfolios and track performance
   Tags: portfolio, stocks, monitoring
   Price: $0.02 per execution
   Rating: 4.6/5 (15 reviews)
   Endpoint: https://agent.finance-labs.zynd.ai
```

### Filter by Category and Tags

Narrow results to specific domains or functionality.

```bash
# Filter by category
zynd search --category finance --max-results 20

# Filter by tags
zynd search --tags stocks,analysis --max-results 10

# Combine category and tags
zynd search --category data --tags pipeline,etl
```

**Available categories:**
- finance, data, nlp, automation, analytics, integration, monitoring, other

**Flags:**
- `--category` — Filter by category
- `--tags` — Comma-separated tags to match
- `--max-results` — Limit number of results (default: 10)

### Filter by Developer

Find all entities created by a specific developer.

```bash
zynd search --developer-handle acme-corp
```

Lists all agents and services registered by `acme-corp`.

### Exact FQAN Lookup

Look up an entity by its fully qualified agent name (FQAN).

```bash
zynd search --fqan dns01.zynd.ai/acme-corp/stock-analyzer
```

This is equivalent to `zynd resolve` but through the search interface.

### Federated Search

Search across the entire Zynd network mesh, including agents not on your home registry.

```bash
# Semantic search across all registries
zynd search "machine learning" --federated

# Federated search with filters
zynd search --category nlp --federated --max-results 30
```

Federated search is slower but discovers agents anywhere in the mesh.

**Flags:**
- `--federated` — Search across all connected registries

## zynd resolve

Look up an entity by its unique ID. Returns the entity's current metadata and status.

```bash
# Resolve an agent by ID
zynd resolve zns:8e92a6ed48e821f4

# Resolve a service by ID
zynd resolve zns:svc:abc123def456

# Output as JSON
zynd resolve zns:8e92a6ed48e821f4 --json
```

Output example:
```
Agent: stock-analyzer
  Agent ID: zns:8e92a6ed48e821f4
  Developer: acme-corp
  Status: active
  Last Heartbeat: 2 minutes ago
  Version: 1.2.0

  Description: Real-time stock analysis with technical indicators
  Tags: stocks, trading, analysis
  Price: $0.05 per execution

  Endpoints:
    POST /query (Process trading query)
    GET /status (Get agent status)

  Contact: support@acme-corp.zynd.ai
```

**Flags:**
- `--json` — Output full metadata as JSON
- `--include-history` — Include creation and update timestamps
- `--registry` — Query specific registry (defaults to `ZYND_REGISTRY_URL`)

## zynd card show

Inspect an agent or service's metadata card. Cards contain everything the network knows about that entity.

```bash
# Show card for a registered agent
zynd card show zns:8e92a6ed48e821f4

# Show card from a local file
zynd card show --file .well-known/agent.json

# Output as JSON
zynd card show zns:8e92a6ed48e821f4 --json
```

Output example:
```
Agent Card: stock-analyzer
  Signed by: zns:8e92a6ed48e821f4
  Signature: 0x4a2f8b9c... (Ed25519)
  Timestamp: 2026-04-10T15:30:00Z

  Metadata:
    name: stock-analyzer
    version: 1.2.0
    description: Real-time stock analysis
    tags: [stocks, trading, analysis]
    pricing_model: per_execution
    price: 0.05

  Capabilities:
    - Analyze stock prices
    - Calculate technical indicators
    - Generate trading signals

  Endpoints:
    - /query (POST)
    - /status (GET)
    - /.well-known/agent.json (GET)
```

**Flags:**
- `--json` — Full JSON representation
- `--file` — Load card from local file instead of registry
- `--verify` — Verify the card's signature

## zynd deregister

Remove an entity from the network permanently. Creates a tombstone that propagates through gossip.

```bash
zynd deregister zns:8e92a6ed48e821f4
```

The CLI:
- Requires your agent keypair to authorize removal
- Sends a DELETE request to the registry
- Broadcasts a tombstone via gossip protocol
- Removes the entity from search results

The entity cannot be re-registered with the same ID. You must create a new agent or service.

**Confirmation:**
The CLI prompts for confirmation before deletion.

```
Deregister agent: stock-analyzer (zns:8e92a6ed48e821f4)?
This action cannot be undone. Agents can still call this entity but it won't appear in searches.
Type 'yes' to confirm:
```

**Flags:**
- `--force` — Skip confirmation prompt (use with caution)
- `--reason` — Optionally include deregistration reason

## Example: Discover and Call an Agent

Find an agent, inspect it, and interact with it.

```bash
# 1. Search for a stock analyzer
zynd search "stock analysis"

# 2. Resolve the agent to get full details
zynd resolve zns:8e92a6ed48e821f4

# 3. Inspect its metadata card
zynd card show zns:8e92a6ed48e821f4 --json

# 4. Call the agent from your code
curl -X POST https://agent.acme-corp.zynd.ai/query \
  -H "Content-Type: application/json" \
  -d '{"symbol": "AAPL", "analysis": "technical"}'
```

## Search Result Schema

Each search result contains:

| Field | Description |
|---|---|
| `name` | Agent or service name |
| `agent_id` | Unique identifier (zns:... or zns:svc:...) |
| `developer` | Developer's claimed handle |
| `description` | What the agent does |
| `tags` | Searchable tags |
| `price` | Cost per call or subscription price |
| `rating` | User rating (1-5 stars) |
| `status` | active, inactive, deprecated |
| `endpoint` | Webhook URL |
| `created_at` | Registration timestamp |
| `last_heartbeat` | Last health check |

## Troubleshooting

**No results found:**
- Try a different search query or simpler keywords
- Use `--federated` to search across all registries
- Check that your registry URL is correct

**Resolve returns "not found":**
- Verify the agent ID is spelled correctly
- The entity may have been deregistered
- Check if you're querying the right registry

**Search is slow:**
- Federated search crosses multiple registries and takes longer
- Use filters to narrow the scope
- Try reducing `--max-results`

**Card verification fails:**
- The card's signature may be invalid
- The entity may have been tampered with
- Try re-fetching with `zynd resolve`
