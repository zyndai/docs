---
title: Framework Integrations
description: Use LangChain, LangGraph, CrewAI, PydanticAI, or custom functions with Zynd agents.
---

# Framework Integrations

Use your favorite LLM framework with Zynd. Each framework has a dedicated setter method.

## LangChain

Use LangChain agents with tool calling and ReAct loops.

```python
from zyndai_agent.agent import ZyndAIAgent, AgentConfig
from langchain_openai import ChatOpenAI
from langchain.agents import create_tool_calling_agent, AgentExecutor
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

llm = ChatOpenAI(model="gpt-4")
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful assistant."),
    MessagesPlaceholder(variable_name="chat_history"),
    ("human", "{input}"),
    MessagesPlaceholder(variable_name="agent_scratchpad"),
])
agent = create_tool_calling_agent(llm, tools, prompt)
executor = AgentExecutor.from_agent_and_tools(agent=agent, tools=tools)

config = AgentConfig(name="MyAgent", webhook_port=5000)
zynd_agent = ZyndAIAgent(agent_config=config)
zynd_agent.set_langchain_agent(executor)
```

## LangGraph

Use LangGraph for complex multi-step workflows and state machines.

```python
from zyndai_agent.agent import ZyndAIAgent, AgentConfig
from langgraph.graph import StateGraph, START, END
from typing_extensions import TypedDict

class State(TypedDict):
    messages: list
    result: str

graph = StateGraph(State)
graph.add_node("agent", agent_fn)
graph.add_edge(START, "agent")
graph.add_edge("agent", END)
compiled = graph.compile()

config = AgentConfig(name="MyAgent", webhook_port=5000)
zynd_agent = ZyndAIAgent(agent_config=config)
zynd_agent.set_langgraph_agent(compiled)
```

## CrewAI

Use CrewAI for multi-agent crews with specialized roles.

```python
from zyndai_agent.agent import ZyndAIAgent, AgentConfig
from crewai import Agent, Task, Crew

researcher = Agent(
    role="Researcher",
    goal="Research topics",
    backstory="Expert researcher",
    llm=llm,
)
task = Task(description="Research AI", agent=researcher)
crew = Crew(agents=[researcher], tasks=[task])

config = AgentConfig(name="MyAgent", webhook_port=5000)
zynd_agent = ZyndAIAgent(agent_config=config)
zynd_agent.set_crewai_agent(crew)
```

## PydanticAI

Use PydanticAI for type-safe agents with structured outputs.

```python
from zyndai_agent.agent import ZyndAIAgent, AgentConfig
from pydantic_ai import Agent as PydanticAgent
from pydantic import BaseModel

class Response(BaseModel):
    answer: str
    confidence: float

pydantic_agent = PydanticAgent(
    "gpt-4",
    result_type=Response,
    system_prompt="Answer questions accurately."
)

config = AgentConfig(name="MyAgent", webhook_port=5000)
zynd_agent = ZyndAIAgent(agent_config=config)
zynd_agent.set_pydantic_ai_agent(pydantic_agent)
```

## Custom Functions

Use any function or callable for maximum flexibility.

```python
from zyndai_agent.agent import ZyndAIAgent, AgentConfig

async def my_agent_fn(input_text: str) -> str:
    # Your custom logic here
    return f"Response to: {input_text}"

config = AgentConfig(name="MyAgent", webhook_port=5000)
zynd_agent = ZyndAIAgent(agent_config=config)
zynd_agent.set_custom_agent(my_agent_fn)
```

## Choosing a framework

| Framework | Best For | Complexity |
|---|---|---|
| LangChain | Tool calling and ReAct loops | Medium |
| LangGraph | Workflows with state and memory | High |
| CrewAI | Multi-agent teams with roles | Medium |
| PydanticAI | Type-safe structured outputs | Low |
| Custom | Complete control | Variable |

Start with LangChain or PydanticAI if you're new to agents. Use LangGraph for complex workflows. Choose CrewAI for multi-agent teams.

## Switching frameworks

You can only set one framework per agent. To switch frameworks, create a new agent or reinitialize:

```python
zynd_agent.set_langchain_agent(executor)  # ✓ works
zynd_agent.set_pydantic_ai_agent(agent)   # ✗ raises error
```

## Next steps

- [Your First Agent](/agents/first-agent) — complete LangChain walkthrough
- [Webhooks & Communication](/agents/webhooks) — agent-to-agent messaging
- [Framework docs](https://langchain.com) — framework-specific guides
