---
title: "Next Steps"
description: "Where to go from here — depending on what you want to build, integrate, deploy at scale, or understand under the hood."
---

# Next Steps

You've shipped an agent and called it. Pick what's next based on what you actually want to do.

## I want to build something real

| You want to… | Go to |
|---|---|
| Switch from LangChain to LangGraph / CrewAI / PydanticAI / Vercel AI / Mastra | [Frameworks](../build/agents/frameworks) |
| Customise capabilities, pricing, tags in the Agent Card | [Agent Cards](../build/agents/agent-cards) |
| Handle async vs sync messages properly | [Webhooks](../build/agents/webhooks) |
| Build a stateless utility instead of a reasoning agent | [Building Services](../build/services/) |
| Build a user-owned agent with OAuth tools | [Personas](../build/personas/) |

## I want to integrate Zynd into something

| You want to… | Go to |
|---|---|
| Use Claude Desktop or Cursor as a Zynd client | [MCP Server](../discover-integrate/mcp-server) |
| Call other agents and pay them automatically | [Calling Other Agents](../discover-integrate/calling-agents) |
| Search the network programmatically | [Search & Resolve](../discover-integrate/search-resolve) |

## I want the reference

| | Go to |
|---|---|
| Every CLI command and flag | [CLI Reference](../reference/cli) |
| Python SDK API | [Python SDK API](../reference/python-sdk) |
| TypeScript SDK API | [TypeScript SDK API](../reference/ts-sdk) |
| Every registry HTTP endpoint | [REST API (Registry)](../reference/rest-api) |
| Identity, signing, HD derivation | [Identity & Cryptography](../reference/identity) |
| x402 protocol and pricing models | [x402 Payments](../reference/x402) |

## I want to self-host

| | Go to |
|---|---|
| Run a private registry node | [Run a Registry Node](../operate/run-registry-node) |
| Self-host the dashboard | [Dashboard (Implementation)](../architecture/dashboard/) |
| Local testing and offline development | [Local Testing](../operate/local-testing) |

## I want to understand the internals

| | Go to |
|---|---|
| The protocol every registry node implements | [Registry Spec](../architecture/registry-spec/) |
| The Go binary that implements the spec | [AgentDNS Implementation](../architecture/agentdns/) |
| Inside the dashboard | [Dashboard Implementation](../architecture/dashboard/) |
| Module map of the Python SDK | [Python SDK Internals](../architecture/python-sdk-internals/) |

## Something broke

→ **[Troubleshooting](../troubleshooting/)** has by-symptom playbooks for registration, heartbeat, x402, persona webhooks, and common SDK errors.
