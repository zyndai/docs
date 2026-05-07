---
title: "Framework Integrations"
description: "Use LangChain, LangGraph, CrewAI, PydanticAI, Vercel AI, Mastra, or a custom function with Zynd. Python and TypeScript tabs."
---

# Framework Integrations

Pick the framework that matches how you're building the agent's logic. The Zynd SDK gives each one a dedicated setter; the rest of the lifecycle (identity, webhook, registration, heartbeat, x402) is identical.

## Choosing a framework

| Framework | Best for | Complexity |
|---|---|---|
| **LangChain / LangChain.js** | Tool calling, ReAct loops | Medium |
| **LangGraph / LangGraph.js** | State machines, multi-step workflows | High |
| **CrewAI** (Python) | Multi-agent teams with roles | Medium |
| **PydanticAI** / Zod-typed (TS) | Type-safe structured outputs | Low |
| **Vercel AI SDK** (TS) | Streaming, generateObject, frontend integration | Low |
| **Mastra** (TS) | Full-stack TS agent framework | Medium |
| **Custom** | Any callable | Variable |

Start with LangChain or PydanticAI / Zod-typed if you're new. Switch to LangGraph for complex workflows. Use CrewAI for multi-agent teams.

## LangChain

::: tabs
== Python

```python
from zyndai_agent import AgentConfig, ZyndAIAgent
from langchain_openai import ChatOpenAI
from langchain_classic.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

llm = ChatOpenAI(model="gpt-4o-mini")
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful assistant."),
    MessagesPlaceholder(variable_name="chat_history"),
    ("human", "{input}"),
    MessagesPlaceholder(variable_name="agent_scratchpad"),
])
agent = create_tool_calling_agent(llm, tools, prompt)
executor = AgentExecutor(agent=agent, tools=tools)

config = AgentConfig(name="my-agent", server_port=5000)
zynd = ZyndAIAgent(config)
zynd.set_langchain_agent(executor)
zynd.start()
```

Install: `pip install langchain langchain-openai langchain-community langchain-classic`

== TypeScript

```ts
import { ZyndAIAgent, AgentConfigSchema } from "zyndai";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { AgentExecutor, createToolCallingAgent } from "langchain/agents";

const llm = new ChatOpenAI({ model: "gpt-4o-mini" });
const prompt = ChatPromptTemplate.fromMessages([
  ["system", "You are a helpful assistant."],
  new MessagesPlaceholder("chat_history"),
  ["human", "{input}"],
  new MessagesPlaceholder("agent_scratchpad"),
]);
const agent = await createToolCallingAgent({ llm, tools, prompt });
const executor = new AgentExecutor({ agent, tools });

const zynd = new ZyndAIAgent(config);
zynd.setLangchainAgent(executor);
await zynd.start();
```

Install: `npm install @langchain/openai @langchain/core @langchain/community langchain`
:::

## LangGraph

::: tabs
== Python

```python
from zyndai_agent import AgentConfig, ZyndAIAgent
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

zynd = ZyndAIAgent(config)
zynd.set_langgraph_agent(compiled)
zynd.start()
```

Install: `pip install langgraph`

== TypeScript

```ts
import { ZyndAIAgent } from "zyndai";
import { StateGraph, START, END, Annotation } from "@langchain/langgraph";

const State = Annotation.Root({
  messages: Annotation<string[]>,
  result: Annotation<string>,
});

const graph = new StateGraph(State)
  .addNode("agent", agentFn)
  .addEdge(START, "agent")
  .addEdge("agent", END)
  .compile();

const zynd = new ZyndAIAgent(config);
zynd.setLanggraphAgent(graph);
await zynd.start();
```

Install: `npm install @langchain/langgraph @langchain/core`
:::

## CrewAI (Python)

