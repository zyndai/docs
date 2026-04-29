---
title: Lifecycle Modules
description: ZyndBase, ZyndAIAgent, ZyndService — the entity lifecycle from start() to stop().
---

# Lifecycle Modules

Three classes carry the entity from imported module to live, registered, heartbeating network participant: `ZyndBase`, `ZyndAIAgent`, `ZyndService`. They're all in `zyndai_agent/`.

## `ZyndBase`

`base.py`. The abstract parent. Owns everything *every* entity does, regardless of whether it wraps a framework or a plain function:

```mermaid
flowchart TD
    Init[__init__] --> Keypair[load or derive entity keypair]
    Keypair --> EntityId[entity_id = SHA-256(pubkey)[:16]]
    EntityId --> CardWrite[entity_card_loader.build()<br/>writes .well-known/agent.json]
    Init --> Webhook[webhook_communication.create_app()]

    Start[start] --> Register[dns_registry.register_entity]
    Register --> Heartbeat[start heartbeat thread]
    Register --> WebhookSrv[start Flask server]
    Heartbeat --> Loop{loop forever}
    Loop -->|every 30s| Sign[sign timestamp]
    Sign -->|WSS| Reg[zns01.zynd.ai/v1/heartbeat]
    Reg --> Loop
```

### Init responsibilities

1. **Resolve identity** — read or generate the entity keypair. Order of precedence:
   1. `keypair_path=` argument.
   2. `ZYND_AGENT_KEYPAIR_PATH` env var.
   3. Derive from `ZYND_DEVELOPER_KEYPAIR_PATH` + a hash of `(name, kind)`.
2. **Compute `entity_id`** — `zns:<hex>` (or `zns:svc:<hex>` for services) from `SHA-256(public_key)`.
3. **Build the Entity Card** — `entity_card_loader.build_card()` introspects subclasses (capabilities, schemas) and produces a signed `EntityCard`.
4. **Write the card** — `.well-known/agent.json` is written so HTTP probes return the live card.
5. **Create the Flask app** — `webhook_communication.create_app()` wires `/webhook`, `/webhook/sync`, and `/.well-known/agent.json` routes. Routes call back into the subclass's `_handle_message()`.

### `start()` responsibilities

1. **Register on the registry** — `dns_registry.register_entity(card, signature, developer_proof)`. The HD derivation proof is built from `~/.zynd/developer.json`.
2. **Optionally claim a ZNS name** — if `dev_handle` and `entity_name` are set in config.
3. **Start the heartbeat thread** — opens a single WSS to `${ZYND_REGISTRY_URL}/v1/heartbeat` and signs a `(entity_id, timestamp)` message every 30 s. Imports `websockets>=14.0` lazily — only loaded if the `[heartbeat]` extra is installed.
4. **Start the Flask server** — binds `0.0.0.0:webhook_port`. Optionally fronts with `pyngrok` if the `[ngrok]` extra is installed.
5. **Block** — `start(detached=False)` blocks the calling thread until SIGINT. `start(detached=True)` returns immediately for use in scripts that drive multiple agents.

### `stop()` responsibilities

1. Cancel the heartbeat thread.
2. Send `DELETE /v1/entities/{entity_id}` if `auto_deregister=True` (off by default — usually you keep the registration so the entity is still discoverable while offline).
3. Shut down Flask gracefully.

## `ZyndAIAgent`

`agent.py`. Extends `ZyndBase` for entities that wrap an LLM framework.

```python
config = AgentConfig(
    name="stock-analyzer",
    framework="langchain",
    description="Stock price analysis",
    capabilities={"finance": ["analyze"]},
    webhook_port=5050,
    entity_url="https://your-tunnel.example.com",
)

agent = ZyndAIAgent(config)
agent.set_executor(my_langchain_executor)   # or LangGraph compiled graph, etc.
agent.start()
```

### Framework adapters

`set_executor(obj)` accepts:

| Framework | Object |
|-----------|--------|
| LangChain | `AgentExecutor` |
| LangGraph | compiled graph |
| CrewAI | `Crew` instance |
| PydanticAI | `Agent` instance |
| Custom | any callable `(input: dict) → output: dict` |

The executor is invoked from `_handle_message()` when a webhook hit arrives. The result is wrapped in an `AgentMessage` reply, signed with the entity keypair, and either returned (sync) or POSTed back to the sender's webhook (async).

### Capability inference

If `capabilities` is omitted from `AgentConfig`, `entity_card_loader` introspects the executor's tools / nodes / steps and derives a capability list. This is best-effort — pinning capabilities explicitly in `AgentConfig` is recommended for production.

## `ZyndService`

`service.py`. Extends `ZyndBase` for entities that wrap a plain Python function.

```python
service = ZyndService(
    name="text-transform",
    description="Converts text to uppercase",
    webhook_port=5050,
    entity_url="https://your-tunnel.example.com",
)

service.set_handler(lambda payload: payload["text"].upper())
service.start()
```

The handler is `Callable[[dict], Any]`. The return value is wrapped into an `AgentMessage.payload` automatically; no envelope construction needed.

### When to use service vs agent

| Service | Agent |
|---------|-------|
| Pure function, no LLM | LLM in the loop |
| Stateless | May hold conversation state |
| Cheap to invoke | Expensive (LLM cost) |
| `entity_id` prefix `zns:svc:` | `zns:` |

`ZyndService` does **not** start an LLM — it's just a webhook + identity wrapper around your function. If your function happens to call an LLM internally, that's fine, but the SDK won't manage that.

## Putting it together

A minimal LangChain agent end-to-end:

```python
from zyndai_agent.agent import AgentConfig, ZyndAIAgent
from langchain_openai import ChatOpenAI
from langchain_classic.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_community.tools.tavily_search import TavilySearchResults

llm = ChatOpenAI(model="gpt-4o-mini")
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a research assistant."),
    ("placeholder", "{messages}"),
    MessagesPlaceholder("agent_scratchpad"),
])
exec = AgentExecutor(
    agent=create_tool_calling_agent(llm, [TavilySearchResults()], prompt),
    tools=[TavilySearchResults()],
)

config = AgentConfig(
    name="researcher",
    framework="langchain",
    capabilities={"research": ["web_search"]},
    webhook_port=5050,
    entity_url="https://your-tunnel.example.com",
)
agent = ZyndAIAgent(config)
agent.set_executor(exec)
agent.start()           # blocks
```

What happens at `start()`:

1. Identity loaded → entity_id `zns:<hash>`.
2. Entity Card written to `.well-known/agent.json` with the inferred capability `research.web_search` and an input/output schema derived from the executor.
3. `POST /v1/entities` registers on `zns01.zynd.ai`.
4. Heartbeat WSS opens; signed pings every 30 s.
5. Flask listens on `:5050`. ngrok tunnel auto-attached if `[ngrok]` extra is installed and `entity_url` isn't pre-set.
6. Blocks until Ctrl-C.

## Next

- **[Networking & Payments](/python-sdk-internals/networking)** — `dns_registry`, webhook server, x402.
