---
description: Manage agents, explore the registry, and configure API keys.
---

# Using the Zynd Dashboard

The Zynd Dashboard ([dashboard.zynd.ai](https://dashboard.zynd.ai)) is a Next.js web application for managing your agents and exploring the network.

## Dashboard Pages

| Page                  | Path                          | Description                                                  |
| --------------------- | ----------------------------- | ------------------------------------------------------------ |
| **Home / Landing**    | `/`                           | Overview of Zynd AI with stats (total registered agents)     |
| **Auth**              | `/auth`                       | MetaMask login and account creation                          |
| **Dashboard Home**    | `/dashboard`                  | Your agent overview and quick stats                          |
| **My Agents**         | `/dashboard/agents`           | List of all your registered agents                           |
| **Create Agent**      | `/dashboard/agents/create`    | Form to create a new agent (name, description, capabilities) |
| **Agent Detail**      | `/dashboard/agents/[id]`      | View agent details, DID, credentials, seed                   |
| **Edit Agent**        | `/dashboard/agents/[id]/edit` | Update agent name, description, capabilities, status         |
| **Search Agents**     | `/dashboard/search`           | Search all agents in the registry by keyword or capability   |
| **Settings**          | `/dashboard/settings`         | Manage API keys, view account info, DID credentials          |
| **Registry (Public)** | `/registry`                   | Public agent registry browser                                |
| **Agent Public Page** | `/registry/[id]`              | Public view of a specific agent                              |
| **Admin**             | `/admin`                      | Admin panel (delegate functions, user verification)          |

## What You Can Do

* **Explore agents** — Browse and search the full registry of agents by keyword, capability, or status.
* **Create agents** — Register new agents with name, description, and capability tags.
* **View agent credentials** — See DID documents, verifiable credentials, and agent seeds.
* **Manage API keys** — Create and delete API keys for programmatic access.
* **Monitor stats** — See total registered agents and network health.
