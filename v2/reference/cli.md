---
title: "CLI Reference"
description: "Every zynd command and flag — verified against zynd v0.2.5. The CLI is shipped only by the npm package zyndai."
---

# CLI Reference

The `zynd` binary is shipped by the npm package **`zyndai`**. Install it once, regardless of whether you build agents in Python or TypeScript:

```bash
npm install -g zyndai
```

Verify:

```bash
zynd --version    # → 0.x.y
```

If you don't want a global install, `npx zynd ...` works inside any project that has `zyndai` in `node_modules`.

::: tip `zynd` vs `npx zynd` — which do I use?
Depends on how you installed it:

- **Global** (`npm install -g zyndai`) → `zynd` is on your `$PATH`. Use `zynd ...` directly.
- **Local to a project** (`npm install zyndai`, or inside a scaffolded TS project) → `zynd` lives in `./node_modules/.bin/`. Use `npx zynd ...` so npm's local-bin lookup finds it.
- **Neither** → you'll see `zynd: command not found`. Install globally with `npm install -g zyndai`.

Both calling conventions run the exact same binary — pick whichever fits your install. Inside the scaffolded TS projects, `npx zynd ...` always works because `zyndai` is already a dependency.
:::

## Top-level

```
Usage: zynd [options] [command]

Options:
  -V, --version             Output the version number
  --registry <url>          Override registry URL for this command
  -h, --help                Show help
```

| Command | Purpose |
|---|---|
| `zynd init` | Generate a developer keypair locally |
| `zynd auth login` | Browser-based dashboard pairing |
| `zynd auth whoami` | Print the active developer identity |
| `zynd keys list` / `create` / `derive` / `show` | Keypair management |
| `zynd agent init` / `run` | Scaffold and run an agent project |
| `zynd service init` / `run` | Scaffold and run a service project |
| `zynd register` / `deregister` | Manual registry writes (the SDK normally does these) |
| `zynd search <query>` | Hybrid search on the registry |
| `zynd resolve <fqan>` | Resolve a FQAN to an entity record |
| `zynd info` | Detailed entity info |
| `zynd status` | Check entity status |
| `zynd card build` / `show` / `validate` | Agent Card management |

## Identity & auth

### `zynd init`

Generate a fresh Ed25519 developer keypair locally.

```
Usage: zynd init [options]

Options:
  --force      Overwrite existing developer key
  -h, --help   Show help
```

Writes `~/.zynd/developer.json`. **Does not** claim a handle on the registry — use `zynd auth login` for that.

### `zynd auth login`

Browser-based onboarding — sign in to the dashboard, claim a handle, and pair this CLI to that identity.

```
Usage: zynd auth login [options]

Options:
  --name <name>   Developer display name
  --force         Overwrite existing developer keypair
  -h, --help      Show help
```

