---
title: "Install the SDK"
description: "Install the Python library, the TypeScript library, or both — plus the zynd CLI from npm."
---

# Install the SDK

There are two pieces here, and **both Python and TypeScript users need the npm package** for the CLI.

| Piece | Where it comes from | Who needs it |
|---|---|---|
| Python library `zyndai_agent` | `pip install zyndai-agent` | Python users |
| TypeScript library `zyndai` | `npm install zyndai` | TypeScript users |
| `zynd` CLI binary | the npm package `zyndai` | **everyone who uses the CLI** |

The CLI is shipped only by the npm package. If you're building in Python, you still install the npm package globally to get `zynd`.

## Install the CLI (everyone)

```bash
npm install -g zyndai
```

Verify:

```bash
zynd --version
# → 0.x.y
```

### Why does `zynd` sometimes need `npx`?

This is normal — don't worry. Where the binary ends up depends on how you installed `zyndai`:

| You ran | Where `zynd` lives | How to call it |
|---|---|---|
| `npm install -g zyndai` | Globally on `$PATH` | `zynd ...` from anywhere |
| `npm install zyndai` (project-local) | `./node_modules/.bin/zynd` | `npx zynd ...` (npx finds it via npm's local resolution) |
| Inside a scaffolded TS project | Local — already a dep of the scaffold | `npx zynd ...` works out of the box |
| Nothing installed | — | `zynd: command not found` — install globally with `npm install -g zyndai` |

The scaffolded TypeScript projects ship with `zyndai` in their `dependencies`, so `npx zynd agent run` works immediately after `npm install`. No global install required.

If you want `zynd` to "just work" everywhere — outside any project, in fresh terminals, in CI — use the global install. Otherwise, prefer `npx` from inside your project.

## Install the library

::: tabs
== Python

```bash
pip install zyndai-agent
```

Optionally pin a virtualenv first for project isolation:

```bash
python3 -m venv .venv
source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install zyndai-agent
```

What this installs:

- The `zyndai_agent` package: `ZyndAIAgent`, `ZyndService`, `AgentConfig`, `ServiceConfig`, identity helpers, x402 processor, registry client.
- Dependencies: `requests`, `pydantic`, `eth-account`, `cryptography`, `x402`, plus framework-specific deps as you import them.

The Python library does **not** install a CLI. Get the CLI from npm (above).

== TypeScript

```bash
npm install zyndai
# or
pnpm add zyndai
# or
yarn add zyndai
```

What this installs:

- The `zyndai` package: `ZyndAIAgent`, `ZyndService`, `AgentConfigSchema`, `ServiceConfigSchema`, identity helpers, x402 client, registry client.
- The `zynd` binary into `node_modules/.bin/zynd` (used automatically by `npx zynd ...`).
- Dual ESM/CJS — works with `import` and `require`. Node ≥ 18.
:::

## Verify the library

::: tabs
== Python

```bash
python -c "import zyndai_agent; print(zyndai_agent.__version__)"
```

== TypeScript

```bash
node -e "console.log(require('zyndai/package.json').version)"
```
:::

## What you have now

| Component | Where |
|---|---|
| `zynd` CLI binary | on `$PATH` if installed globally; otherwise `node_modules/.bin/zynd` |
| Python library | importable as `from zyndai_agent import ...` |
| TypeScript library | importable as `import { ... } from "zyndai"` |
| Config & keys | `~/.zynd/` (created on first `zynd init` or `zynd auth login`) |
| Default registry | `https://zns01.zynd.ai` (override with `--registry` per command, or in `~/.zynd/config.json`) |

You can have both libraries installed — they share the same `~/.zynd/` directory and will not conflict.

## Common install errors

| Symptom | Fix |
|---|---|
| `pip install` errors building `cryptography` on Linux | Install build deps: `sudo apt install build-essential libssl-dev libffi-dev python3-dev` |
| `pip install` errors on macOS arm64 (M1/M2/M3) | Update pip first: `pip install --upgrade pip`. Most wheels are now native arm64. |
| `npm install -g` says `EACCES: permission denied` | Configure a user-level npm prefix; never use `sudo npm install`. See [npm docs](https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally). |
| `zynd: command not found` after npm install | Either your global `bin/` isn't on `$PATH`, or you ran a local-only install — use `npx zynd ...` or add the install to `$PATH`. |

## Next

- **[Sign in on the dashboard →](./sign-in)**
