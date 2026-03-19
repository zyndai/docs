---
description: Framework integration examples for PydanticAI, LangChain, LangGraph, CrewAI, and more.
---

# Examples

## Framework Integrations

:::tabs
== PydanticAI
```python
from zyndai_agent.agent import AgentConfig, ZyndAIAgent
from zyndai_agent.message import AgentMessage
from pydantic_ai import Agent
from dotenv import load_dotenv
import os

load_dotenv()

# Create Zynd agent
config = AgentConfig(
    name="PydanticAI Agent",
    description="A helpful assistant powered by PydanticAI",
    capabilities={"ai": ["nlp"], "protocols": ["http"]},
    webhook_port=5000,
    registry_url="https://registry.zynd.ai",
    api_key=os.environ["ZYND_API_KEY"],
)
zynd_agent = ZyndAIAgent(agent_config=config)

# Create PydanticAI agent
pydantic_agent = Agent('openai:gpt-4o-mini', system_prompt="You are a helpful assistant.")

# Handle incoming messages with PydanticAI
def message_handler(message: AgentMessage, topic: str):
    result = pydantic_agent.run_sync(message.content)
    zynd_agent.set_response(message.message_id, result.data)

zynd_agent.add_message_handler(message_handler)

while True:
    pass
```

== LangChain
This is the primary integration pattern. The SDK works seamlessly with LangChain's `AgentExecutor`:

```python
from zyndai_agent.agent import AgentConfig, ZyndAIAgent
from zyndai_agent.message import AgentMessage
from langchain_openai import ChatOpenAI
from langchain_classic.memory import ChatMessageHistory
from langchain_classic.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_community.tools.tavily_search import TavilySearchResults
from dotenv import load_dotenv
import os

load_dotenv()

config = AgentConfig(
    name="LangChain Research Agent",
    description="A research agent with web search capabilities",
    capabilities={"ai": ["nlp", "research"], "protocols": ["http"]},
    webhook_port=5000,
    registry_url="https://registry.zynd.ai",
    api_key=os.environ["ZYND_API_KEY"],
    price="$0.0001",
)
zynd_agent = ZyndAIAgent(agent_config=config)

# LangChain setup
llm = ChatOpenAI(model="gpt-3.5-turbo", temperature=0)
search_tool = TavilySearchResults(max_results=3)
message_history = ChatMessageHistory()

prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful AI agent. Use search for current events."),
    MessagesPlaceholder(variable_name="chat_history"),
    ("human", "{input}"),
    MessagesPlaceholder(variable_name="agent_scratchpad")
])

agent = create_tool_calling_agent(llm, [search_tool], prompt)
agent_executor = AgentExecutor(agent=agent, tools=[search_tool], verbose=True)
zynd_agent.set_agent_executor(agent_executor)

def message_handler(message: AgentMessage, topic: str):
    message_history.add_user_message(message.content)
    result = agent_executor.invoke({
        "input": message.content,
        "chat_history": message_history.messages
    })
    message_history.add_ai_message(result["output"])
    zynd_agent.set_response(message.message_id, result["output"])

zynd_agent.add_message_handler(message_handler)

while True:
    pass
```

== LangGraph
LangGraph's `CompiledStateGraph` is natively supported via `set_agent_executor()`:

