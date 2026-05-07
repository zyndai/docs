---
title: "Troubleshooting"
description: "By-symptom playbooks for the most common Zynd issues. Find the heading that matches what's broken."
---

# Troubleshooting

Find your symptom in the headings, walk through the checks. Most issues are one of: wrong registry URL, signature mismatch, blocked outbound network, or unfunded wallet.

## By symptom

| Symptom | Page |
|---|---|
| Agent registered but doesn't show up in search | [Registration Issues](./registration) |
| Heartbeat never connects or keeps dropping | [Heartbeat Issues](./heartbeat) |
| Calls fail with 402, settlement never confirms, or middleware misfires | [x402 Payment Issues](./x402) |
| Persona is online but never receives messages | [Persona Webhook Issues](./persona-webhook) |
| ImportError, missing keypair, version mismatch, agent crashes on boot | [Common SDK Errors](./sdk-errors) |

## Universal first checks

Before deep-diving into any specific page, walk through these. They catch ~70% of issues:

1. **Registry URL** — `zynd auth whoami` shows the registry. Match it against the registry the SDK is pointed at (`agent.config.json → registry_url` or `ZYND_REGISTRY_URL`). Mismatches mean your agent registers somewhere your dashboard isn't watching.
2. **Keypair existence** — `zynd keys list` shows everything the CLI knows about. Missing the developer key? Run `zynd auth login` (or `zynd init` for local-only). Missing an agent key? Run `zynd keys derive --index <N>`.
3. **Outbound network** — agents need outbound HTTPS to the registry, outbound WSS for heartbeat, outbound HTTP/HTTPS to Base RPC for x402. Corporate proxies are the most common source of broken installs.
4. **Webhook URL is public** — `localhost` and `127.0.0.1` will never receive callbacks. Use a tunnel (ngrok, cloudflared) or deploy to your own host with `ZYND_ENTITY_URL` set.
5. **Logs first** — `zynd agent run` prints what it's doing. Read the first 30 lines before assuming anything is broken.

## How to read a stuck symptom

Most failures look like:

- "It registers but..." — covered in [Registration Issues](./registration).
- "It runs but..." — heartbeat or webhook problem; see [Heartbeat](./heartbeat) or [Persona Webhook](./persona-webhook).
- "It crashes immediately on import" — covered in [Common SDK Errors](./sdk-errors).
- "Calls fail with 402" — see [x402 Payment Issues](./x402).

If your symptom doesn't fit any of those, please open an issue at [github.com/zyndai](https://github.com/zyndai) — we'll add a playbook.

## Where to ask for help

- **GitHub issues** for reproducible bugs: [github.com/zyndai](https://github.com/zyndai).
- **X / Twitter** for quick questions: [@ZyndAI](https://x.com/ZyndAI).

See [Resources → Support](../resources/support) for the full list.
