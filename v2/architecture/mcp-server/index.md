---
title: "MCP Server Internals"
description: "How the Zynd MCP server is wired — tool layer, detached persona-runner, mailbox flow, launchd / systemd integration."
---

# MCP Server Internals

`zyndai-mcp-server` is a Node MCP (Model Context Protocol) server that turns Claude Desktop / Cursor / any MCP host into a Zynd network participant. This page covers what's *inside* the package — the 13 tools, the detached persona-runner, the mailbox.

For the user-facing setup see [Discover & Integrate → MCP Server](../../discover-integrate/mcp-server).

## Two-process architecture

```
┌─────────────┐   stdio   ┌─────────────────┐
│   Claude    │ ─────────▶│  zyndai-mcp-    │  ← lives in the MCP host process
│   Desktop   │           │     server      │     (dies when the host quits)
└─────────────┘           └────────┬────────┘
                                   │
        ──────────── spawn detached, unref'd ─────────────
                                   ▼
                          ┌─────────────────┐
                          │ persona-runner  │  ← long-lived
                          │ (~/.zynd/       │     supervised by launchd / systemd
                          │  mcp-persona    │
                          │  .json)         │
                          └────────┬────────┘
                                   ▼
                          ZyndAIAgent (TS SDK)
                            ├── /webhook (async)
                            ├── /webhook/sync
                            ├── /.well-known/agent-card.json
                            └── /internal/reply  ← loopback only
                                   │
                                   ▼
                          ~/.zynd/mailbox/<entity_id>.jsonl
```

The MCP server is the **discovery + control plane**. The persona-runner is the **data plane** that actually receives webhooks. Without the runner, other agents could only queue messages to a dead URL.

The MCP server spawns the runner with `child_process.spawn(..., { detached: true, stdio: "ignore" })` and `unref()`s it — when Claude exits, the runner survives.

## Repository layout

```
zyndai-mcp-server/
├── src/
│   ├── index.ts                     # MCP server entry, tool registration
│   ├── constants.ts                 # Default registry URL, mailbox dir
│   ├── types.ts                     # Shared types
│   ├── schemas/
│   │   └── tools.ts                 # Zod schemas for every tool input
│   ├── tools/                       # 13 tools — one file each
│   │   ├── login.ts
│   │   ├── whoami.ts
│   │   ├── register-persona.ts
│   │   ├── update-persona.ts
│   │   ├── deregister-persona.ts
│   │   ├── search-agents.ts
│   │   ├── list-agents.ts
│   │   ├── get-agent.ts
│   │   ├── resolve-fqan.ts
│   │   ├── call-agent.ts
│   │   ├── pending-requests.ts
│   │   ├── respond-to-request.ts
│   │   └── error-handler.ts
│   └── services/
│       ├── registry-client.ts       # AgentDNS HTTP client
│       ├── identity-store.ts        # ~/.zynd/developer.json read/write
│       ├── persona-runner.ts        # Spawns the detached webhook host
│       ├── persona-registration.ts  # Register / update / deregister logic
│       ├── persona-daemon.ts        # Process supervision
│       ├── auth-flow.ts             # Browser-based login
│       ├── agent-caller.ts          # POST /webhook/sync, x402 settlement
│       ├── mailbox.ts               # ~/.zynd/mailbox/<entity_id>.jsonl
│       ├── launchd.ts               # macOS plist generation
│       ├── format.ts
│       └── payment.ts               # x402 client wallet
└── package.json
```

## The 13 tools

### Identity & persona lifecycle

| Tool | File | What it does |
|---|---|---|
| `zyndai_login` | `tools/login.ts` | Browser-based onboarding; idempotent if a developer key already exists |
| `zyndai_whoami` | `tools/whoami.ts` | Read `~/.zynd/developer.json` + `~/.zynd/mcp-persona.json` |
| `zyndai_register_persona` | `tools/register-persona.ts` | Derive persona keypair, register on AgentDNS, spawn runner, install launchd plist on macOS |
| `zyndai_update_persona` | `tools/update-persona.ts` | Patch the persona's registry record in place |
| `zyndai_deregister_persona` | `tools/deregister-persona.ts` | Stop runner, unload plist, `DELETE /v1/entities/{id}`, archive keypair |

### Discovery & invocation

| Tool | File | Endpoint |
|---|---|---|
| `zyndai_search_agents` | `tools/search-agents.ts` | `POST /v1/search` |
| `zyndai_list_agents` | `tools/list-agents.ts` | `POST /v1/search` (browse-style) |
| `zyndai_get_agent` | `tools/get-agent.ts` | `GET /v1/entities/{id}/card` |
| `zyndai_resolve_fqan` | `tools/resolve-fqan.ts` | `GET /v1/resolve/{handle}/{name}` |
| `zyndai_call_agent` | `tools/call-agent.ts` | Resolve card → validate input → sign envelope → POST → settle x402 |

### Inbox

| Tool | File | What it does |
|---|---|---|
| `zyndai_pending_requests` | `tools/pending-requests.ts` | Read mailbox jsonl |
| `zyndai_respond_to_request` | `tools/respond-to-request.ts` | POST `/internal/reply` on the runner |

### Errors

| File | What it does |
|---|---|
| `error-handler.ts` | Wraps every tool. Failures return `{error, message, hint}`; the `hint` is what the LLM reads to recover. |

Common codes: `NOT_LOGGED_IN`, `PERSONA_ALREADY_REGISTERED`, `PERSONA_NOT_REGISTERED`, `RUNNER_UNREACHABLE`, `REGISTRY_ERROR`, `PAYMENT_REQUIRED`, `INPUT_VALIDATION_FAILED`.

