---
title: Deploy via deployer.zynd.ai
description: Upload your agent and get a live HTTPS URL in under a minute.
---

# Deploy via deployer.zynd.ai

End-to-end walkthrough. Start with a working local agent, end with a live HTTPS URL on the Zynd network.

## Prerequisites

- An agent or service scaffolded with `zynd agent init` or `zynd service init`.
- You ran it locally at least once — `/health` returns 200, agent.py executes without crashing.
- You **did not** include `~/.zynd/developer.json` inside the project folder. Keep your developer key on your machine only.

## 1. Prepare the project folder

Your project should look roughly like this:

```
my-agent/
├── agent.py                    # or service.py
├── agent.config.json
├── .env                        # OPENAI_API_KEY, etc. (NO ZYND_DEVELOPER_*)
├── requirements.txt            # optional — installed on first boot
└── .well-known/
    └── agent.json              # optional — regenerated at runtime
```

### What to include

- Your `agent.py` or `service.py`.
- `agent.config.json` / `service.config.json`.
- `.env` with your API keys (LLM, Tavily, etc.).
- A `requirements.txt` if you use packages not in the base image.

### What to exclude

- `developer.json` — validator rejects this.
- `__pycache__/`, `.venv/`, `node_modules/`.
- Anything over 50 MB total.

::: danger
Never include your developer private key in the upload. Only agent/service keypairs.
:::

## 2. Locate the agent keypair

Your keypair lives at `~/.zynd/agents/<name>.json` (or `~/.zynd/services/<name>.json`). You will upload this separately.

```bash
zynd keys list
```

Shows which keypair belongs to which entity index. Pick the one matching your agent.

## 3. Open the Deployer

Go to [deployer.zynd.ai](https://deployer.zynd.ai).

The landing page shows all current deployments (community-wide — there is no user login). Click **New deployment**.

## 4. Choose entity type

Tab selector at the top:

- **Agent** — for `ZyndAIAgent`-based projects.
- **Service** — for `ZyndService`-based projects.

The difference is which base image is used (`zynd-deployer/agent-base` vs `zynd-deployer/service-base`) and which config file the worker rewrites.

## 5. Drag your files

Two drop zones:

1. **Project folder** — drag the whole `my-agent/` directory. Your browser zips it client-side.
2. **keypair.json** — drag the file you found in step 2.

Validation runs instantly. Errors shown in a red box under the form:

- *"developer.json detected"* — remove it from the folder.
- *"keypair missing public_key field"* — wrong file.
- *"zip exceeds 50MB"* — strip binaries / large models.

## 6. Click Deploy

The form submits `multipart/form-data` to `POST /api/deployments`. The API encrypts both blobs with the master age key, inserts a `Deployment` row with `status=queued`, and returns the deployment ID.

You are redirected to `/d/<id>` — the detail page.

## 7. Watch it come up

The detail page streams worker progress in real time via SSE.

```
[2026-04-23T15:30:00Z] status=unpacking
[2026-04-23T15:30:02Z] extracted 42 files
[2026-04-23T15:30:02Z] status=allocating
[2026-04-23T15:30:02Z] port 13042 reserved
[2026-04-23T15:30:03Z] injected ZYND_ENTITY_URL=https://gentle-otter-42.deployer.zynd.ai
[2026-04-23T15:30:03Z] status=starting
[2026-04-23T15:30:05Z] container zynd-<id> started
[2026-04-23T15:30:05Z] status=health
[2026-04-23T15:30:07Z] /health 200
[2026-04-23T15:30:07Z] caddy route added
[2026-04-23T15:30:07Z] status=running
[2026-04-23T15:30:08Z] [stdout] Registered on zns01.zynd.ai
[2026-04-23T15:30:08Z] [stdout] FQAN: zns01.zynd.ai/alice/my-agent
```

Typical cold start: 5–15 seconds. First deploy may add 30–60 s for `pip install -r requirements.txt`.

## 8. Call your agent

Your agent is now reachable at:

```
https://<slug>.deployer.zynd.ai
```

The slug is generated from adjective + animal + number (e.g. `gentle-otter-42`).

Try it:

```bash
curl -X POST https://gentle-otter-42.deployer.zynd.ai/webhook/sync \
  -H "Content-Type: application/json" \
  -d '{"content": "Hello, agent"}'
```

Or find it on the registry:

```bash
zynd search my-agent
zynd resolve zns01.zynd.ai/alice/my-agent
```

## 9. Update or redeploy

- To push a new version: upload again as a new deployment. The new one takes over the ZNS name on its first registry PUT. Stop the old one.
- To change env vars or config: re-upload. Deployer does not mutate a running container.

## 10. Stop it

Click **Stop** on the detail page. Worker:

- Signals the container with SIGTERM (then SIGKILL after 10 s).
- Removes the Caddy route.
- Frees the port.
- Sets status to `stopped`.

Your registry entry stays until the 5-minute heartbeat timeout — then it's marked `inactive`. Or use `zynd deregister <entity_id>` to remove immediately.

## Injected environment

These env vars are injected into your container automatically:

| Var | Value |
|-----|-------|
| `ZYND_AGENT_KEYPAIR_PATH` | `/app/keypair.json` |
| `ZYND_SERVICE_KEYPAIR_PATH` | `/app/keypair.json` (for services) |
| `ZYND_REGISTRY_URL` | `https://zns01.zynd.ai` |
| `ZYND_WEBHOOK_PORT` | `5000` |
| `ZYND_ENTITY_URL` | `https://<slug>.deployer.zynd.ai` |

Your own `.env` values are merged in — the ZYND_* keys are not overwritten.

## Next

- **[Monitoring & Logs](/deployer/monitoring)** — deeper look at the live log stream and metrics.
- **[Troubleshooting](/deployer/troubleshooting)** — common failure modes.
- **[Self-Host Deployer](/deployer/self-host)** — run your own if you need tighter limits or privacy.
