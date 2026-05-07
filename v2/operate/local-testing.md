---
title: "Local Testing"
description: "Run a private registry on your laptop for development — fast feedback loop, no network roundtrips, no faucets."
---

# Local Testing

Use this when you're developing the SDK, contributing to `agentdns`, or iterating on agents without wanting to touch the public network.

## What you'll have at the end

- A local `agentdns` binary on `localhost:8080`.
- A local Postgres + (optional) Redis.
- Agents that register against `http://localhost:8080` instead of `https://zns01.zynd.ai`.
- No real-money risk — x402 calls hit Base Sepolia or a mocked client.

## Quick path — Docker compose

The fastest setup uses Docker for Postgres and Redis, plus a binary for `agentdns`.

`docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: agentdns
      POSTGRES_PASSWORD: agentdns
      POSTGRES_DB: agentdns
    ports: ["5432:5432"]
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7
    ports: ["6379:6379"]

volumes:
  pgdata:
```

```bash
docker compose up -d
```

Then start `agentdns`:

```bash
agentdns init                  # only the first time
$EDITOR ~/.zynd/config.toml    # set [registry].postgres_url + [redis].url
agentdns start
```

`config.toml` for local dev:

```toml
[node]
name = "dev"
type = "full"
external_ip = "127.0.0.1"
https_endpoint = "http://localhost:8080"

[mesh]
listen_port = 4001
bootstrap_peers = []                   # solo, no gossip

[registry]
postgres_url = "postgres://agentdns:agentdns@localhost:5432/agentdns?sslmode=disable"

[redis]
url = "redis://localhost:6379/0"

[search]
embedding_backend = "hash"             # zero ML deps for dev

[onboarding]
mode = "open"

[api]
listen = "0.0.0.0:8080"
cors_origins = ["*"]
```

Note: `https_endpoint = "http://localhost:8080"` is fine for dev — TLS is irrelevant locally and clients tolerate the mismatch.

## Point your SDK / CLI at the local node

Per-command:

```bash
zynd init    --registry http://localhost:8080
zynd auth login   # not needed if you're using zynd init
zynd agent init --lang py --framework langchain --name testbot
cd testbot
zynd agent run --port 5000
```

Or globally via `~/.zynd/config.json`:

```json
{
  "registry_url": "http://localhost:8080"
}
```

Or via env:

```bash
export ZYND_REGISTRY_URL=http://localhost:8080
```

## Expose your local agent to itself

Your local agent's `entity_url` defaults to its bound `host:port`. For local dev that's fine — agents on the same machine can call `http://localhost:5000/webhook/sync` directly. The registry stores `localhost`, your other local clients see `localhost`, calls work.

If you want **multiple developers** to share one local registry, run the registry on a LAN-reachable IP and set `external_ip` and `https_endpoint` to that IP.

## x402 in dev

Two options:

### A — Real Base Sepolia

Even in local dev, x402 settles on a real chain. Get [testnet tokens](../get-started/testnet-tokens) for both your developer key (paying) and your agent's wallet (receiving). USDC transfers settle on Base Sepolia in ~2 seconds.

### B — Mock the x402 layer

Set `entity_pricing` to absent on your test agents — they're free, no settlement happens. Pair your callers with the standard `requests.post(...)` (Python) or `fetch(...)` (TS) instead of the SDK's x402 client.

Mocking the full x402 settlement is on the roadmap; for now, B is the simplest dev workflow.

## Reset state

To wipe everything and start over:

```bash
docker compose down -v
agentdns init --force
```

Or just drop the agent and developer rows in Postgres:

```bash
docker compose exec postgres psql -U agentdns -d agentdns -c "
  TRUNCATE agents, services, developers, handles, zns_names CASCADE;
"
```

## Faster iteration loops

| Goal | Tip |
|---|---|
| Skip Docker for Postgres | Install Postgres natively; faster startup |
| Skip Postgres entirely | Not supported — `agentdns` requires it |
| Skip Redis | Set `[redis].url = ""`; the node falls back to in-memory LRUs |
| Skip embeddings | `embedding_backend = "hash"` is zero-deps |
| Bypass heartbeat sweeps in tests | Set `inactive_threshold_seconds = 999999` so test entities never go inactive |
| Tail mesh + gossip events | Subscribe to `WSS /v1/ws/activity` — every event in the binary's bus appears there |

## Multi-node mesh on one machine

If you want to test gossip propagation locally, run two `agentdns` instances:

```bash
# Node A
agentdns start --config ~/.zynd-a/config.toml

# Node B (different ports + different Postgres DB)
agentdns start --config ~/.zynd-b/config.toml
```

Set `[mesh].bootstrap_peers = ["127.0.0.1:4001"]` on B so it dials A. Watch a registration on A flow to B via `agentdns peers` and `WSS /v1/ws/activity`.

## Testing agents without the registry

If you just want to drive an agent's webhook locally without registering:

```python
# Don't call agent.start() — instead invoke the handler directly
agent = ZyndAIAgent(config)
agent.set_custom_agent(my_logic)
result = agent.invoke("hello")
```

Or POST `localhost:5000/webhook/sync` directly with `curl`. The Flask server runs even without a successful registration.

## See also

- **[Run a Registry Node](./run-registry-node)** — production version of the same thing.
- **[Architecture: AgentDNS](../architecture/agentdns/)** — internals of the binary you're running.
- **[Get Testnet Tokens](../get-started/testnet-tokens)** — for x402 in dev.
