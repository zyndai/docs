---
title: "Get Testnet Tokens"
description: "Get free Base Sepolia ETH (gas) and USDC for x402 testing — under five minutes per faucet."
---

# Get Testnet Tokens

x402 micropayments settle in **USDC on Base**. While you're learning, do everything on **Base Sepolia** (testnet) — the tokens are free, the chain is identical to production Base, and nothing you do can lose real money.

You need two things:

| Token | What it pays for | How to get it |
|---|---|---|
| **Base Sepolia ETH** | Gas for the USDC transfer transaction | Zynd faucet |
| **Base Sepolia USDC** | The actual micropayment paid to agents | Circle faucet |

## Step 1 — Find your wallet address

The SDK derives an Ethereum address deterministically from your Ed25519 keypair. The same address is used on both Base mainnet and Base Sepolia.

The easiest way to print it is from a Python or TypeScript snippet that loads your keypair:

::: tabs
== Python

```python
from zyndai_agent.payment import X402PaymentProcessor
from zyndai_agent.ed25519_identity import load_keypair

kp = load_keypair("~/.zynd/developer.json")
proc = X402PaymentProcessor(ed25519_private_key_bytes=kp.private_key_bytes)
print(proc.account.address)
# → 0x4f...c1a8
```

== TypeScript

```ts
import { loadKeypair } from "zyndai";
import { evmAddressFromEd25519 } from "zyndai/payment";

const kp = await loadKeypair("~/.zynd/developer.json");
console.log(await evmAddressFromEd25519(kp));
// → 0x4f...c1a8
```

== From agent run logs

When you run `zynd agent run` for the first time, the SDK logs:

```
X402PaymentProcessor initialized for account: 0x4f...c1a8
```

The address printed there is your wallet for x402.
:::

## Step 2 — Claim Base Sepolia ETH (gas)

1. Go to **[testing.zynd.ai/faucet](https://testing.zynd.ai/faucet)**.
2. Paste the `evm_address` from step 1.
3. Click the claim button.
4. Wait for the transaction to confirm (a few seconds on Base).

You should see a confirmation with a tx hash.

## Step 3 — Claim Base Sepolia USDC

1. Go to **[faucet.circle.com](https://faucet.circle.com/)**.
2. Select **Base Sepolia** from the network dropdown.
3. Paste the same wallet address.
4. Solve the CAPTCHA if prompted, click **Get Tokens**.
5. Wait for the transaction to confirm.

## Step 4 — Verify your balance

Open [sepolia.basescan.org](https://sepolia.basescan.org) and paste your address. You should see two incoming transfers — one ETH from the Zynd faucet, one USDC from the Circle faucet.

The Zynd CLI does not currently bundle a balance command — use the explorer or the Base Sepolia RPC directly.

## Switching to mainnet later

When you're ready to go live, point your SDK at Base mainnet:

```bash
export ZYND_PAYMENT_NETWORK=base
```

Or in `agent.config.json` / `service.config.json`:

```json
{
  "payment": { "network": "base" }
}
```

You'll then need real ETH (for gas) and real USDC at the same wallet address. **Test on Sepolia first** — the same address handles both networks, but transactions on mainnet are real money.

## Next

- **[Your First Agent →](./first-agent)**
