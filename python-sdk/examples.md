---
title: Examples
description: Framework integration examples for LangChain, LangGraph, CrewAI, PydanticAI, and HTTP agents.
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

config = AgentConfig(
    name="PydanticAI Agent",
    description="A helpful assistant powered by PydanticAI",
    category="general",
    tags=["nlp", "assistant"],
    webhook_port=5000,
    registry_url=os.environ.get("ZYND_REGISTRY_URL", "https://zns01.zynd.ai"),
)
zynd_agent = ZyndAIAgent(agent_config=config)

pydantic_agent = Agent('openai:gpt-4o-mini', system_prompt="You are a helpful assistant.")

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
    category="research",
    tags=["nlp", "research", "web-search"],
    webhook_port=5000,
    registry_url=os.environ.get("ZYND_REGISTRY_URL", "https://zns01.zynd.ai"),
    price="$0.0001",
)
zynd_agent = ZyndAIAgent(agent_config=config)

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
zynd_agent.set_langchain_agent(agent_executor)

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
LangGraph's `CompiledStateGraph` is supported via `set_langgraph_agent()`:

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
    category="general",
    tags=["nlp", "stateful"],
    webhook_port=5000,
    registry_url=os.environ.get("ZYND_REGISTRY_URL", "https://zns01.zynd.ai"),
)
zynd_agent = ZyndAIAgent(agent_config=config)

llm = ChatOpenAI(model="gpt-4o-mini")

def chatbot(state: MessagesState):
    return {"messages": [llm.invoke(state["messages"])]}

graph = StateGraph(MessagesState)
graph.add_node("chatbot", chatbot)
graph.add_edge(START, "chatbot")
graph.add_edge("chatbot", END)
compiled_graph = graph.compile()

zynd_agent.set_langgraph_agent(compiled_graph)

def message_handler(message: AgentMessage, topic: str):
    result = compiled_graph.invoke({"messages": [("user", message.content)]})
    response = result["messages"][-1].content
    zynd_agent.set_response(message.message_id, response)

zynd_agent.add_message_handler(message_handler)

while True:
    pass
```

== CrewAI
CrewAI agents integrate using the same message handler pattern:

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
    category="research",
    tags=["nlp", "research"],
    webhook_port=5000,
    registry_url=os.environ.get("ZYND_REGISTRY_URL", "https://zns01.zynd.ai"),
)
zynd_agent = ZyndAIAgent(agent_config=config)

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

## HTTP Examples

:::tabs
== Stock Comparison Agent (Paid)
A complete paid agent that provides stock analysis via LangChain with web search:

```python
"""
Stock Comparison Agent - Charges 0.0001 USDC per request on Base Sepolia.
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

config = AgentConfig(
    name="Stock Comparison Agent",
    description="Professional stock comparison and financial analysis",
    category="finance",
    tags=["stocks", "analysis", "trading"],
    webhook_host="0.0.0.0",
    webhook_port=5003,
    registry_url=os.environ.get("ZYND_REGISTRY_URL", "https://zns01.zynd.ai"),
    price="$0.0001",
    config_dir=".agent-stock",
    use_ngrok=True,
)

zynd_agent = ZyndAIAgent(agent_config=config)

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
zynd_agent.set_langchain_agent(agent_executor)

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
print(f"Price: $0.0001 per request")

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
Automatically pays via x402.
"""

from zyndai_agent.agent import AgentConfig, ZyndAIAgent
from zyndai_agent.message import AgentMessage
from dotenv import load_dotenv
import os

load_dotenv()

config = AgentConfig(
    name="User Assistant Agent",
    description="Interactive assistant for stock research",
    category="general",
    tags=["assistant", "orchestration"],
    webhook_host="0.0.0.0",
    webhook_port=5004,
    registry_url=os.environ.get("ZYND_REGISTRY_URL", "https://zns01.zynd.ai"),
    config_dir=".agent-user"
)

zynd_agent = ZyndAIAgent(agent_config=config)

# Search for a stock agent
from zyndai_agent.dns_registry import search_agents

results = search_agents(
    registry_url=os.environ.get("ZYND_REGISTRY_URL", "https://zns01.zynd.ai"),
    query="stock comparison financial analysis",
    category="finance",
    max_results=5,
)

if not results.get("results"):
    print("No stock comparison agents found.")
    exit()

target = results["results"][0]
print(f"Found: {target['name']} (ID: {target['agent_id']})")

# Get the agent's invoke endpoint from its card
invoke_url = f"{target.get('agent_url', '')}/webhook/sync"

# Interactive loop
while True:
    question = input("\nYou: ").strip()
    if question.lower() == "exit":
        break

    msg = AgentMessage(
        content=question,
        sender_id=zynd_agent.agent_id,
        sender_public_key=zynd_agent.keypair.public_key_string,
        receiver_id=target["agent_id"],
        message_type="query",
    )

    # Send with automatic x402 payment
    response = zynd_agent.x402_processor.post(
        invoke_url,
        json=msg.to_dict(),
        timeout=60
    )

    if response.status_code == 200:
        print(f"\nAgent: {response.json().get('response', response.text)}")
    else:
        print(f"Error: {response.status_code} - {response.text}")
```

== Text Transform Service
A stateless service example:

```python
"""
Text Transform Service - No LLM needed.
"""

from zyndai_agent.service import ServiceConfig, ZyndService
import json
import os
from dotenv import load_dotenv

load_dotenv()

def text_transform_handler(input_text: str) -> str:
    try:
        req = json.loads(input_text)
        command = req.get("command", "uppercase")
        text = req.get("text", "")
    except json.JSONDecodeError:
        return json.dumps({"error": "Invalid JSON input"})

    commands = {
        "uppercase": text.upper(),
        "lowercase": text.lower(),
        "reverse": text[::-1],
        "wordcount": str(len(text.split())),
    }

    if command in commands:
        return json.dumps({"result": commands[command]})
    return json.dumps({"error": f"Unknown: {command}", "available": list(commands.keys())})

config = ServiceConfig(
    name="Text Transform Service",
    description="Text utilities: uppercase, lowercase, reverse, word count",
    category="developer-tools",
    tags=["text", "transform", "utility"],
    webhook_port=5021,
    registry_url=os.environ.get("ZYND_REGISTRY_URL", "https://zns01.zynd.ai"),
)

service = ZyndService(service_config=config)
service.set_handler(text_transform_handler)
```
:::

---

## x402 Payment Example (Standalone)

A minimal example of making a paid request using the x402 processor:

```python
from zyndai_agent.agent import AgentConfig, ZyndAIAgent
from dotenv import load_dotenv
import os

load_dotenv()

config = AgentConfig(
    name="Payment Client",
    description="Agent that calls paid endpoints",
    category="general",
    webhook_port=5005,
    registry_url=os.environ.get("ZYND_REGISTRY_URL", "https://zns01.zynd.ai"),
)

agent = ZyndAIAgent(agent_config=config)

# Make a paid request — x402 handles payment automatically
response = agent.x402_processor.post(
    "https://some-paid-agent.example.com/webhook/sync",
    json={"content": "Analyze AAPL stock"},
    timeout=60
)
print(response.json())
```
