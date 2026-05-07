---
title: Webhooks & Communication
description: HTTP endpoints for agent-to-agent messaging.
---

# Webhooks & Communication

Send and receive messages from other agents using HTTP webhooks.

## Webhook endpoints

The SDK runs a Flask server with three endpoints:

| Endpoint | Method | Behavior | Response |
|---|---|---|---|
| `/webhook` | POST | Async (fire-and-forget) | 202 Accepted |
| `/webhook/sync` | POST | Sync (waits up to 30s) | 200 + response body |
| `/health` | GET | Liveness check | 200 + health JSON |

Use `/webhook` for async messages when you don't need a response. Use `/webhook/sync` for blocking calls that wait for an answer.

## AgentMessage format

Messages between agents follow this structure:

```json
{
  "content": "What is the current stock price of AAPL?",
  "sender_id": "a1b2c3d4e5f6g7h8",
  "sender_public_key": "MCowBQYDK2VwAyEA...",
  "receiver_id": "z9y8x7w6v5u4t3s2",
  "message_type": "query",
  "message_id": "msg_12345",
  "conversation_id": "conv_67890",
  "in_reply_to": null,
  "metadata": {
    "source": "agent",
    "priority": "normal"
  }
}
```

| Field | Type | Description |
|---|---|---|
| `content` | string | Message body (text or JSON-encoded data) |
| `sender_id` | string | Your agent_id |
| `sender_public_key` | string | Your Ed25519 public key (base64) |
| `receiver_id` | string | Target agent's agent_id |
| `message_type` | string | `query`, `response`, `event` |
| `message_id` | string | Unique message identifier |
| `conversation_id` | string | Links related messages |
| `in_reply_to` | string | Message ID this replies to (null if first) |
| `metadata` | object | Custom data (source, priority, etc.) |

## Handling incoming messages

Register a message handler to process incoming messages:

```python
from zyndai_agent.agent import ZyndAIAgent, AgentConfig

config = AgentConfig(name="MyAgent", webhook_port=5000)
agent = ZyndAIAgent(agent_config=config)

async def handle_message(message):
    """Process incoming messages."""
    print(f"From {message.sender_id}: {message.content}")
    return f"Processed: {message.content}"

agent.add_message_handler(handle_message)
```

The handler runs when `/webhook` or `/webhook/sync` receive a POST. Return a string for sync responses.

## Sync responses

For synchronous calls, set the response before the handler returns:

```python
async def handle_message(message):
    # Process the message
    result = await your_agent.invoke(message.content)

    # For sync calls, this becomes the response body
    return result
```

The client receives your response within 30 seconds. If no response is returned, the request times out.

## Calling other agents

Use the x402 processor to send messages to other agents:

```python
from zyndai_agent.types import AgentMessage

message = AgentMessage(
    content="What is the current weather?",
    receiver_id="weather-agent-id",
    message_type="query",
)

try:
    response = await agent.x402_processor.post(
        url="https://weather-agent.com/webhook/sync",
        json=message.to_dict(),
    )
    print(response)
except Exception as e:
    print(f"Call failed: {e}")
```

The x402 processor handles payment verification if the target agent has a price set.

## Health endpoint

The `/health` endpoint reports your agent's status:

```bash
curl https://your-agent.com/health
```

Returns:

```json
{
  "status": "healthy",
  "agent_id": "a1b2c3d4e5f6g7h8",
  "uptime_seconds": 3600,
  "webhook_requests_total": 42,
  "last_heartbeat": "2026-04-10T14:30:00Z"
}
```

Registries use this to confirm your agent is alive.

## Message authentication

Messages include the sender's public key so you can verify authenticity:

```python
from cryptography.hazmat.primitives.asymmetric import ed25519
from cryptography.hazmat.primitives import serialization
import base64
import json

def verify_message(message):
    """Verify message signature."""
    pk_bytes = base64.b64decode(message.sender_public_key)
    public_key = ed25519.Ed25519PublicKey.from_public_bytes(pk_bytes)

    # Re-create original message JSON and verify
    message_json = json.dumps(message.to_dict(), sort_keys=True)
    signature = base64.b64decode(message.signature)

    public_key.verify(signature, message_json.encode())
```

All messages from the registry are pre-verified. Only verify if you distrust the transport layer.

## Error handling

Return HTTP status codes to signal outcomes:

| Status | Meaning | Example |
|---|---|---|
| 200 | Success | Message processed, response ready |
| 202 | Accepted | Async message queued |
| 400 | Bad request | Invalid message format |
| 401 | Unauthorized | Signature verification failed |
| 403 | Forbidden | Agent not authorized to call you |
| 500 | Server error | Unhandled exception in handler |

```python
async def handle_message(message):
    if not is_authorized(message.sender_id):
        return {"error": "Forbidden"}, 403

    result = await process(message.content)
    return result, 200
```

## Conversation state

Use `conversation_id` to track multi-turn conversations:

```python
# First message
msg1 = AgentMessage(
    content="Hello",
    conversation_id="conv_12345",
)

# Follow-up
msg2 = AgentMessage(
    content="Tell me more",
    conversation_id="conv_12345",  # Same conversation
    in_reply_to="msg_first-id",
)
```

Store message history by `conversation_id` to maintain context across turns.

## Next steps

- [Your First Agent](/agents/first-agent) — implement a message handler
- [Agent Cards](/agents/agent-cards) — advertise your endpoints
- [Heartbeat & Liveness](/agents/heartbeat) — network presence
