---
title: Key Management
description: Manage Ed25519 keypairs for developers and agents.
---

# Key Management

Manage cryptographic keypairs for signing and authentication. All keys use Ed25519 for security.

## zynd keys list

List all keypairs on your machine. Includes your developer key and all derived agent keys.

```bash
zynd keys list
```

Output example:
```
Developer Key:
  Location: ~/.zynd/developer.json
  Agent ID: dev:8e92a6ed48e821f4
  Public Key: 0x4a2f...

Agent Keys:
  stock-analyzer
    Location: ~/.zynd/agents/stock-analyzer/keypair.json
    Agent ID: zns:8e92a6ed48e821f4
    Derived at index: 0

  news-crawler
    Location: ~/.zynd/agents/news-crawler/keypair.json
    Agent ID: zns:9c3bef19d92f6c5a
    Derived at index: 1
```

## zynd keys create

Create a standalone agent keypair without running the init wizard. Useful for scripting or manual setup.

```bash
zynd keys create --name my-agent
```

The CLI:
- Generates a new Ed25519 keypair
- Saves it to `~/.zynd/agents/my-agent/keypair.json`
- Outputs the agent ID for reference

**Flags:**
- `--name` — Name for the agent (required)
- `--force` — Overwrite existing keypair (use with caution)

## zynd keys derive

Derive a new agent keypair from your developer key using HD (hierarchical deterministic) derivation. Each index produces a unique, deterministic keypair.

```bash
# Derive agent key at index 0
zynd keys derive --index 0

# Derive agent key at index 1
zynd keys derive --index 1
```

The CLI:
- Uses your developer keypair as the seed
- Derives a new key at the specified index
- Saves it to `~/.zynd/agents/agent-<index>/keypair.json`
- Outputs the derived agent ID

**Why use derivation?**
- Deterministic: same index always produces the same key
- Secure: compromising one agent key doesn't expose others
- Traceable: all keys are mathematically linked to your developer key

**Flags:**
- `--index` — Derivation index (required, 0-4294967295)
- `--name` — Custom name for the agent (defaults to `agent-<index>`)

## zynd keys show

Display detailed information about a specific keypair. Shows public key, agent ID, and location.

```bash
# Show developer key details
zynd keys show developer

# Show a specific agent key
zynd keys show agent-0

# Show by full name
zynd keys show stock-analyzer
```

Output example:
```
Key: developer
  Type: Developer
  Location: ~/.zynd/developer.json
  Agent ID: dev:8e92a6ed48e821f4
  Public Key: 0x4a2f8b9c1d5e3f7a...
  Created: 2026-01-15 10:30:00 UTC
```

**Flags:**
- `--format` — Output format: `text` or `json` (defaults to `text`)
- `--public-only` — Show only public key (hide agent ID)

## zynd info

Display your current developer identity and all registered agents. Quick reference for who you are in the Zynd network.

```bash
zynd info
```

Output example:
```
Developer Identity:
  Developer ID: dev:8e92a6ed48e821f4
  Public Key: 0x4a2f8b9c1d5e3f7a...
  Claimed Handle: acme-corp
  Handle Status: claimed

Registered Agents:
  1. stock-analyzer
     Agent ID: zns:8e92a6ed48e821f4
     Status: registered
     Network: zns01.zynd.ai

  2. news-crawler
     Agent ID: zns:9c3bef19d92f6c5a
     Status: registered
     Network: zns01.zynd.ai

Registered Services:
  1. data-aggregator
     Service ID: zns:svc:abc123def456
     Status: registered
```

## Key Storage Structure

The CLI organizes keys in a standard directory structure:

```
~/.zynd/
├── developer.json          # Your developer keypair
└── agents/
    ├── stock-analyzer/
    │   └── keypair.json    # Agent keypair
    ├── news-crawler/
    │   └── keypair.json    # Agent keypair
    └── my-service/
        └── keypair.json    # Service keypair
```

You can override `~/.zynd` by setting `ZYND_HOME` environment variable.

## Security Best Practices

**Protect your developer key:**
- Your developer key is stored unencrypted at `~/.zynd/developer.json`
- Treat it like a password; never commit it to version control
- Use file permissions to restrict access: `chmod 600 ~/.zynd/developer.json`

**Use derived keys:**
- Always derive agent keys from your developer key
- Don't reuse the same keypair across multiple agents
- If an agent is compromised, only that agent is affected

**Backup keys:**
- Keep a secure backup of your developer key
- Use encrypted storage (password manager, hardware wallet)
- Recovery: if lost, you'll need to create a new developer key

**Rotate keys:**
- Derive new agent keys periodically if needed
- Register new keys and deregister old ones
- Update heartbeat URLs if keys change

## Example: Set Up Multiple Agents

Create and manage several agents with derived keys.

```bash
# 1. Authenticate (one-time)
zynd auth login

# 2. Derive keys for three agents
zynd keys derive --index 0 --name stock-analyzer
zynd keys derive --index 1 --name news-crawler
zynd keys derive --index 2 --name data-aggregator

# 3. View all keys
zynd keys list

# 4. Show details of a specific key
zynd keys show stock-analyzer

# 5. Initialize agents with their keys
zynd agent init  # For stock-analyzer
zynd agent init  # For news-crawler
```

## Troubleshooting

**Keys not found:**
- Check that `~/.zynd/` directory exists
- Verify `ZYND_HOME` is set correctly if using custom location
- Run `zynd auth login` to create your developer key

**Can't derive a key:**
- Ensure your developer key exists first
- Check that the index is a valid number (0-4294967295)
- Verify you have write permissions to `~/.zynd/agents/`

**Public key mismatch:**
- Never edit keypair files manually
- If compromised, delete the key and derive a new one
- Register a new agent with the fresh keypair
