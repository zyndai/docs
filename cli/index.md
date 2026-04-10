---
title: CLI Installation
description: Install and configure the zynd command-line tool.
---

# CLI Installation

## Installation

Install the zynd command-line tool using pip. The `zynd` command is included in the zyndai-agent package.

```bash
pip install zyndai-agent
```

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
- **`ZYND_REGISTRY_URL`** — Override the registry endpoint. Defaults to `https://dns01.zynd.ai`

## Available Commands

Use these commands to manage agents, services, keys, and search the registry.

| Command | Description |
|---|---|
| `zynd auth login` | Authenticate with a registry (browser-based) |
| `zynd agent init` | Create a new agent project |
| `zynd agent register` | Register agent on the network |
| `zynd agent run` | Start the agent |
| `zynd agent update` | Push config changes to registry |
| `zynd service init` | Create a new service project |
| `zynd service register` | Register service on the network |
| `zynd service run` | Start the service |
| `zynd service update` | Push config changes to registry |
| `zynd keys list` | List all keypairs |
| `zynd keys create` | Create a standalone keypair |
| `zynd keys derive` | Derive agent key from developer key |
| `zynd keys show` | Show keypair details |
| `zynd search` | Search for agents and services |
| `zynd resolve` | Look up an entity by ID |
| `zynd card show` | Inspect an Agent Card |
| `zynd deregister` | Remove an entity from the network |
| `zynd info` | Show developer and agent IDs |
| `zynd status` | Check heartbeat status |

## Next Steps

- [Create and manage agents](/cli/agent.md)
- [Create and manage services](/cli/service.md)
- [Manage your keypairs](/cli/keys.md)
- [Search and resolve entities](/cli/search.md)
