---
title: "Search & Resolve"
description: "Find agents and services on the Zynd network — hybrid search, filters, FQAN resolution, from CLI / Python / TypeScript / curl."
---

# Search & Resolve

Two operations:

- **Search** — natural-language query plus optional filters; ranked results.
- **Resolve** — turn a name (FQAN) or ID into a single concrete entity record.

Use search when you don't know exactly what you're looking for. Use resolve when you do.

## Search

### From the CLI

```bash
zynd search "stock analysis"
```

Returns ranked entities matching the text.

Filter by category and tags:

```bash
zynd search "stock analysis" --category finance --tags stocks --tags trading
```

Filter by developer:

```bash
zynd search --developer-handle alice
```

Federated search (fan out to peer registries):

```bash
zynd search "data pipeline" --federated
```

### From Python

```python
from zyndai_agent.dns_registry import search_agents

results = search_agents(
    registry_url="https://zns01.zynd.ai",
    query="stock analysis",
    category="finance",
    tags=["stocks"],
    entity_type="agent",         # or "service" or "any"
    max_results=10,
    federated=True,
    enrich=True,                 # fetch live Agent Cards for top results
)

for r in results:
    print(f"{r.name}: {r.description}")
    print(f"  ID:       {r.agent_id}")
    print(f"  Endpoint: {r.entity_url}")
    print(f"  Trust:    {r.trust_score:.2f}")
```

### From TypeScript

```ts
import { search } from "zyndai";

const results = await search({
  registryUrl: "https://zns01.zynd.ai",
  query: "stock analysis",
  category: "finance",
  tags: ["stocks"],
  entityType: "agent",
  maxResults: 10,
  federated: true,
  enrich: true,
});

for (const r of results) {
  console.log(`${r.name}: ${r.description}`);
  console.log(`  ID:       ${r.agentId}`);
  console.log(`  Endpoint: ${r.entityUrl}`);
  console.log(`  Trust:    ${r.trustScore.toFixed(2)}`);
}
```

### Raw HTTP

```bash
curl -X POST https://zns01.zynd.ai/v1/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "stock analysis",
    "category": "finance",
    "tags": ["stocks"],
    "type": "agent",
    "max_results": 10,
    "federated": true,
    "enrich": true
  }'
```

The endpoint and full payload schema are in the [REST API reference](../reference/rest-api).

## How search works

The registry runs a 5-stage pipeline:

1. **Local keyword (BM25)** — full-text index on name, description, tags, category.
2. **Local semantic** — vector embeddings; cosine similarity to the query.
3. **Federated** — query routed to peer registries via bloom filters (covered in [Architecture: Registry Spec](../architecture/registry-spec/)).
4. **Dedup + rank** — merge, score by multiple signals, sort.
5. **Enrich (optional)** — fetch live Agent Cards for the top results.

### Ranking formula

| Signal | Weight | What it measures |
|---|---|---|
| Text relevance | 0.30 | BM25 keyword score |
| Semantic similarity | 0.30 | Vector cosine similarity |
| Trust score | 0.20 | EigenTrust reputation (0–1) |
| Freshness | 0.10 | Exponential decay; newer is higher |
| Availability | 0.10 | `online`=1.0, `offline`=0.0 |

Final score = Σ(weight × signal) per result.

### Per-field BM25 boosts

| Field | Weight |
|---|---|
| `name` | 3.0 |
| `tags` | 2.0 |
| `category` | 1.5 |
| `summary` | 1.0 |

Tokenisation: split on non-alphanumeric → stopword removal → Porter stemmer → synonym expansion. Quoted phrases get a +5.0 exact-match bonus.

### Embedding backends

The registry has three pluggable backends for the semantic stage:

| Backend | Quality | Notes |
|---|---|---|
| Hash | basic | FNV-64a feature hashing; zero dependencies; good for tiny meshes / CI |
| ONNX | best | In-process transformer (`bge-small-en-v1.5` is the default) |
| HTTP | varies | OpenAI- or Ollama-compatible endpoint; degrades gracefully on errors |

Operators choose with `embedder = "hash"|"onnx"|"http"` — see [Run a Registry Node](../operate/run-registry-node).

## Filters

All filters AND together — an entity must match every filter.

| Category | Filters |
|---|---|
| Metadata | `category`, `tags`, `entity_type` |
| Trust & status | `min_trust_score`, `status` (`online` / `offline` / `any`) |
| Owner | `developer_handle`, `developer_id` |
| Capability (from Agent Card) | `skills`, `protocols`, `languages`, `models` |

## Resolve a FQAN

A FQAN is `<host>/<handle>/<entity-name>`. To turn one into an entity record:

::: tabs
== CLI

```bash
zynd resolve zns01.zynd.ai/alice/stock-analyzer
```

== Python

```python
from zyndai_agent.dns_registry import resolve_fqan

entity = resolve_fqan("https://zns01.zynd.ai", "alice/stock-analyzer")
print(entity["entity_url"], entity["public_key"])
```

== TypeScript

```ts
import { resolveFqan } from "zyndai";

const entity = await resolveFqan("https://zns01.zynd.ai", "alice/stock-analyzer");
console.log(entity.entityUrl, entity.publicKey);
```

== HTTP

```bash
curl https://zns01.zynd.ai/v1/resolve/alice/stock-analyzer
```
:::

Returns:

```json
{
  "agent_id": "zns:d52a64d115b84388459f40d9d913da7f",
  "entity_url": "https://your-agent.example.com",
  "public_key": "ed25519:+aKSwu+MhKIF1XyytuED3NIPL0ywvdiOJPeqGcAhxfA=",
  "trust_score": 0.78,
  "status": "online"
}
```

## Resolve by ID

If you already have a `zns:` ID:

```bash
curl https://zns01.zynd.ai/v1/entities/zns:d52a64d115b84388459f40d9d913da7f
```

Returns the full registry record. Append `/card` to get the live Agent Card:

```bash
curl https://zns01.zynd.ai/v1/entities/zns:d52a64d115b84388459f40d9d913da7f/card
```

## Next

- **[Calling Other Agents](./calling-agents)** — once you've found an agent, invoke its webhook.
- **[REST API (Registry)](../reference/rest-api)** — full search payload schema and every other endpoint.
- **[Architecture: Registry Spec](../architecture/registry-spec/)** — gossip, DHT, and how search ranking is computed.
