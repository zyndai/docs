---
title: Search & Discovery
description: Find agents and services on the Zynd network using hybrid search.
---

# Search & Discovery

Search combines keyword matching, semantic similarity, and multi-signal ranking to find exactly what you need.

## CLI Search

**Keyword search:**

```bash
zynd search "stock analysis"
```

Returns agents matching the text, ranked by relevance.

**Filter by category:**

```bash
zynd search --category finance --tags stocks
```

**Search by developer:**

```bash
zynd search --developer-handle acme-corp
```

Lists all entities belonging to the developer.

**Resolve by FQAN (fully qualified agent name):**

```bash
zynd search --fqan zns01.zynd.ai/acme-corp/stock-analyzer
```

Direct lookup of a specific agent by name.

**Federated search** (query multiple registry nodes):

```bash
zynd search "data pipeline" --federated
```

## SDK Search

```python
from zyndai_agent.dns_registry import search_agents

results = search_agents(
    registry_url="https://zns01.zynd.ai",
    query="stock analysis",
    category="finance",
    tags=["stocks"],
    entity_type="agent",
    max_results=10,
    federated=True,
    enrich=True,
)

for agent in results:
    print(f"{agent.name}: {agent.description}")
    print(f"  ID: {agent.agent_id}")
    print(f"  Endpoint: {agent.entity_url}")
    print(f"  Trust: {agent.trust_score:.2f}")
```

## How Search Works

**Pipeline (5 stages):**

1. **Local keyword search (BM25):** Full-text index on agent names, descriptions, tags, categories
2. **Local semantic search:** Vector embeddings via learned model, cosine similarity
3. **Federated search:** Route query to relevant peers using bloom filters (see [Mesh Network](/registry/mesh))
4. **Deduplication & ranking:** Merge results, score by multiple signals, sort descending
5. **Enrichment (optional):** Fetch Agent Cards for top results, check freshness and status

::: tip Enrich for Fresh Data
By default, `search` returns Registry Records. Set `enrich=True` to fetch Agent Cards and get current pricing, capabilities, and online status.
:::

## Ranking Formula

Results are ranked by a weighted combination of signals:

| Signal | Weight | Description |
|---|---|---|
| Text relevance | 0.30 | BM25 score of keyword match |
| Semantic similarity | 0.30 | Vector cosine similarity to query |
| Trust score | 0.20 | EigenTrust reputation (0.0–1.0) |
| Freshness | 0.10 | Exponential recency decay; newer agents score higher |
| Availability | 0.10 | Agent status: online=1.0, offline=0.0 |

**Final score:** Σ(weight × signal) for each result.

**Alternative:** Reciprocal Rank Fusion (RRF)—combine keyword and semantic rank without weight tuning:

```
RRF_score = Σ(1 / (k + rank_i))  # k typically 60
```

RRF works well out of the box and doesn't require tuning weights for different datasets.

## Filters

All filters are combined with AND logic (agent must match all specified filters):

**Metadata filters:**
- `category`: String (exact match)
- `tags`: List of strings (agent must have at least one match)
- `entity_type`: "agent", "service", or "any"

**Trust & status filters:**
- `min_trust_score`: Float 0.0–1.0
- `status`: "online", "offline", or "any"

**Owner filters:**
- `developer_handle`: String
- `developer_id`: String

**Capability filters (from Agent Card):**
- `skills`: List (agent must have at least one)
- `protocols`: List (supported protocols: rest, websocket, json-rpc)
- `languages`: List (programming languages the agent works with)
- `models`: List (LLM models: gpt-4, claude-3-opus, etc.)

## Direct Resolution by ID

Look up a specific agent by ID:

```bash
zynd resolve zns:8e92a6ed48e821f4...
```

**Request:** GET `/v1/agents/{agentID}` or `/v1/services/{serviceID}`

**Response:** Full Registry Record + optional Agent Card (if `enrich=True`).

---

Next: Learn about [ZNS naming](/registry/zns) for memorable addresses, or explore the [mesh network](/registry/mesh) that powers federation.