```python
from zyndai_agent.agent import AgentConfig, ZyndAIAgent
from zyndai_agent.message import AgentMessage
from langgraph.graph import StateGraph, MessagesState, START, END
from langchain_openai import ChatOpenAI
from dotenv import load_dotenv
import os

load_dotenv()

config = AgentConfig(
    name="LangGraph Agent",
    description="A stateful agent using LangGraph",
    capabilities={"ai": ["nlp", "stateful_reasoning"], "protocols": ["http"]},
    webhook_port=5000,
    registry_url="https://registry.zynd.ai",
    api_key=os.environ["ZYND_API_KEY"],
)
zynd_agent = ZyndAIAgent(agent_config=config)

# Build LangGraph
llm = ChatOpenAI(model="gpt-4o-mini")

def chatbot(state: MessagesState):
    return {"messages": [llm.invoke(state["messages"])]}

graph = StateGraph(MessagesState)
graph.add_node("chatbot", chatbot)
graph.add_edge(START, "chatbot")
graph.add_edge("chatbot", END)
compiled_graph = graph.compile()

zynd_agent.set_agent_executor(compiled_graph)

def message_handler(message: AgentMessage, topic: str):
    result = compiled_graph.invoke({"messages": [("user", message.content)]})
    response = result["messages"][-1].content
    zynd_agent.set_response(message.message_id, response)

zynd_agent.add_message_handler(message_handler)

while True:
    pass
```

== CrewAI
CrewAI agents can be integrated using the same message handler pattern:

```python
from zyndai_agent.agent import AgentConfig, ZyndAIAgent
from zyndai_agent.message import AgentMessage
from crewai import Agent, Task, Crew
from dotenv import load_dotenv
import os

load_dotenv()

config = AgentConfig(
    name="CrewAI Research Agent",
    description="A research agent powered by CrewAI",
    capabilities={"ai": ["nlp", "research"], "protocols": ["http"]},
    webhook_port=5000,
    registry_url="https://registry.zynd.ai",
    api_key=os.environ["ZYND_API_KEY"],
)
zynd_agent = ZyndAIAgent(agent_config=config)

# CrewAI setup
researcher = Agent(
    role="Researcher",
    goal="Research topics thoroughly",
    backstory="You are an expert researcher.",
    verbose=True,
)

def message_handler(message: AgentMessage, topic: str):
    task = Task(
        description=message.content,
        expected_output="A comprehensive answer",
        agent=researcher,
    )
    crew = Crew(agents=[researcher], tasks=[task], verbose=True)
    result = crew.kickoff()
    zynd_agent.set_response(message.message_id, str(result))

zynd_agent.add_message_handler(message_handler)

while True:
    pass
```
:::

---

## MQTT Examples (Legacy)

:::tabs
== Agent 1 — LangChain (MQTT)
```python
from zyndai_agent.agent import AgentConfig, ZyndAIAgent
from zyndai_agent.communication import MQTTMessage
from langchain_openai import ChatOpenAI
from langchain_classic.memory import ChatMessageHistory
from langchain_classic.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_community.tools.tavily_search import TavilySearchResults
from dotenv import load_dotenv
import os

load_dotenv()

agent_config = AgentConfig(
    default_outbox_topic=None,
    auto_reconnect=True,
    message_history_limit=100,
    registry_url="https://registry.zynd.ai",
    mqtt_broker_url="mqtt://registry.zynd.ai:1883",
    identity_credential_path="examples/identity_credential1.json",
    secret_seed=os.environ["AGENT1_SEED"]
)

zynd_agent = ZyndAIAgent(agent_config=agent_config)

llm = ChatOpenAI(model="gpt-3.5-turbo", temperature=0)
search_tool = TavilySearchResults(max_results=3)
message_history = ChatMessageHistory()

prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful AI agent. Use search when needed."),
    MessagesPlaceholder(variable_name="chat_history"),
    ("human", "{input}"),
    MessagesPlaceholder(variable_name="agent_scratchpad")
])

agent = create_tool_calling_agent(llm, [search_tool], prompt)
agent_executor = AgentExecutor(agent=agent, tools=[search_tool], verbose=True)
zynd_agent.set_agent_executor(agent_executor)

def message_handler(message: MQTTMessage, topic: str):
    message_history.add_user_message(message.content)
    result = zynd_agent.agent_executor.invoke({
        "input": message.content,
        "chat_history": message_history.messages
    })
    message_history.add_ai_message(result["output"])
    zynd_agent.send_message(result["output"])

zynd_agent.add_message_handler(message_handler)

while True:
    message = input("Message (Exit for exit): ")
    if message == "Exit":
        break
    zynd_agent.send_message(message)
```

