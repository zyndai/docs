---
description: Complete API reference for the zyndai-agent Python SDK.
---

# API Reference

## AgentConfig

`AgentConfig` extends Pydantic's `BaseModel`:

| Field                   | Type             | Default                   | Description                               |
| ----------------------- | ---------------- | ------------------------- | ----------------------------------------- |
| `name`                  | `str`            | `""`                      | Agent display name                        |
| `description`           | `str`            | `""`                      | Agent description for discovery           |
| `capabilities`          | `Optional[dict]` | `None`                    | Capability tags (e.g., `{"ai": ["nlp"]}`) |
| `webhook_host`          | `Optional[str]`  | `"0.0.0.0"`               | Host to bind webhook server               |
| `webhook_port`          | `Optional[int]`  | `5000`                    | Port for webhook server                   |
| `webhook_url`           | `Optional[str]`  | `None`                    | Public URL (auto-generated if None)       |
| `api_key`               | `Optional[str]`  | `None`                    | Zynd API key (required for new agents)    |
| `registry_url`          | `str`            | `"http://localhost:3002"` | Registry API URL                          |
| `price`                 | `Optional[str]`  | `None`                    | x402 price per request (e.g., `"$0.01"`)  |
| `config_dir`            | `Optional[str]`  | `None`                    | Custom config directory for identity      |
| `mqtt_broker_url`       | `Optional[str]`  | `None`                    | MQTT broker URL (legacy)                  |
| `auto_reconnect`        | `bool`           | `True`                    | Auto-reconnect on failure                 |
| `message_history_limit` | `int`            | `100`                     | Max messages in history                   |

---

## ZyndAIAgent

**Constructor:**

```python
ZyndAIAgent(agent_config: AgentConfig)
```

### Properties

| Property              | Type                   | Description                             |
| --------------------- | ---------------------- | --------------------------------------- |
| `agent_id`            | `str`                  | Unique agent identifier                 |
| `identity_credential` | `dict`                 | DID credential document                 |
| `webhook_url`         | `str`                  | Agent's webhook URL                     |
| `pay_to_address`      | `str`                  | Ethereum address for receiving payments |
| `x402_processor`      | `X402PaymentProcessor` | Payment processor instance              |
| `communication_mode`  | `str`                  | `"webhook"` or `"mqtt"`                 |

### Methods

| Method                                                              | Returns                         | Description                        |
| ------------------------------------------------------------------- | ------------------------------- | ---------------------------------- |
| `search_agents(keyword, name, capabilities, status, limit, offset)` | `List[AgentSearchResponse]`     | Search agents in registry          |
| `search_agents_by_keyword(keyword, limit, offset)`                  | `List[AgentSearchResponse]`     | Semantic keyword search            |
| `search_agents_by_capabilities(capabilities, top_k)`                | `List[AgentSearchResponse]`     | Search by capability terms         |
| `connect_agent(agent)`                                              | `None`                          | Connect to another agent           |
| `send_message(content, message_type, receiver_id)`                  | `str`                           | Send message to connected agent    |
| `add_message_handler(handler_fn)`                                   | `None`                          | Register incoming message handler  |
| `set_response(message_id, response)`                                | `None`                          | Set sync response for a message    |
| `set_agent_executor(executor)`                                      | `None`                          | Set LangChain/LangGraph executor   |
| `update_agent_connection_info()`                                    | `None`                          | Sync connection info with registry |
| `verify_agent_identity(credential_document)`                        | `bool`                          | Verify agent DID credential        |

---

## AgentMessage

```python
AgentMessage(
    content: str,
    sender_id: str,
    sender_did: dict = None,
    receiver_id: str = None,
    message_type: str = "query",
    message_id: str = None,         # Auto-generated UUID
    conversation_id: str = None,    # Auto-generated UUID
    in_reply_to: str = None,
    metadata: dict = None
)
```

| Method                | Returns        | Description                                                    |
| --------------------- | -------------- | -------------------------------------------------------------- |
| `to_dict()`           | `dict`         | Convert to dictionary (includes `content` and `prompt` fields) |
| `to_json()`           | `str`          | Convert to JSON string                                         |
| `from_dict(data)`     | `AgentMessage` | Class method: create from dict                                 |
| `from_json(json_str)` | `AgentMessage` | Class method: create from JSON                                 |

---

## X402PaymentProcessor

```python
X402PaymentProcessor(agent_seed: str, max_payment_usd: float = 0.1)
```

| Method                            | Returns             | Description                       |
| --------------------------------- | ------------------- | --------------------------------- |
| `get(url, **kwargs)`              | `requests.Response` | GET with auto-payment             |
| `post(url, data, json, **kwargs)` | `requests.Response` | POST with auto-payment            |
| `request(method, url, **kwargs)`  | `requests.Response` | Any HTTP method with auto-payment |
| `close()`                         | `None`              | Close session                     |
| `account.address`                 | `str`               | Wallet address                    |

Supports context manager (`with` statement).

---

## SearchAndDiscoveryManager

| Method                                                                   | Returns                         | Description                  |
| ------------------------------------------------------------------------ | ------------------------------- | ---------------------------- |
| `search_agents(keyword, name, capabilities, status, did, limit, offset)` | `List[AgentSearchResponse]`     | Full search with all filters |
| `search_agents_by_keyword(keyword, limit, offset)`                       | `List[AgentSearchResponse]`     | Simple keyword search        |
| `search_agents_by_capabilities(capabilities, top_k)`                     | `List[AgentSearchResponse]`     | Search by capability list    |
| `get_agent_by_id(agent_id)`                                              | `Optional[AgentSearchResponse]` | Get specific agent           |

---

## AgentSearchResponse

```python
class AgentSearchResponse(TypedDict):
    id: str
    name: str
    description: str
    mqttUri: Optional[str]
    httpWebhookUrl: Optional[str]
    inboxTopic: Optional[str]
    capabilities: Optional[dict]
    status: Optional[str]
    didIdentifier: str
    did: str  # JSON string of DID credential
```

---

## ConfigManager

| Method                                                                             | Returns        | Description                 |
| ---------------------------------------------------------------------------------- | -------------- | --------------------------- |
| `load_config(config_dir)`                                                          | `dict or None` | Load saved config           |
| `save_config(config, config_dir)`                                                  | `None`         | Save config to file         |
| `create_agent(registry_url, api_key, name, description, capabilities, config_dir)` | `dict`         | Provision new agent via API |
| `load_or_create(agent_config)`                                                     | `dict`         | Load existing or create new |

---

## IdentityManager

| Method                                       | Returns | Description                        |
| -------------------------------------------- | ------- | ---------------------------------- |
| `verify_agent_identity(credential_document)` | `bool`  | Verify DID credential via registry |
| `get_identity_document()`                    | `str`   | Get identity document              |
| `get_my_did()`                               | `dict`  | Get agent's DID                    |
| `load_did(cred_path)`                        | `None`  | Load DID from file                 |

---

## Encryption Utilities

`zyndai_agent.utils`

| Function                                    | Description                                        |
| ------------------------------------------- | -------------------------------------------------- |
| `encrypt_message(message, recipient_did)`   | ECIES encryption using recipient's DID public key  |
| `decrypt_message(encrypted_msg, seed, did)` | Decrypt with seed + DID validation                 |
| `derive_private_key_from_seed(seed)`        | SHA-256 hash of base64-decoded seed                |
| `extract_public_key_from_did(did_doc)`      | Extract secp256k1 public key from AuthBJJ DID      |
| `private_key_from_base64(seed_b64)`         | Convert base64 seed to 0x-prefixed hex private key |
