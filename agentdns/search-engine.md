---
title: Search Engine
description: BM25, semantic vectors, embedders, tokenization, and ranking.
---

# Search Engine

**Source:** `internal/search/`

The search engine combines four retrieval strategies and merges them into a single ranked list. All four run on the same node — federated fan-out happens at the mesh layer, not the search layer.

## Pipeline

```
Search Request
    │
    ├─── Keyword Search (BM25)         ──► Local agents
    ├─── Semantic Search (vectors)     ──► Local agents
    ├─── Gossip Search (BM25)          ──► gossip_entries table
    └─── Federated Search              ──► via mesh to peer nodes
    │
    ▼
Merge + Deduplicate by agent_id
    │
    ▼
Rank (weighted-linear or RRF)
    │
    ▼
Enrich top 10 with Agent Cards
    │
    ▼
Return paginated response
```

## Keyword search (BM25)

Two implementations:

**`keyword.go` — basic BM25.** Classic BM25 with `K1=1.2`, `B=0.75`. Tokenizes on non-alphanumeric, minimum 2-character terms. Indexes the combined text of name, summary, category, and tags.

**`keyword_v2.go` — improved BM25 (default).** Per-field indexing with boosted weights:

| Field | Weight |
|-------|--------|
| Name | 3.0× |
| Tags | 2.0× |
| Category | 1.5× |
| Summary | 1.0× |

Plus advanced tokenization (next section) and a +5.0 phrase-match bonus for exact quoted phrases.

## Tokenizer

`internal/search/tokenizer.go`:

1. Split on non-alphanumeric, preserving hyphens and underscores.
2. Filter stopwords (24 common English words).
3. Apply Porter stemmer (suffix removal).
4. Synonym expansion — `ai` → `artificial-intelligence`, `ml`; `db` → `database`; etc.
5. Optional n-grams (configurable).

The same tokenizer feeds both the BM25 index and the bloom-filter token set.

## Semantic search

`internal/search/semantic.go`:

- Each agent's combined text is converted to a dense vector by the configured embedder.
- All vectors are L2-normalized at insertion time so cosine similarity is a single dot product.
- Brute-force scan, O(n) per query — fine up to ~100K agents per node. Beyond that, swap in an ANN index.
- Only positive similarities (>0) are returned.

## Embedding backends

Three pluggable backends behind the `Embedder` interface (`internal/search/embeddings.go`):

| Backend | Selector | Dependencies | Quality | Speed |
|---------|----------|--------------|---------|-------|
| **Hash** | `hash` | None | Basic | Fastest |
| **ONNX** | `onnx` | Rust tokenizers + ONNX Runtime | Best | Fast (in-process) |
| **HTTP** | `http` | External service | Varies | Network-bound |

### Hash embedder

Feature hashing with FNV-64a. Includes unigram and bigram features. No ML dependencies. Good for tiny meshes, CI, or environments where you can't pull binary blobs.

### ONNX embedder

`internal/search/onnx_embedder.go`. Runs transformer models in-process:

| Model | Size | Notes |
|-------|------|-------|
| `all-MiniLM-L6-v2` | 90 MB | Smallest, fast |
| `bge-small-en-v1.5` | 130 MB | Default for `quick-install.sh` |
| `e5-small-v2` | 130 MB | Alternative quality target |

Pipeline: tokenize → ONNX inference → mean-pool → L2 normalize. Max sequence length 128 tokens. Pre-allocated tensors and a mutex make it safe for concurrent calls.

Models are downloaded on first use to `~/.zynd/models/<name>/` with SHA-256 integrity verification against the built-in registry (`internal/search/model_registry.go`).

### HTTP embedder

`internal/search/http_embedder.go`. Sends text to an OpenAI- or Ollama-compatible endpoint:

- 10 s request timeout.
- Returns the zero vector on error so search degrades gracefully (results just lose semantic signal — keyword still works).
- Response format auto-detected for OpenAI and Ollama.

## Ranking

`internal/ranking/`. Two algorithms:

### Weighted linear (default)

```
FinalScore = 0.30 · TextRelevance
           + 0.30 · SemanticSimilarity
           + 0.20 · TrustScore
           + 0.10 · Freshness
           + 0.10 · Availability
```

Weights are configurable in `[search.ranking]`.

| Component | Range | Source |
|-----------|-------|--------|
| `TextRelevance` | 0–1 | BM25 score, normalized. |
| `SemanticSimilarity` | 0–1 | Cosine similarity of embedding vectors. |
| `TrustScore` | 0–1 | EigenTrust aggregate (local=0.5, gossip=0.3 baseline before observations). |
| `Freshness` | 0–1 | Exponential decay: `exp(-0.023 · days_since_update)` — 0.5 at ~30 days. |
| `Availability` | 0–1 | From the Agent Card status: `online`=1.0, `degraded`=0.5, `offline`=0.0. |

### Reciprocal Rank Fusion (RRF)

```
RRF_score = Σ 1 / (60 + rank_i)
```

Combines the keyword and semantic ranking lists without weight tuning. Useful when datasets shift and the linear weights become poorly calibrated. Selectable per request.

## Result enrichment

When `enrich: true` is set on `POST /v1/search`, the top 10 results have their Agent Cards fetched and merged into the response. Cards come from the two-tier cache (LRU → Redis → HTTP), so enrichment is usually under 50 ms total. See [Agent Cards & Caching](/agentdns/cards-cache).

## Next

- **[DHT](/agentdns/dht)** — the third discovery layer used when an agent isn't in either local or gossip stores.
- **[Agent Cards & Caching](/agentdns/cards-cache)** — how `enrich: true` actually works.
