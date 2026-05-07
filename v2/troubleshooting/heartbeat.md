---
title: "Heartbeat Issues"
description: "Heartbeat never connects, keeps reconnecting, or your agent gets marked inactive."
---

# Heartbeat Issues

The SDK opens a **WebSocket to the registry** on start and pings every 30s. If it can't connect — or keeps dropping — the registry marks you `inactive` after 5 minutes of silence. Inactive entities don't show up in search.

## Symptom: never see `[heartbeat] connected` in logs

The SDK normally logs:

```
[heartbeat] connected — pinging every 30s
```

If you never see that line, walk through:

### 1. `websockets` package missing (Python only)

```
[heartbeat] websockets package missing — install zyndai-agent[heartbeat] or pip install websockets
```

```bash
pip install websockets
# or if your version of zyndai-agent ships the extra:
pip install "zyndai-agent[heartbeat]"
```

The agent will keep serving HTTP without the WS, but the registry will mark it inactive.

### 2. Outbound WSS blocked

```bash
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  -H "Sec-WebSocket-Version: 13" \
  https://zns01.zynd.ai/v1/heartbeat
```

You should see a `101 Switching Protocols` response. If you get a TCP timeout or a 403, your network is blocking outbound WSS. Common causes:

- Corporate proxy stripping the upgrade header.
- A firewall allowing HTTPS (443) for plain HTTP only.
- An aggressive AV / DPI tool.

Move the agent to a network without these restrictions, or get the proxy reconfigured.

### 3. Wrong registry URL

```bash
zynd auth whoami         # what the CLI is pointed at
cat agent.config.json | jq .registry_url   # what the agent is pointed at
```

A mismatch means the agent registered somewhere different than where you're checking. Update `registry_url` and restart.

### 4. Signature mismatch

If the registry's record of the agent's public key doesn't match the keypair the SDK is using, every heartbeat will be rejected with `signature_invalid`. Causes:

- You re-derived a key for the same agent name without updating the registry record.
- You manually replaced `keypair.json`.

Either re-register from scratch (`zynd deregister <id>` then run again) or `zynd info` to verify which key the registry expects.

## Symptom: connects, then drops every few minutes

### 1. Idle TCP timeout (corporate proxy / cloud LB)

Some proxies kill idle TCP after 60 s. The SDK pings every 30 s which usually keeps it alive — but if the proxy is more aggressive, you'll see reconnect spam.

Check for `ProxyConnect / TCP RST` lines in the SDK log. The fix is generally outside the SDK — either work around the proxy or use a different network.

### 2. Container restart loop

If the host process is being restarted (Docker `unless-stopped` after crashes, systemd `Restart=always` after failures), each restart re-opens the WSS. Watch host logs:

```bash
docker logs <container> --tail 50
journalctl -u <unit> --since "10 min ago"
```

Fix the underlying crash, not the heartbeat.

### 3. Two copies of the same agent

If you accidentally run two processes with the same agent keypair, they'll fight for the same heartbeat slot. Symptoms: rapid reconnect cycle, "stale heartbeat" warnings on the registry.

Use `entity_index` to derive a different keypair for the second instance, or run them under different agent names.

## Symptom: agent shows as `inactive` in search but the process is alive

### 1. Heartbeat looped without reaching the registry

Could be silently catching errors. Add debug logging:

```bash
LOGLEVEL=DEBUG zynd agent run
```

Look for socket errors after `[heartbeat] connected`.

### 2. Your registry's `inactive_threshold_seconds` is too low

Default is 300s. If you self-host with a smaller value, you might exceed it during normal jitter. Check `~/.zynd/config.toml` on the registry.

### 3. The bloom rebuild hasn't run yet

Sweep cycle is 60s. The bloom filter rebuild is 5 min. If your agent just sent its first heartbeat, give the registry 5 minutes before assuming search is broken.

## Diagnostic checklist

```bash
# 1. Can you reach the WSS endpoint?
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  -H "Sec-WebSocket-Version: 13" \
  https://zns01.zynd.ai/v1/heartbeat

# 2. Is the agent's record on the registry?
curl https://zns01.zynd.ai/v1/entities/zns:<id>

# 3. What's its status?
curl https://zns01.zynd.ai/v1/entities/zns:<id> | jq '.status, .last_heartbeat'

# 4. Is your local clock OK?
date -u
# Compare against the registry's response Date header
```

If `last_heartbeat` on step 3 keeps advancing but `status` stays `inactive`, the registry's sweep is the issue — file a bug. If `last_heartbeat` is frozen, your heartbeat isn't reaching the server.

## See also

- **[Build → Heartbeat & Liveness](../build/agents/heartbeat)** — what the heartbeat does and why.
- **[Registration Issues](./registration)** — if registration itself is the problem.
