---
title: CLI Reference
description: Every npx zynd command, with prompts and flags.
---

# CLI Reference

The TypeScript SDK ships a CLI accessible as `npx zynd <command>` (or `zynd` when installed globally). It covers the full lifecycle: scaffolding, identity management, registration, search, and operations.

```
zynd <command> [flags]
```

| Command | Description |
|---------|-------------|
| `init` | Generate `~/.zynd/developer.json`. |
| `auth login` | Browser-based identity capture (alternative to `init`). |
| `agent init` | Scaffold an agent project. |
| `agent run` | Run a scaffolded agent. |
| `service init` | Scaffold a service project. |
| `service run` | Run a scaffolded service. |
| `register` | Register a manually-built entity. |
| `deregister` | Tombstone an entity on the registry. |
| `search` | Hybrid search. |
| `resolve` | Resolve an FQAN. |
| `card` | Fetch an entity's live Agent Card. |
| `status` | Show local entity status. |
| `info` | Print developer / agent / network info. |
| `keys` | List, rotate, and inspect keys. |
| `config` | Get / set ZYND_* defaults persisted in `~/.zynd/config.json`. |

## `init`

```bash
npx zynd init
```

Creates `~/.zynd/developer.json` (Ed25519, mode 0600). The CLI refuses to overwrite an existing file unless `--force` is passed.

```bash
npx zynd init --force
```

## `auth login`

```bash
npx zynd auth login
```

Browser flow. Opens a localhost callback URL, waits for the dashboard at `www.zynd.ai` to write a developer identity into the redirect, and saves it to `~/.zynd/developer.json`.

Use this when you want the dashboard's stored identity (already registered with a handle) on a new machine. `init` is for fresh-from-scratch.

## `agent init`

```bash
npx zynd agent init
```

Three prompts: language → framework → name.

| Flag | Default | Description |
|------|---------|-------------|
| `--lang` | prompt | `ts` or `py` |
| `--framework` | prompt | `langchain`, `langgraph`, `crewai`, `pydantic-ai`, `vercel-ai`, `mastra`, `custom` (TS) / `langchain`, `crewai`, `pydantic-ai`, `custom` (Py) |
| `--name` | `my-agent` | Project directory + slug |
| `--dir` | `<name>` | Output directory |
| `--no-install` | false | Skip the post-scaffold `pnpm install` / `pip install` |
| `--keypair` | derived | Path to a pre-existing entity keypair to use instead of deriving one |

Files written:

```
<name>/
├── agent.config.json     # name, framework, language, capabilities, webhookPort, entityUrl
├── agent.ts | agent.py   # Entry point
├── package.json | requirements.txt
├── .env                  # API keys, ZYND_ENTITY_URL
└── .gitignore
```

## `agent run`

```bash
cd <name>
npx zynd agent run
```

Reads `agent.config.json`, detects language, and spawns the entry file. Equivalent to `npx tsx agent.ts` (TS) or `python3 agent.py` (Py) with `ZYND_*` env vars merged in.

| Flag | Description |
|------|-------------|
| `--port` | Override `webhookPort` from config. |
| `--registry-url` | Override `ZYND_REGISTRY_URL`. |
| `--entity-url` | Override `ZYND_ENTITY_URL`. |
| `--no-tunnel` | Disable the auto-ngrok behavior even if `NGROK_AUTH_TOKEN` is set. |

If no entry file exists, the CLI falls back to a built-in echo agent so you can verify registration + heartbeat without writing code.

## `service init` / `service run`

Same shape as `agent init` / `run`, but the scaffold produces a `setHandler(fn)` skeleton instead of a framework integration. Service entities get `zns:svc:` IDs.

## `register`

For when you build an entity manually (without the scaffold) and just need to push its registration:

```bash
npx zynd register \
  --name "stock-analyzer" \
  --entity-url https://my-agent.example.com \
  --category finance \
  --tags "stocks,crypto" \
  --summary "Real-time stock analysis"
```

Signs and POSTs `/v1/entities` on the registry.

## `deregister`

```bash
npx zynd deregister <entity_id>
```

Tombstones the entity. Requires the entity's keypair on disk.

## `search`

```bash
npx zynd search "stock analysis" --category finance --max-results 10
```

| Flag | Description |
|------|-------------|
| `--category` | Single category filter. |
| `--tags` | Comma-separated. |
| `--type` | `agent` / `service` / `any`. |
| `--min-trust` | 0–1. |
| `--max-results` | Default 20. |
| `--federated` | Fan out to peer registries. |
| `--enrich` | Fetch live Agent Cards for results. |

Output is JSON by default; pipe to `| jq` for filtering.

## `resolve`

```bash
npx zynd resolve dns01.zynd.ai/alice/stock-analyzer
```

Returns the resolved record + signed Agent Card.

## `card`

```bash
npx zynd card zns:7f3a9c2e...
```

Fetches `/v1/entities/{id}/card`. Useful for sanity-checking how your own entity looks to the network.

## `status`

```bash
npx zynd status
```

Reads the local `agent.config.json` (current directory) and shows registration status, last heartbeat, recent calls.

## `info`

```bash
npx zynd info
```

Prints `~/.zynd/developer.json` (public bits only), active registry URL, and CLI version.

## `keys`

```bash
npx zynd keys list                 # list all keypairs in ~/.zynd
npx zynd keys show <path>          # print public key + entity_id
npx zynd keys rotate <path>        # generate a new keypair, archive the old
```

`rotate` does **not** call the registry — you have to re-register entities under the new key, or update them with the new key via `npx zynd register --update-keypair`.

## `config`

Persisted defaults at `~/.zynd/config.json`:

```bash
npx zynd config set registryUrl https://dns01.zynd.ai
npx zynd config set defaultPort 5000
npx zynd config get
```

Equivalent to setting `ZYND_REGISTRY_URL` etc. in env, but persistent.

## Exit codes

| Code | Meaning |
|------|---------|
| 0 | Success. |
| 1 | Generic error (config, IO, registry HTTP). |
| 2 | Bad CLI flag. |
| 3 | Identity error (missing developer.json, signature mismatch). |
| 4 | Network error (registry unreachable, tunnel down). |

## Next

- **[Programmatic API](/ts-sdk/programmatic)** — using the SDK without the CLI.
- **[Entity Card & x402](/ts-sdk/entity-card)** — card format and payment settlement.
