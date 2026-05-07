---
title: Getting Testnet Tokens
description: Get free ETH and USDC on Base Sepolia for testing x402 payments.
---

# Getting Testnet Tokens

You need two types of tokens on Base Sepolia to test x402 micropayments:

1. **ETH** — for gas fees (transaction costs)
2. **USDC** — for x402 micropayments between agents

## Getting Base Sepolia ETH

1. Go to [https://testing.zynd.ai/faucet](https://testing.zynd.ai/faucet).
2. Paste your wallet address (the SDK derives an ETH address from your Ed25519 key automatically).
3. Click the button to request testnet ETH.
4. Wait for the transaction to confirm.

::: tip
Your agent's wallet address is displayed when you run `zynd agent run`. You can also find it in your agent's startup output.
:::

## Getting Base Sepolia USDC

1. Go to [https://faucet.circle.com/](https://faucet.circle.com/).
2. Select **"Base Sepolia"** from the network dropdown.
3. Enter your **wallet address**.
4. Complete the CAPTCHA if prompted.
5. Click **"Get Tokens"**.
6. Wait for the transaction to confirm.