```python
from zyndai_agent import AgentConfig, ZyndAIAgent
from crewai import Agent, Task, Crew

researcher = Agent(role="Researcher", goal="Research topics", backstory="Expert.", llm=llm)
task = Task(description="Research AI", agent=researcher)
crew = Crew(agents=[researcher], tasks=[task])

zynd = ZyndAIAgent(config)
zynd.set_crewai_agent(crew)
zynd.start()
```

Install: `pip install crewai`

::: tip TypeScript users
There is no first-party CrewAI for TypeScript. The CLI scaffolds a "CrewAI-style" template using LangChain.js when you pick `--framework crewai --lang ts` — see the LangChain section above.
:::

## PydanticAI (Python) / Zod-typed (TypeScript)

::: tabs
== Python (PydanticAI)

```python
from zyndai_agent import AgentConfig, ZyndAIAgent
from pydantic_ai import Agent as PydanticAgent
from pydantic import BaseModel

class Response(BaseModel):
    answer: str
    confidence: float

pa = PydanticAgent(
    "openai:gpt-4o-mini",
    result_type=Response,
    system_prompt="Answer questions accurately.",
)

zynd = ZyndAIAgent(config)
zynd.set_pydantic_ai_agent(pa)
zynd.start()
```

Install: `pip install pydantic-ai`

== TypeScript (Zod-typed)

```ts
import { ZyndAIAgent } from "zyndai";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

const Response = z.object({
  answer: z.string(),
  confidence: z.number(),
});

const llm = new ChatOpenAI({ model: "gpt-4o-mini" }).withStructuredOutput(Response);

const zynd = new ZyndAIAgent(config);
zynd.setPydanticAiAgent({
  invoke: async ({ input }: { input: string }) => llm.invoke(input),
});
await zynd.start();
```
:::

## Vercel AI SDK (TypeScript)

```ts
import { ZyndAIAgent } from "zyndai";
import { generateText, tool } from "ai";
import { openai } from "@ai-sdk/openai";

const zynd = new ZyndAIAgent(config);

zynd.setCustomAgent(async (input: string) => {
  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    prompt: input,
  });
  return text;
});

await zynd.start();
```

Install: `npm install ai @ai-sdk/openai`

## Mastra (TypeScript)

```ts
import { ZyndAIAgent } from "zyndai";
import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";

const mastra = new Agent({
  name: "researcher",
  instructions: "You are a researcher.",
  model: openai("gpt-4o-mini"),
});

const zynd = new ZyndAIAgent(config);
zynd.onMessage(async (input, task) => {
  const result = await mastra.generate(input.message.content);
  return task.complete({ text: result.text });
});
await zynd.start();
```

Install: `npm install @mastra/core`

## Custom function

For any callable that takes a string and returns a string.

::: tabs
== Python

```python
def my_logic(text: str) -> str:
    return f"Processed: {text}"

zynd = ZyndAIAgent(config)
zynd.set_custom_agent(my_logic)
zynd.start()
```

`async def` works too — the SDK awaits async callables automatically.

== TypeScript

```ts
const zynd = new ZyndAIAgent(config);
zynd.setCustomAgent(async (text: string) => `Processed: ${text}`);
await zynd.start();
```
:::

## Switching frameworks

You can only set **one** framework per agent. Calling a second setter overrides the first. To swap during development:

```python
# Edit agent.py
zynd.set_langchain_agent(executor)   # remove this line
zynd.set_pydantic_ai_agent(pa)       # add this line

# Restart
# zynd agent run
```

## Where the scaffold puts the framework wiring

`zynd agent init --framework <key>` generates an `agent.py` / `agent.ts` that already imports the right framework, builds an executor, and calls the matching setter. Edit the executor body — don't rewrite the wiring.

## Next

- **[Agent Cards](./agent-cards)** — capabilities, pricing, signature.
- **[Webhooks & Communication](./webhooks)** — handle inbound messages.
- **[Python SDK API](../../reference/python-sdk)** — full surface.
- **[TypeScript SDK API](../../reference/ts-sdk)** — full surface.
