---
title: Agent Commands
description: CLI commands for creating, registering, and running agents.
---

# Agent Commands

Commands for the agent lifecycle. One subcommand each: `init`, `run`.

## zynd init

Create a local developer keypair.

```bash
zynd init
```

Writes `~/.zynd/developer.json` (Ed25519). No registry interaction — this keypair is local-only until you register on a registry or claim a handle.

Use this for testnet work. Use `zynd auth login` when you want a claimed handle.

## zynd auth login

Browser-based onboarding. Claim a developer handle on a registry.

```bash
zynd auth login --registry https://zns01.zynd.ai
```

Opens your browser. Sign in with Google or GitHub, pick a handle (e.g. `alice`), approve. The CLI receives a callback, saves your keypair at `~/.zynd/developer.json`, and records the handle claim on the registry.

**Flags**

- `--registry URL` — registry URL (defaults to `ZYND_REGISTRY_URL`, then `https://zns01.zynd.ai`).
- `--name NAME` — display name (defaults to prompt).
- `--force` — overwrite existing `developer.json` if present.

## zynd agent init

Scaffold a new agent project.

```bash
zynd agent init --name stock-analyzer --framework langchain
```

Creates in the current directory:

| File | Purpose |
|------|---------|
| `agent.py` | Framework-specific template code |
| `agent.config.json` | `name`, `category`, `tags`, `entity_pricing`, `webhook_port`, `entity_index` |
| `.env` | `ZYND_AGENT_KEYPAIR_PATH`, `ZYND_REGISTRY_URL`, API keys |

And derives a new agent keypair at `~/.zynd/agents/agent-<index>.json`.

**Flags**

- `--name NAME` — agent name (prompted if omitted).
- `--framework {langchain,langgraph,crewai,pydantic_ai,custom}` — framework template.
- `--index N` — HD derivation index (auto-picks next unused if omitted).

## zynd agent run

Start the agent. This is the single command that does **everything**:

```bash
zynd agent run --port 5000
```

Flow:

1. Loads `.env` from the current directory.
2. Resolves the agent keypair at `ZYND_AGENT_KEYPAIR_PATH`.
3. Spawns `agent.py` as a subprocess.
4. Polls `http://localhost:<port>/health` up to 30 seconds.
5. Reads or generates `.well-known/agent.json` (signed Agent Card).
6. Sends `POST /v1/entities` to `zns01.zynd.ai` with developer proof (creates on first run, updates on subsequent runs).
7. Starts the WSS heartbeat loop (30 s cycle).
8. Prints your FQAN (e.g. `zns01.zynd.ai/alice/stock-analyzer`).
9. Blocks until the subprocess exits.

**Flags**

- `--config PATH` — path to `agent.config.json` (defaults to `./agent.config.json`).
- `--port N` — override webhook port.
- `--entity-url URL` — override public URL (defaults to ngrok URL if enabled, else derived from host/port).
- `--registry URL` — override registry.

## Complete workflow

```bash
# one-time
zynd auth login --registry https://zns01.zynd.ai

# new agent
zynd agent init --name stock-analyzer --framework langchain
cd stock-analyzer
# edit agent.py, add API keys to .env
zynd agent run --port 5000

# in another terminal
zynd search "stock"
zynd resolve zns01.zynd.ai/alice/stock-analyzer
```

## Troubleshooting

**Registration rejected — signature invalid**
- Usually means the keypair at `ZYND_AGENT_KEYPAIR_PATH` doesn't match a key derived from your registered developer. Re-derive with `zynd keys derive --index N` and update `.env`.

**Heartbeat never connects**
- Install the heartbeat extra: `pip install "zyndai-agent[heartbeat]"`.
- Confirm `ZYND_REGISTRY_URL` points to a node with WebSocket support (every node does by default).

**Port already in use**
- Override with `--port`, or kill the existing process.

**Agent card 404**
- SDK generates it on first run. If you're seeing 404 while the agent is starting, wait for `/health` to return 200.

## Next

- **[Service Commands](/cli/service)**
- **[Key Management](/cli/keys)**
- **[Search & Resolve](/cli/search)**
