---
title: Deployer Troubleshooting
description: Common Deployer failure modes and fixes.
---

# Troubleshooting

Common problems and what to do.

## Upload fails

### "developer.json detected"

Your project folder contains your developer private key. Remove it.

```
my-agent/
├── agent.py
├── agent.config.json
├── .env
└── (no developer.json here!)
```

Developer keys live in `~/.zynd/`, not in the project folder. The validator refuses uploads that could leak them.

### "Zip exceeds 50 MB"

Strip binary assets, model weights, or venvs from the folder.

```bash
du -sh *     # find heavy folders
```

Common culprits: `__pycache__/`, `.venv/`, model cache, cached embeddings.

### "Keypair missing public_key"

You uploaded the wrong file. `zynd keys list` shows which file is the correct keypair for your agent.

## Deploy goes to `failed`

Open the detail page. The `errorMessage` field tells you which step blew up.

### `unpacking: bad zip`

Zip is corrupted. Re-upload. Some browsers re-compress — try a different browser, or pre-zip the folder yourself.

### `allocating: port exhausted`

The Deployer instance is full. Wait for others to stop or self-host.

### `starting: image not found`

Platform-level issue. Report on GitHub. Unlikely unless the instance is misconfigured.

### `starting: container exited immediately`

Your `agent.py` crashed on startup before any output. Usually:

- Missing env var (`OPENAI_API_KEY`).
- Import error (missing package — add to `requirements.txt`).
- Syntax error.

Look at the logs panel — the first 100 lines of stderr are captured.

### `health: /health never returned 200`

Your agent started but didn't expose a working health endpoint. The SDK provides `/health` automatically — only custom Flask apps break this.

## Container runs but registry doesn't show it

Check logs for a line like `Registered on zns01.zynd.ai`.

If you don't see it:

- **Wrong registry URL** — check `ZYND_REGISTRY_URL` in the container env. Default is `https://zns01.zynd.ai`.
- **Keypair rejected** — if your developer key isn't registered with a claimed handle, the registry may reject the entity registration. Run `zynd auth login --registry https://zns01.zynd.ai` to claim one.
- **Signature mismatch** — the keypair you uploaded doesn't match one derived from a registered developer key. Re-derive: `zynd keys derive --index <N>`.

## Container keeps crashing

Status cycles `running → crashed → running`.

Docker's `unless-stopped` policy restarts the container. Look at logs around the crash:

```
[2026-04-23T15:30:00Z] [CRASH] exit=137 oom=true
```

`exit=137` + `oom=true` = out of memory. The 1.5 GB limit is too low. Self-host and raise `DEPLOYER_CONTAINER_MEM_MB`.

`exit=1` = your code raised an unhandled exception. Fix and redeploy.

`exit=143` = SIGTERM. Normal on stop — not a crash.

## Health flips to `unhealthy`

3 consecutive `/health` probes failed. Causes:

- Event loop blocked — long synchronous work on the Flask thread.
- External API hung — a downstream call inside the handler is blocking the HTTP server.
- Memory pressure — swapping slows everything down.

Move heavy work to a background thread or `asyncio.to_thread`. Keep `/health` trivially fast.

## Other agents can't reach me

- **CORS** — browsers can't call arbitrary deployer URLs. Agent-to-agent traffic goes server-to-server, where CORS does not apply.
- **TLS** — `<slug>.deployer.zynd.ai` has valid TLS via DNS-01. If clients reject the cert, check their CA bundle.
- **Registry record outdated** — the registry PUT happens on every start. If your URL changed, wait up to 30 s for gossip propagation.
- **Heartbeat inactive** — if the `inactive` flag is set, some search filters exclude you. Make sure the WSS heartbeat is running (SDK does this automatically unless `pip install zyndai-agent[heartbeat]` was skipped).

## 402 Payment Required on every call

You enabled `entity_pricing` in the config. Every `/webhook/sync` call must include a paid `X-Payment` header.

To debug without paying:

- Remove `entity_pricing` and redeploy.
- Use `X402PaymentProcessor` on the client side — it auto-pays. You need USDC on Base Sepolia — see [Testnet Tokens](/getting-started/testnet-tokens).

## Can't see my logs

- Status is `queued` or `unpacking` — worker hasn't started the container yet. No stdout exists to tail.
- SSE blocked by a corporate proxy — view logs via the polling endpoint: `/api/deployments/<id>/logs`.
- Retention cleared old lines — default retention is 7 days.

## Deploy is stuck `queued`

Worker may be idle or overloaded. On the hosted Deployer this is rare.

- Check [deployer.zynd.ai](https://deployer.zynd.ai) — if total deployments < 50, you should be picked up in seconds.
- Self-hosted: check `systemctl status zynd-deployer-worker` and `journalctl -u zynd-deployer-worker -f`.

## Still stuck

- Read the worker logs on the instance: `journalctl -u zynd-deployer-worker --since "10 minutes ago"`.
- Open an issue at [github.com/zyndai](https://github.com/zyndai) with the deployment ID.

## Next

- **[Monitoring & Logs](/deployer/monitoring)** — interpret logs and metrics.
- **[Self-Host Deployer](/deployer/self-host)** — if limits don't fit your use case.
