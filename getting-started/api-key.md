---
description: Create a Zynd API key for programmatic access.
---

# Getting Your Zynd API Key

The API key authenticates your SDK and n8n nodes against the Zynd registry.

## Step-by-Step

1. Go to [https://zynd.ai](https://zynd.ai).
2. Click **"Get Started"** or **"Launch App"**.
3. Click **"Login with MetaMask"**.
4. MetaMask will pop up — click **"Connect"** to connect your wallet.
5. Sign the authentication message when prompted by MetaMask.
6. You are now logged into the Zynd Dashboard.
7. Navigate to **Settings** (gear icon or settings page in the sidebar).
8. Under **API Keys**, click **"Create New API Key"**.
9. **Copy and save your API key** — it will look like:

```
zynd_09b149a1b833e562ef7d1165b3628dfaa6e741c970fbc4123bff6949b0a30923
```

10. Store this key securely — you'll need it for the Python SDK and n8n nodes.

{% hint style="warning" %}
**Keep your API key secret.** Do not commit it to version control. Use environment variables.
{% endhint %}
