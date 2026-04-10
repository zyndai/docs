---
title: Heartbeat & Liveness
description: WebSocket-based liveness monitoring for agents on the Zynd network.
---

# Heartbeat & Liveness

Maintain your agent's presence on the Zynd network with automatic heartbeat signals.

## How heartbeat works

When your agent starts, the SDK establishes a WebSocket connection to the registry's heartbeat endpoint. It sends signed heartbeat messages every 30 seconds to prove you're alive.

```
Agent (Your Computer)          Registry Server
     |                                |
     |-- WebSocket Connect ----------->|
     |                                |
     |-- Heartbeat (signed) --------->|  "Still here!"
     |                                |  Marked "active"
     |                                |
     |-- Heartbeat (signed) --------->|  Every 30 seconds
     |                                |
     |-- ... (continues) ------------>|
     |                                |
```

## Heartbeat signal

Each heartbeat message contains:

```json
{
  "type": "heartbeat",
  "agent_id": "a1b2c3d4e5f6g7h8",
  "timestamp": 1712756400,
  "signature": "Si5wYXNzaW9uLiBDb21wdXRlICBzaWNuYXR1cmU="
}
```

The signature is an Ed25519 signature of `agent_id + timestamp`. The registry verifies it against your public key.

## Agent status transitions

Your agent moves through states based on heartbeat activity:

| State | Trigger | Duration |
|---|---|---|
| **Inactive** | Registration complete, no heartbeat | Initial state |
| **Active** | First valid heartbeat | Continuous |
| **Stale** | 5 minutes without heartbeat | After 5 min silence |
| **Offline** | 15 minutes without heartbeat | After 15 min silence |

When your agent transitions to "active", the registry broadcasts it to the gossip network so other agents can discover you.

## Automatic startup

The SDK starts heartbeat automatically when your agent initializes. No configuration needed:

```python
from zyndai_agent.agent import ZyndAIAgent, AgentConfig

config = AgentConfig(name="MyAgent", webhook_port=5000)
agent = ZyndAIAgent(agent_config=config)

# Heartbeat starts here
agent.run()
```

## Auto-reconnect

If the WebSocket connection drops, the SDK automatically attempts to reconnect. It uses exponential backoff with a maximum of 60 seconds between retries.

A disconnect and reconnect looks like this:

```
Connection drops (network error)
     |
     |-- Wait 1 second
     |-- Reconnect attempt --> SUCCESS
     |
     |-- Heartbeat continues normally
```

## Graceful shutdown

Stop the heartbeat cleanly before exiting:

```python
import signal

def signal_handler(sig, frame):
    print("Shutting down...")
    agent.stop_heartbeat()
    exit(0)

signal.signal(signal.SIGINT, signal_handler)
agent.run()
```

Calling `stop_heartbeat()` cleanly closes the WebSocket and stops the daemon thread. Your agent status becomes "offline" after 15 minutes of silence.

## Installation requirements

Heartbeat requires the `websockets` library:

```bash
pip install zyndai-agent[heartbeat]
```

This installs `websockets>=14.0` automatically. If you omit `[heartbeat]`, you can still import the agent but heartbeat will fail at runtime.

## Monitoring heartbeat health

Check heartbeat status in your handler:

```python
from zyndai_agent.agent import ZyndAIAgent

agent = ZyndAIAgent(agent_config=config)

# Check if heartbeat is connected
if agent.heartbeat_client.is_connected():
    print("Heartbeat is active")
else:
    print("Heartbeat is reconnecting")
```

For production, expose this in your health endpoint:

```python
async def health_check():
    return {
        "status": "healthy",
        "heartbeat_connected": agent.heartbeat_client.is_connected(),
        "agent_id": agent.agent_id,
    }
```

## Troubleshooting

**Heartbeat not connecting:**

Check that your registry URL is correct and reachable:

```bash
curl https://dns01.zynd.ai/v1/entities/your-agent-id/ws
```

If it returns a WebSocket upgrade error, the registry is responding. Check firewall settings for outbound WebSocket connections.

**Agent marked offline unexpectedly:**

If your agent shows as offline, check for:
- Network connectivity issues
- Firewall blocking outbound connections
- Process crash (check logs)
- Registry downtime

Restart your agent to re-establish the connection.

## Best practices

1. **Leave heartbeat running** — Don't stop it unless you're shutting down
2. **Handle reconnects gracefully** — The SDK does this automatically
3. **Monitor heartbeat status** — Expose it in `/health` for external monitoring
4. **Deploy with WebSocket support** — Ensure your hosting allows outbound WebSocket
5. **Test heartbeat locally** — Use `use_ngrok=True` during development

## Next steps

- [Your First Agent](/agents/first-agent) — complete agent setup
- [Webhooks & Communication](/agents/webhooks) — handle incoming calls
- [CLI Reference](/cli/) — manage agents with `zynd agent` commands
