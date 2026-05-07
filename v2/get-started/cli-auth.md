---
title: "Authenticate the CLI"
description: "Pair your local zynd CLI with your dashboard developer identity, or generate a local-only key for testnet work."
---

# Authenticate the CLI

You have two options:

| Path | When to use | Result |
|---|---|---|
| **A — `zynd auth login`** *(recommended)* | You signed in on the dashboard and want to use the same handle | Handle on the network + key on disk |
| **B — `zynd init`** *(testnet only)* | You want to play around without touching the dashboard | Anonymous local key, no handle |

You can switch from B → A any time by running `zynd auth login` later.

## Path A — Pair with your dashboard identity

```bash
zynd --registry https://zns01.zynd.ai auth login
```

`--registry` is a **top-level flag** — it goes **before** `auth login`, not after. The subcommand itself only takes `--name` and `--force`.

If you've already got a `~/.zynd/developer.json` from a previous login or `zynd init`, the CLI refuses to overwrite it. Add `--force` to replace:

```bash
zynd --registry https://zns01.zynd.ai auth login --force
```

What happens:

1. CLI opens a browser tab to the dashboard's CLI pairing page with a one-time code.
2. Sign in (or, if already signed in, just confirm).
3. The dashboard hands the keypair to the CLI over the pairing channel.
4. CLI writes `~/.zynd/developer.json`.
5. Browser tab closes. CLI prints your developer identity.

### What if I omit `--registry`?

The CLI reads `~/.zynd/config.json`, which defaults to:

```json
{ "registry_url": "https://zns01.zynd.ai" }
```

So omitting `--registry` works as long as that file points where you want. There is **no automatic redirect** — the CLI uses whatever URL is configured, full stop. Use `--registry` when you want to log into a different node (a self-hosted one, a private mesh) for one command without changing the default.

Optional subcommand flags:

| Flag | Purpose |
|---|---|
| `--name <display-name>` | Set your developer display name |
| `--force` | Overwrite an existing `~/.zynd/developer.json` |

::: warning ~/.zynd/developer.json is your private key
Treat it like an SSH private key. Don't commit it. Don't paste it. Don't put it in environment variables. The CLI uses it to sign every registration and update.
:::

## Path B — Local-only keypair

```bash
zynd init
```

Generates a fresh Ed25519 keypair at `~/.zynd/developer.json`. No handle, no dashboard pairing. Output:

```
✔ generated developer keypair
  developer_id: zns:dev:7f3a9c2e6b1d4ec0
  saved to:     ~/.zynd/developer.json
```

Agents you build with this key get IDs like `zns:abc123…` but **not** human-readable FQANs (`zns01.zynd.ai/alice/stock-bot` requires a claimed handle).

## Verify

```bash
zynd auth whoami
```

Output:

```
  Developer ID: zns:dev:322c0d04b3dfe5402abbe86045ec0a78
  Public key:   ed25519:+aKSwu+MhKIF1XyytuED3NIPL0ywvdiOJPeqGcAhxfA=
  Registry:     https://zns01.zynd.ai
  Keypair:      /home/dillu/.zynd/developer.json
```

You can also list every key the CLI knows about:

```bash
zynd keys list
```

## Switching machines

Your developer identity is one keypair. To use it from a second machine, copy `~/.zynd/developer.json` securely (e.g., via `scp` to a path you trust) and re-run `zynd status` to confirm.

::: tip Re-deriving from the dashboard
If you lose the file, run `zynd auth login` again from any machine. The dashboard re-encrypts the key under a new pairing code and hands it to your CLI — so as long as you can sign into the dashboard, you can recover the CLI key.
:::

## Where to next

If you plan to test x402 micropayments — and you should, since pricing is core to Zynd — grab some testnet tokens first:

- **[Get Testnet Tokens →](./testnet-tokens)**

Otherwise jump straight to scaffolding:

- **[Your First Agent →](./first-agent)**
