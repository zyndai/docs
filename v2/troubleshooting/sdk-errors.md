---
title: "Common SDK Errors"
description: "ImportError, missing keypair, version mismatch, port already in use, and other startup failures."
---

# Common SDK Errors

The SDK fails before doing anything useful. Most causes are mundane.

## `ImportError: No module named 'zyndai_agent'` (Python)

```bash
pip install zyndai-agent
# Verify
python -c "import zyndai_agent; print(zyndai_agent.__version__)"
```

If you're using a virtualenv, make sure the same Python is on `$PATH` when you run `zynd agent run`. Check with `which python` inside the venv.

## `Cannot find module 'zyndai'` (TypeScript)

```bash
npm install zyndai
# Verify
node -e "console.log(require('zyndai/package.json').version)"
```

If you scaffolded the project with `zynd agent init` but never ran `npm install`, the deps aren't there yet. The CLI's "Next steps" output prints the exact line to run.

## `zynd: command not found`

The `zynd` CLI is shipped only by the npm package `zyndai`. Python users still need npm.

```bash
npm install -g zyndai
zynd --version    # should print 0.x.y
```

If npm complains about EACCES, configure a user-level prefix instead of using `sudo`. See [Install the SDK](../get-started/install-sdk#common-install-errors).

## `agent.config.json` not found

The SDK reads it from the **current working directory**. Run from inside the project folder, or pass the path explicitly:

```bash
cd my-agent
zynd agent run

# or
zynd agent run --config /path/to/agent.config.json    # not all CLI versions support this
```

## `Keypair not found at ...`

The SDK looks for the keypair at:

1. `ZYND_AGENT_KEYPAIR_PATH` env var.
2. `keypair_path` in `agent.config.json`.
3. `~/.zynd/agents/<name>/keypair.json` (default).

If none exists, the SDK errors. Fix:

```bash
zynd keys derive --index 0 --name my-agent
# Or re-run init:
zynd agent init --name my-agent --lang py --framework langchain
```

## `Failed to load keypair: invalid base64`

The JSON file at `developer.json` or `<agent>/keypair.json` is corrupted. Common causes:

- Edited by hand and re-saved with stray whitespace or quote escaping.
- Copy-pasted across systems with line ending conversion.

Restore from backup, or regenerate:

```bash
# Re-derive — same index → same keypair
zynd keys derive --index <N>
```

## `Address already in use` (port 5000)

Something else is on the port. Either kill it or pick another:

```bash
zynd agent run --port 5001
```

To find what's holding 5000:

```bash
lsof -iTCP:5000 -sTCP:LISTEN
```

## `OPENAI_API_KEY` not set

The framework you scaffolded (LangChain, LangGraph, etc.) needs an LLM key. The scaffold writes a placeholder `.env`:

```sh
OPENAI_API_KEY=
```

Fill it in:

```sh
OPENAI_API_KEY=sk-...
```

Then re-run.

## `cryptography` build fails on Linux

```bash
sudo apt install build-essential libssl-dev libffi-dev python3-dev
pip install --upgrade pip
pip install zyndai-agent
```

## `tsx: not found` (TypeScript)

`tsx` is in the scaffold's `devDependencies`. After `npm install`, it's at `node_modules/.bin/tsx`. The package.json scripts (`dev`, `start`) reference it via npm, so `npm run dev` works. If you want to call `tsx` directly:

```bash
npx tsx agent.ts
```

## Version mismatch — SDK rejects a registry response

```
RegistryError: schema_version mismatch — expected 0.2, got 0.3
```

The registry runs a newer protocol version than your SDK. Update:

```bash
pip install --upgrade zyndai-agent
# or
npm install -g zyndai@latest
```

If you can't upgrade, point at an older registry or pin your protocol version via env:

```bash
export ZYND_PROTOCOL_VERSION=0.2
```

## `pydantic.ValidationError` on `agent.config.json`

A required field is missing or has the wrong type. The error message names the field:

```
ValidationError: 1 validation error for AgentConfig
server_port
  field required (type=value_error.missing)
```

Fix the JSON file and re-run.

## TypeScript: `Cannot find module './payload.js'`

The TS scaffold imports `./payload.js` (with `.js`) because of ESM module resolution rules. Don't change it to `./payload.ts` — Node won't resolve it. The `.js` extension at runtime is the *output* of compiling `payload.ts`.

If you delete `payload.ts` by accident, regenerate the scaffold or copy the file from a fresh `zynd agent init`.

## Multiple agents on the same machine

To run two agents simultaneously, give each a different port and a different keypair:

```bash
# Terminal 1
cd agent-a; zynd agent run --port 5000

# Terminal 2
cd agent-b; zynd agent run --port 5001
```

Each project has its own `agent.config.json` with a unique `entity_index`, so the HD-derived keypairs don't collide.

## See also

- **[Get Started → Prerequisites](../get-started/prerequisites)** — install gotchas by OS.
- **[Reference → CLI](../reference/cli)** — every flag and command.
- **[Reference → Configuration](../reference/config)** — every config field.
