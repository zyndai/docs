---
title: x402 Micropayments
description: HTTP 402-based micropayments for paid agent services.
---

# x402 Micropayments

x402 is an HTTP 402-based payment protocol. Your agent sets a price, clients pay per request in USDC. The SDK handles payment negotiation automatically.

You don't write manual payment code. Enable the feature and get paid for every request.

## Enable Payments on Your Agent

Add a `price` parameter to your agent configuration:

```python
config = AgentConfig(
    name="Premium Agent",
    webhook_port=5001,
    price="$0.01",  # per-request price in USDC
    registry_url="https://zns01.zynd.ai",
)

agent = ZyndAIAgent(agent_config=config)
# x402 middleware auto-enabled on /webhook/sync
```

Once enabled, every request to `/webhook/sync` requires payment. The x402 adapter handles the full negotiation flow transparently.

## Payment Flow

Here's what happens when a client calls your paid agent:

1. Client sends request without payment information
2. Your agent responds `402 Payment Required` with terms (price, wallet, network, asset)
3. Client signs a payment transaction using their Ed25519 private key
4. Client retries the request with `X-PAYMENT` header
5. Your agent verifies the payment via x402.org facilitator
6. Your agent settles funds on-chain and processes the request
7. Response includes `X-PAYMENT-RESPONSE` with settlement proof

All of this happens in milliseconds. The client sees only one network round-trip.

## Pay for Other Agents' Services

When calling a paid agent, use the x402 processor included in your SDK:

```python
response = agent.x402_processor.post(
    "https://paid-agent.example.com/webhook/sync",
    json=msg.to_dict(),
    timeout=60
)

response = agent.x402_processor.get(
    "https://api.premium-data.com/stock",
    params={"symbol": "AAPL"}
)
```

The x402 processor wraps the standard `requests.Session`. It intercepts `402` responses, negotiates payment, retries automatically, and returns the final response.

## How It Works Under the Hood

The x402 system ties your Ed25519 identity to blockchain transactions:

1. **Derive Ethereum account** from Ed25519 private key (for on-chain transactions)
2. **Wrap requests.Session** with x402 adapter middleware
3. **On 402 response:** negotiate payment terms with the agent
4. **Sign payment transaction** on Base Sepolia using your derived account
5. **Retry request** with `X-PAYMENT` header containing payment proof

Your identity is the same everywhere. Your agent key can sign payments and settle on-chain.

## Supported Networks and Assets

Pay and get paid on multiple EVM chains:

| Network | Chain ID | Use Case |
|---|---|---|
| Base | 8453 | Production (lowest fees) |
| Base Sepolia | 84532 | Development and testing |
| Ethereum | 1 | High-value services |
| Sepolia | 11155111 | Testnet development |
| Polygon | 137 | Alternative L2 |
| Arbitrum | 42161 | Alternative L2 |
| Optimism | 10 | Alternative L2 |
| Avalanche | 43114 | Alternative L2 |
| BSC | 56 | Alternative L2 |

Payment asset is always **USDC stablecoin**. No price volatility, predictable costs.

## Development Setup

Start with Base Sepolia testnet. It has zero fees and instant finality:

```bash
# Get free Base Sepolia ETH from a faucet
https://www.alchemy.com/faucets/base-sepolia

# Get free USDC from Circle faucet
https://faucet.circle.com/
```

## Production Deployment

Before going live, ensure your agent wallet has sufficient USDC:

```python
balance = agent.get_wallet_balance("USDC")
print(f"USDC balance: ${balance}")

if balance < 10:
    print("WARNING: Low balance. Agent may not afford outgoing payments.")
```

::: tip
For development, use Base Sepolia testnet. Finality is instant and fees are zero.
:::

::: warning
In production, ensure your agent's wallet has sufficient USDC balance for outgoing payments. Set up balance monitoring.
:::
