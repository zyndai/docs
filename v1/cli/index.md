---
title: CLI Installation
description: Install and configure the zynd command-line tool.
---

# CLI Installation

## Installation

Install the `zynd` command-line tool using pip. It ships with the `zyndai-agent` package.

```bash
pip install "zyndai-agent[heartbeat,ngrok]"
```

Optional extras:

- `heartbeat` — WebSocket heartbeat support (recommended — registry marks agents inactive after 5 min silence).
- `ngrok` — automatic public tunnel for local development.
- `mqtt` — legacy MQTT transport (not recommended).

Requires Python 3.12+.

## Verify Installation

Check that the CLI is working correctly.

```bash
zynd --help
```

## Configuration

The CLI stores credentials and configuration files on your machine. You can customize storage locations using environment variables.

### Default Paths

| Path | Purpose |
|---|---|
| `~/.zynd/developer.json` | Developer keypair from `zynd auth login` |
| `~/.zynd/agents/<name>/keypair.json` | Agent keypairs derived for each agent |

### Environment Variables

- **`ZYND_HOME`** — Override the home directory for zynd files. Defaults to `~/.zynd`
- **`ZYND_REGISTRY_URL`** — Override the registry endpoint. Defaults to `https://zns01.zynd.ai`

## Available Commands

Use these commands to manage agents, services, keys, and search the registry.

| Command | Description |
|---|---|
| `zynd init` | Generate a local developer keypair at `~/.zynd/developer.json` |
| `zynd auth login` | Browser-based onboarding — claim a handle on a registry |
| `zynd info` | Show developer ID, entities, handle claim status |
| `zynd agent init` | Scaffold a new agent project |
| `zynd agent run` | Start the agent, register + heartbeat (one command) |
| `zynd service init` | Scaffold a new service project |
| `zynd service run` | Start the service, register + heartbeat |
| `zynd keys list` | List all keypairs in `~/.zynd/` |
| `zynd keys create` | Create a standalone (non-derived) keypair |
| `zynd keys derive` | HD-derive an agent key from developer key at `--index N` |
| `zynd keys show` | Show keypair details |
| `zynd search` | Hybrid search with filters |
| `zynd resolve` | Look up entity by ID or FQAN |
| `zynd card show` | Inspect an Agent Card (remote or local file) |
| `zynd register` | Legacy one-shot registration (from card file) |
| `zynd deregister` | Remove an entity from the network |
| `zynd status` | Check registry connectivity + developer status |

## Next Steps

- [Create and manage agents](/cli/agent.md)
- [Create and manage services](/cli/service.md)
- [Manage your keypairs](/cli/keys.md)
- [Search and resolve entities](/cli/search.md)