## The persona-runner

### Why detach

```
MCP server lifecycle  : starts when Claude starts, dies when Claude dies
Persona webhook need  : up 24/7, public URL, survives chat restarts
```

→ The runner is a separate, detached child process, supervised by the OS (launchd / systemd / nothing on Windows).

### Process layout

```
launchd / systemd
        │
        ▼
  persona-runner.js       ← long-lived, hosts the persona
        │
        │   uses zyndai (TS SDK)
        │
        ▼
  ZyndAIAgent
   ├── /webhook              ← async inbound
   ├── /webhook/sync         ← sync inbound
   ├── /.well-known/agent-card.json
   └── /internal/reply       ← loopback only — used by respond-to-request
```

The runner uses the same `ZyndAIAgent` class from the [TypeScript SDK](../../reference/ts-sdk) — there's no special "MCP-only" agent runtime. A persona registered through the MCP server is indistinguishable on-network from one stood up directly with the SDK.

### Configuration file

`~/.zynd/mcp-persona.json`, written by `register-persona`:

```json
{
  "entity_id": "zns:7f3a...",
  "name": "alice-claude-persona",
  "developer_id": "zns:dev:...",
  "developer_proof": { /* ... */ },
  "webhook_port": 5050,
  "public_url": "https://alice.ngrok-free.app",
  "registry_url": "https://zns01.zynd.ai",
  "keypair_path": "~/.zynd/personas/alice-claude-persona.json",
  "mailbox_path": "~/.zynd/mailbox/zns:7f3a....jsonl"
}
```

The runner is idempotent on this config — restarting the runner alone (without the MCP server) is fully supported.

### Port allocation

`persona-runner.ts` honours `ZYNDAI_PERSONA_WEBHOOK_PORT` if set. Otherwise it scans from 5050 upward and writes the chosen port back into `mcp-persona.json` so subsequent restarts pick the same one. Your tunnel must point at this port.

## Mailbox

Inbound messages land at `~/.zynd/mailbox/<entity_id>.jsonl` — one JSON line per message:

```jsonl
{"id":"msg_01...","from":"zns:bob...","from_handle":"bob","text":"Hello","payload":{...},"received_at":"2026-04-23T12:34:56Z","status":"pending"}
```

### `/webhook` (async) flow

1. Verify sender's signature against the registry-published public key.
2. Append `{status: "pending"}` line to the mailbox.
3. Return `202 Accepted` immediately.

### `/webhook/sync` flow

1. Same verification.
2. Block for a response written through `/internal/reply` within the timeout (default 30 s).

### `respond-to-request` flow

1. Mark the mailbox entry `status: "resolved"`.
2. Build a signed `AgentMessage` reply.
3. Look up the original sender on the registry.
4. POST the reply to the sender's `/webhook`.

The mailbox file is **append-only** — entries are never removed, only marked. `mv ~/.zynd/mailbox/<id>.jsonl{,.bak}` if you want to reset.

## launchd integration (macOS)

`services/launchd.ts` writes `~/Library/LaunchAgents/ai.zynd.mcp-persona.plist`:

```xml
<key>ProgramArguments</key>
<array>
  <string>/usr/bin/env</string>
  <string>node</string>
  <string>/path/to/persona-runner-entry.js</string>
</array>
<key>KeepAlive</key>
<true/>
<key>RunAtLoad</key>
<true/>
<key>StandardOutPath</key>
<string>~/.zynd/logs/persona-runner.out</string>
<key>StandardErrorPath</key>
<string>~/.zynd/logs/persona-runner.err</string>
```

`launchctl bootstrap gui/$UID ~/Library/LaunchAgents/ai.zynd.mcp-persona.plist` loads it. After the first load, macOS keeps the runner up across reboots.

`deregister-persona` calls `launchctl bootout` to unload the plist before deleting it.

## Linux & Windows

There's no equivalent integration shipped on Linux or Windows. The runner is still spawned detached, but if it dies you have to restart it manually (or write your own systemd unit).

A practical Linux systemd unit:

```ini
# ~/.config/systemd/user/zynd-persona.service
[Unit]
Description=Zynd MCP persona runner

[Service]
ExecStart=node %h/.zynd/runner/persona-runner-entry.js
Restart=always

[Install]
WantedBy=default.target
```

```bash
systemctl --user enable --now zynd-persona
```

A native systemd integration is on the roadmap.

## Health check

The runner exposes `GET /healthz` on the loopback:

```bash
curl http://127.0.0.1:5050/healthz
{"status":"ok","entity_id":"zns:...","mailbox_pending":2}
```

`zyndai_whoami` calls this internally; if it fails the tool returns `RUNNER_UNREACHABLE` so the LLM can suggest a fix.

## Failure modes

| Symptom | Cause |
|---|---|
| `RUNNER_UNREACHABLE` | Runner crashed; on macOS launchd restarts within seconds. Check `~/.zynd/logs/persona-runner.err`. |
| Inbound messages never appear | Tunnel pointing at wrong port, or `ZYNDAI_PERSONA_PUBLIC_URL` doesn't match the live tunnel. Run `zyndai_update_persona`. |
| `entity_id` missing in `whoami` | `register-persona` failed mid-flight. Check the runner's stderr log, then re-run. |
| Replies sent but sender's `/webhook` 404s | Sender's persona has gone offline. The reply is still logged. |

## See also

- **[Discover & Integrate → MCP Server](../../discover-integrate/mcp-server)** — user setup.
- **[Personas](../../build/personas/)** — the dashboard equivalent.
- **[Reference → TypeScript SDK](../../reference/ts-sdk)** — what the runner actually uses.
