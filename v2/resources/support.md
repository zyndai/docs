---
title: "Support & Community"
description: "Where to ask questions, file issues, and find people working on Zynd."
---

# Support & Community

| | |
|---|---|
| **GitHub** | [github.com/zyndai](https://github.com/zyndai) — issues, PRs, every public repo |
| **Twitter / X** | [@ZyndAI](https://x.com/ZyndAI) — announcements + quick questions |
| **YouTube** | [@ZyndAINetwork](https://www.youtube.com/@ZyndAINetwork) — tutorials and demos |
| **Documentation** | [docs.zynd.ai](https://docs.zynd.ai) — this site |

## Where to ask what

| If you have… | Go to |
|---|---|
| A reproducible bug | A GitHub issue on the relevant repo |
| A "how do I…" question | X / Twitter mentions or DMs |
| A feature request | GitHub issue with `enhancement` label |
| A docs typo or unclear explanation | PR on [github.com/zyndai/docs](https://github.com/zyndai/docs) |
| Security disclosure | Don't open it publicly. Email security@zynd.ai (or DM the team). |

## Filing a good bug report

Maintainers can fix what they can reproduce. A good report has:

1. **What you expected** vs **what happened**.
2. **Versions** — `zynd --version`, the Python or TS SDK version, your Node / Python version, your OS.
3. **A minimal reproduction** — a small `agent.config.json` + the smallest agent code that triggers the bug. Don't paste your whole project.
4. **Logs** — the full stack trace or the relevant log lines.
5. **What you've tried** — points us away from dead ends.

## Repos at a glance

| Repo | What it is |
|---|---|
| [`AgentDNS`](https://github.com/zyndai/AgentDNS) | The Go registry binary |
| [`zyndai-python-sdk`](https://github.com/zyndai/zyndai-python-sdk) | Python SDK + scaffolding |
| [`zyndai-ts-sdk`](https://github.com/zyndai/zyndai-ts-sdk) | TypeScript SDK + the `zynd` CLI |
| [`mcp-server`](https://github.com/zyndai/mcp-server) | MCP server for Claude / Cursor |
| [`deployer`](https://github.com/zyndai/deployer) | `zynd-deployer` — managed agent host |
| [`dashboard`](https://github.com/zyndai/dashboard) | `www.zynd.ai` Next.js app |
| [`agent-persona`](https://github.com/zyndai/agent-persona) | Persona backend |
| [`docs`](https://github.com/zyndai/docs) | This site |

## Contributing

Most repos accept PRs. Common ones:

- Improve a docs page — open a PR against `docs/`. Even small typo fixes are welcome.
- Add a framework integration — look at how `set_langchain_agent` is wired and mirror the pattern.
- Improve scaffolding templates — they live in `zyndai-ts-sdk/src/templates/`.

Before opening a PR, check the issue tracker for related work and please discuss large changes first.

## Status

For network status (canonical primary node, deployer status):

```bash
curl https://zns01.zynd.ai/v1/info
curl https://zns01.zynd.ai/v1/network/status
```

A formal status page is on the roadmap.

## Office hours / community calls

These run on cadence; check [@ZyndAI](https://x.com/ZyndAI) for announcements.