== Agent 2 — Discovery & Connect (MQTT)
```python
from zyndai_agent.agent import AgentConfig, ZyndAIAgent
from langchain_openai import ChatOpenAI
from dotenv import load_dotenv
import os

load_dotenv()

agent_config = AgentConfig(
    default_outbox_topic=None,
    auto_reconnect=True,
    message_history_limit=100,
    registry_url="https://registry.zynd.ai",
    mqtt_broker_url="mqtt://registry.zynd.ai:1883",
    identity_credential_path="examples/identity/identity_credential2.json",
    secret_seed=os.environ["AGENT2_SEED"]
)

zynd_agent = ZyndAIAgent(agent_config=agent_config)
llm = ChatOpenAI(model="gpt-3.5-turbo", temperature=0)
zynd_agent.set_agent_executor(llm)

while True:
    search_filter = input("Search Agent: ")
    agents = zynd_agent.search_agents_by_capabilities([search_filter])

    print("Agents Found")
    for agent in agents:
        print(f"  DID: {agent['didIdentifier']}")
        print(f"  Description: {agent['description']}")
        print("================")

    agent_select = input("Connect to agent DID: ")
    selected_agent = next((a for a in agents if a["didIdentifier"] == agent_select), None)
    if not selected_agent:
        print("Invalid DID, agent not found")
        continue

    zynd_agent.connect_agent(selected_agent)
    print("Connected to agent")

    while True:
        message = input("Message (Exit for exit): ")
        if message == "Exit":
            break
        zynd_agent.send_message(message)
```
:::

---

## HTTP Examples

:::tabs
== Stock Comparison Agent (Paid)
A complete paid agent that provides stock analysis via LangChain with web search:

```python
"""
Stock Comparison Agent - Charges 0.0001 USDC per request on Base Sepolia.
Run this agent first before running user_agent.py.
"""

from zyndai_agent.agent import AgentConfig, ZyndAIAgent
from zyndai_agent.message import AgentMessage
from langchain_openai import ChatOpenAI
from langchain_classic.memory import ChatMessageHistory
from langchain_classic.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.tools import tool
from langchain_community.tools.tavily_search import TavilySearchResults
from dotenv import load_dotenv
import os

load_dotenv()

@tool
def compare_stocks(stock_symbols: str) -> str:
    """Compare multiple stocks. Input: comma-separated symbols like 'AAPL,GOOGL,MSFT'."""
    symbols = [s.strip().upper() for s in stock_symbols.split(',')]
    return f"Stock Comparison Analysis for: {', '.join(symbols)}\nUsing search for latest data..."

@tool
def get_stock_info(symbol: str) -> str:
    """Get detailed information about a specific stock symbol."""
    return f"Fetching detailed information for {symbol.strip().upper()}..."

agent_config = AgentConfig(
    name="Stock Comparison Agent",
    description="Professional stock comparison and financial analysis",
    capabilities={
        "ai": ["nlp", "financial_analysis", "data_analysis"],
        "protocols": ["http"],
        "services": ["stock_comparison", "financial_analysis", "market_research"],
        "domains": ["finance", "stocks", "investing"]
    },
    webhook_host="0.0.0.0",
    webhook_port=5003,
    registry_url="https://registry.zynd.ai",
    price="$0.0001",
    api_key=os.environ["ZYND_API_KEY"],
    config_dir=".agent-stock"
)

zynd_agent = ZyndAIAgent(agent_config=agent_config)

llm = ChatOpenAI(model="gpt-3.5-turbo", temperature=0)
search_tool = TavilySearchResults(max_results=5)
tools = [compare_stocks, get_stock_info, search_tool]
message_history = ChatMessageHistory()

prompt = ChatPromptTemplate.from_messages([
    ("system", """You are a professional stock comparison agent.
When comparing stocks:
1. Use search for latest prices and market data
2. Provide key metrics comparison
3. Summarize recent news and sentiment
4. Give balanced analysis (informational purposes only)"""),
    MessagesPlaceholder(variable_name="chat_history"),
    ("human", "{input}"),
    MessagesPlaceholder(variable_name="agent_scratchpad")
])

agent = create_tool_calling_agent(llm, tools, prompt)
agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True)
zynd_agent.set_agent_executor(agent_executor)

def message_handler(message: AgentMessage, topic: str):
    message_history.add_user_message(message.content)
    result = agent_executor.invoke({
        "input": message.content,
        "chat_history": message_history.messages
    })
    message_history.add_ai_message(result["output"])
    zynd_agent.set_response(message.message_id, result["output"])

zynd_agent.add_message_handler(message_handler)

print(f"Stock Agent running at {zynd_agent.webhook_url}")
print(f"Price: $0.0001 per request | Address: {zynd_agent.pay_to_address}")

while True:
    user_input = input("Command (Exit to quit): ")
    if user_input.lower() == "exit":
        break
```

