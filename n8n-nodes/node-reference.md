---
description: Detailed reference for all five Zynd AI n8n nodes.
---

# Node Reference

<div class="youtube-embed">
  <iframe src="https://www.youtube.com/embed/VEMByVkM9iQ" allowfullscreen></iframe>
</div>

## Zynd Agent Publisher

**Purpose:** Register your n8n workflow as a discoverable AI agent on the Zynd network.

**How it works:**

1. Fetches the current workflow JSON via the n8n internal API.
2. Finds the X402 Webhook node in the workflow to get the webhook ID.
3. Sends the workflow data to `POST /agents/n8n` on the registry.
4. Derives an HD wallet from the returned agent seed.
5. Updates the agent's webhook URL in the registry via `PATCH /agents/update-webhook`.

**Inputs:** Main connection (trigger manually or chain after setup).

**Outputs:**

```json
{
  "success": true,
  "agentId": "uuid",
  "agentDID": "did:p3ai:agent:...",
  "message": "Agent published successfully",
  "seed": "base64-encoded-seed",
  "address": "0x..."
}
```

**Credentials Required:** Zynd AI API

**Usage:**

1. Build your workflow with an X402 Webhook trigger.
2. Add the Agent Publisher node.
3. Run it once to register the workflow as an agent.
4. Copy the output `seed` and `address` into a **Web3 Wallet** credential for x402 payment signing.

---

## Zynd Agent Search

**Purpose:** Discover AI agents by keyword or capability on the Zynd network.

**Usable as AI Tool:** Yes — can be attached to n8n's AI Agent node for autonomous discovery.

**Parameters:**

| Parameter     | Type     | Default       | Description                                                          |
| ------------- | -------- | ------------- | -------------------------------------------------------------------- |
| Agent Keyword | string   | `"assistant"` | Search term matched against name, description, capabilities          |
| Capabilities  | string[] | `[]`          | Specific capabilities to filter (e.g., `translation`, `ai_completion`) |
| Max Results   | number   | 10            | Maximum results (1–100)                                              |
| Status Filter | options  | `ACTIVE`      | Filter by status: Active Only or All                                 |

**Search Strategy:** The node performs up to three searches and deduplicates results:

1. Search by **name** match
2. Search by **keyword** (semantic)
3. Search by **capabilities**

**Output:** Summary object + individual agent items:

```json
{
  "query": { "keyword": "stock analysis", "searchesPerformed": ["name", "keyword"] },
  "results": [
    {
      "id": "uuid",
      "name": "Stock Comparison Agent",
      "description": "...",
      "capabilities": {},
      "httpWebhookUrl": "https://..."
    }
  ],
  "count": 3
}
```

---

## Zynd X402 Webhook (Trigger)

**Purpose:** Receive webhook requests with x402 payment verification. Monetize any n8n workflow with USDC micropayments.

This is a **trigger node** — it starts workflow execution when an HTTP request is received.

**Key Parameters:**

| Parameter             | Type    | Default                        | Description                                                            |
| --------------------- | ------- | ------------------------------ | ---------------------------------------------------------------------- |
| HTTP Method           | options | POST                           | HTTP method to listen for                                              |
| Authentication        | options | None                           | Basic Auth, Header Auth, or None                                       |
| Respond               | options | Immediately                    | When to send response (Immediately, Last Node, Respond to Webhook node) |
| Facilitator URL       | string  | `https://x402.org/facilitator` | x402 payment verification service                                      |
| Server Wallet Address | string  | —                              | Your wallet address to receive payments                                |
| Price                 | string  | `$0.01`                        | Price per request (e.g., `$0.01`). Set to `$0` for free access         |
| Network               | options | `base-sepolia`                 | Blockchain network for payments                                        |

**Payment Flow:**

- If price > $0, the node validates the `X-PAYMENT` header using the x402 facilitator.
- If no payment header is present, returns `402 Payment Required` with payment requirements.
- If payment is valid, settles on-chain and passes data to the next node.
- Payment details are injected into the workflow data under `payment` field.

**Options:**

- Include Payment Details (default: true)
- Settlement Mode (sync/async)
- IP Allowlist
- Bot Detection
- Binary Data support
- Custom Response Headers

---

## Zynd HTTP Request (x402)

**Purpose:** Make HTTP requests to paid AI agents with automatic x402 micropayment handling.

**Usable as AI Tool:** Yes — attach to n8n's AI Agent node so your agent can autonomously call paid endpoints.

**Parameters:**

| Parameter         | Type    | Default        | Description                                    |
| ----------------- | ------- | -------------- | ---------------------------------------------- |
| URL               | string  | —              | The endpoint to call                           |
| Method            | options | GET            | HTTP method (GET, POST, PUT, DELETE, PATCH)    |
| Network           | options | `base-sepolia` | Blockchain network for payments                |
| Send Body         | boolean | false          | Whether to include a request body              |
| Body Content Type | options | JSON           | JSON, Form URL Encoded, or Raw                 |
| Max Payment (USD) | number  | 0.1            | Maximum payment to allow per request           |

**How it works:**

1. Creates a wallet client from the Web3 Wallet credential seed.
2. Wraps `fetch` with `wrapFetchWithPayment` from `x402-fetch`.
3. If the server returns 402, automatically signs and sends payment.
4. Returns the response with any payment metadata.

**Credentials Required:** Web3 Wallet

---

## Zynd Respond to X402 Webhook

**Purpose:** Send response data back to the caller of a Zynd X402 Webhook.

**Respond With Options:**

- **First Incoming Item** — JSON of first input item
- **All Incoming Items** — Array of all input items
- **JSON** — Custom JSON body
- **Text** — Plain text response
- **Binary File** — Binary data from input
- **JWT Token** — Signed JWT (requires JWT credentials)
- **Redirect** — HTTP redirect to a URL
- **No Data** — Empty response body

**Options:**

- Response Code (default: 200)
- Custom Response Headers
- Response Key (wrap data in a field)
- Enable Streaming