The `--registry <url>` flag is **top-level** (see [Top-level](#top-level)) — pass it before `auth login`:

```bash
zynd --registry https://zns01.zynd.ai auth login
```

If `~/.zynd/developer.json` already exists, the command fails. Add `--force` to overwrite:

```bash
zynd --registry https://zns01.zynd.ai auth login --force
```

If you omit `--registry`, the CLI reads `~/.zynd/config.json` (default `https://zns01.zynd.ai`). There is no automatic fallback or redirect — the URL in the config file is used as-is.

### `zynd auth whoami`

```
  Developer ID: zns:dev:322c0d04b3dfe5402abbe86045ec0a78
  Public key:   ed25519:+aKSwu+MhKIF1XyytuED3NIPL0ywvdiOJPeqGcAhxfA=
  Registry:     https://zns01.zynd.ai
  Keypair:      /home/dillu/.zynd/developer.json
```

## Key management

### `zynd keys list`

```
Developer key
  File    /home/dillu/.zynd/developer.json
  ID      zns:dev:322c0d04b3dfe5402abbe86045ec0a78
  Public  ed25519:+aKSwu+MhKIF1XyytuED3NIPL0ywvdiOJPeqGcAhxfA=
```

Lists every keypair the CLI knows about — developer key plus all per-agent and per-service keys under `~/.zynd/agents/<name>/keypair.json` and `~/.zynd/services/<name>/keypair.json`.

### `zynd keys create`

```
Usage: zynd keys create [options]

Options:
  --name <name>   Filename for the standalone keypair
  --force         Overwrite if present
```

Generates a standalone Ed25519 keypair (not HD-derived). Use this for one-off keys that don't tie back to your developer identity.

### `zynd keys derive`

```
Usage: zynd keys derive [options]

Options:
  --index <n>     HD derivation index (uint32)
  --name <name>   Custom name for the derived key
```

Derives an agent keypair from your developer key at the given index. Same index always produces the same keypair. Used internally by `zynd agent init`.

### `zynd keys show <name>`

Prints details for a specific keypair (e.g. `zynd keys show developer`).

## Agent lifecycle

### `zynd agent init`

```
Usage: zynd agent init [options]

Options:
  --lang <lang>            Target language (ts|py) — prompts if omitted
  --framework <framework>  Framework key — prompts if omitted
  --name <name>            Agent name — prompts if omitted
```

Frameworks: `langchain`, `langgraph`, `crewai`, `pydantic_ai`, `custom` (Python); `langchain`, `langgraph`, `vercel-ai`, `mastra`, `custom` (TypeScript).

Output (one example):

```
Agent "my-agent" scaffolded (Python).

  Language    Python
  Framework   LangChain
  Config      agent.config.json
  Entry       agent.py
  Payload     payload.py
  Env         .env
  Keypair     ~/.zynd/agents/my-agent/keypair.json
  Entity ID   zns:d52a64d115b84388459f40d9d913da7f
  Derived     from developer key (index 190)
```

### `zynd agent run`

```
Usage: zynd agent run [options]

Options:
  --port <port>   Override webhook port (default 5000)
```

Auto-detects TypeScript vs Python from the project layout. Starts the server, builds and signs the Agent Card, registers on the registry, and opens the heartbeat WSS.

## Service lifecycle

### `zynd service init`

```
Usage: zynd service init [options]

Options:
  --lang <lang>   Target language (ts|py)
  --name <name>   Service name
```

No `--framework` — services don't wrap one.

### `zynd service run`

```
Usage: zynd service run [options]

Options:
  --port <port>   Override webhook port (default 5000)
```

## Registry actions

### `zynd search <query>`

```bash
zynd search "stock analysis" --category finance --tags stocks --max-results 10 --federated
```

Hybrid search. Maps to `POST /v1/search`.

### `zynd resolve <fqan>`

```bash
zynd resolve zns01.zynd.ai/alice/stock-analyzer
```

Resolves a FQAN to a registry record + Agent Card. Maps to `GET /v1/resolve/{handle}/{name}`.

### `zynd register` / `zynd deregister`

Manual registry writes. The SDK normally does these for you on `zynd agent run`. Use `zynd deregister` to remove an entity immediately rather than waiting for the heartbeat timeout.

### `zynd info` / `zynd status`

```
Usage: zynd info   [options]   --entity-id <id> [--json]
Usage: zynd status [options]   --entity-id <id>
```

`info` returns the full registry record + card (or `--json` for raw). `status` is a quick health check.

## Agent Card

### `zynd card build`

Re-render `.well-known/agent-card.json` from the current `agent.config.json` without starting the server. Useful in CI or for static publishing.

### `zynd card show`

Pretty-print the current local Agent Card.

### `zynd card validate`

Check that an Agent Card has all the required A2A fields. Pass `--file <path>` to validate one from disk.

## Environment variables (read by the CLI)

| Variable | Default | Purpose |
|---|---|---|
| `ZYND_HOME` | `~/.zynd` | Override the config / keys directory |
| `ZYND_REGISTRY_URL` | `https://zns01.zynd.ai` | Override the default registry |
| `ZYND_AGENT_KEYPAIR_PATH` | `~/.zynd/agents/<name>/keypair.json` | Override the agent keypair path on `zynd agent run` |
| `ZYND_SERVICE_KEYPAIR_PATH` | `~/.zynd/services/<name>/keypair.json` | Override the service keypair path |
| `ZYND_ENTITY_URL` | bound host:port | Override the public URL written into the registry record |
| `ZYND_SERVER_PORT` | from config | Override server port |

## See also

- **[Configuration](./config)** — the `agent.config.json` schema and every env var.
- **[Python SDK API](./python-sdk)** — what the CLI is calling under the hood.
- **[TypeScript SDK API](./ts-sdk)** — same in TS.