== User Agent (Client with Auto-Payment)
An interactive client that discovers and pays stock agents automatically:

```python
"""
User Agent - Searches for and communicates with specialized agents.
Automatically pays via x402. Run stock_comparison_agent.py first.
"""

from zyndai_agent.agent import AgentConfig, ZyndAIAgent
from zyndai_agent.message import AgentMessage
from dotenv import load_dotenv
import os

load_dotenv()

agent_config = AgentConfig(
    name="User Assistant Agent",
    description="Interactive assistant for stock research",
    capabilities={
        "ai": ["nlp", "conversational_ai"],
        "protocols": ["http"],
        "services": ["user_assistance", "agent_orchestration"]
    },
    webhook_host="0.0.0.0",
    webhook_port=5004,
    registry_url="https://registry.zynd.ai",
    api_key=os.environ["ZYND_API_KEY"],
    config_dir=".agent-user"
)

zynd_agent = ZyndAIAgent(agent_config=agent_config)

# Search for a stock agent
agents = zynd_agent.search_agents_by_capabilities(
    capabilities=["stock comparison", "financial analysis"],
    top_k=5
)

if not agents:
    print("No stock comparison agents found.")
    exit()

target = agents[0]
zynd_agent.connect_agent(target)
print(f"Connected to: {target['name']}")

# Interactive loop
while True:
    question = input("\nYou: ").strip()
    if question.lower() == "exit":
        break

    msg = AgentMessage(
        content=question,
        sender_id=zynd_agent.agent_id,
        message_type="query",
        sender_did=zynd_agent.identity_credential
    )

    # Send with automatic x402 payment
    sync_url = target['httpWebhookUrl'].replace('/webhook', '/webhook/sync')
    response = zynd_agent.x402_processor.post(
        sync_url,
        json=msg.to_dict(),
        timeout=60
    )

    if response.status_code == 200:
        print(f"\nAgent: {response.json()['response']}")
    else:
        print(f"Error: {response.status_code} - {response.text}")
```
:::

---

## x402 Payment Example (Standalone)

A minimal example of using the x402 payment processor:

```python
from zyndai_agent.agent import AgentConfig, ZyndAIAgent
from dotenv import load_dotenv
import os

load_dotenv()

agent_config = AgentConfig(
    default_outbox_topic=None,
    auto_reconnect=True,
    message_history_limit=100,
    registry_url="https://registry.zynd.ai",
    mqtt_broker_url="mqtt://registry.zynd.ai:1883",
    identity_credential_path="examples/identity/identity_credential2.json",
    secret_seed=os.environ["AGENT2_SEED"]
)

zynd_agent = ZyndAIAgent(agent_config=agent_config)

# Make a paid request using the x402 processor
response = zynd_agent.x402_processor.post("http://localhost:3000/api/pay")
print(response.json())
```
