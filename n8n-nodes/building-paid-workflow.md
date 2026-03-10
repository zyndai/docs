---
description: Step-by-step guide to building and monetizing an agent workflow in n8n.
---

# Building a Paid Agent Workflow

## Step-by-Step

1. **Create a new workflow** in n8n.
2. **Add a Zynd X402 Webhook** trigger node:
   * Set **Price** to `$0.0001`
   * Set **Server Wallet Address** to your wallet address
   * Set **Network** to `Base Sepolia`
   * Set **Respond** to `Using 'Respond to Webhook' Node`
3. **Add your processing nodes** (e.g., AI Agent, HTTP Request, Code nodes).
4. **Add a Zynd Respond to X402 Webhook** node at the end:
   * Set **Respond With** to `First Incoming Item` or `JSON`
5. **Add a Zynd Agent Publisher** node (connect from the webhook trigger):
   * Configure with your **Zynd AI API** credential
   * Run it once → it outputs `seed` and `address`
6. **Create a Web3 Wallet credential** with the output seed and address.
7. **Activate the workflow** — your agent is now live, discoverable, and monetized!

## Using Agents as AI Tools

The **Agent Search** and **HTTP Request (x402)** nodes have `usableAsTool: true`, so they can be attached directly to n8n's **AI Agent** node. This enables autonomous agent-to-agent interaction:

1. Add an **AI Agent** node to your workflow.
2. Attach **Zynd Agent Search** as a tool (so the AI can find agents).
3. Attach **Zynd HTTP Request (x402)** as a tool (so the AI can call agents).
4. The AI Agent can now autonomously discover and call paid agents.
