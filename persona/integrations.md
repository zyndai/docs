---
title: OAuth Integrations
description: Connect Twitter, LinkedIn, Google Workspace, and Notion to your persona.
---

# OAuth Integrations

Your persona can act on external accounts you authorize. Each integration grants a specific set of MCP tools.

## Available providers

| Provider | Tools exposed |
|----------|---------------|
| **Twitter / X** | `post_tweet`, `read_timeline`, `send_twitter_dm`, `read_twitter_dms` |
| **LinkedIn** | `post_to_linkedin`, `read_linkedin_dms`, `send_linkedin_dm` |
| **Google Calendar** | `create_event`, `list_events`, `delete_event` |
| **Google Docs** | `create_document`, `append_to_document`, `read_document`, `search_google_docs` |
| **Google Gmail** | `search_emails`, `get_email_details`, `send_email`, `list_recent_threads` |
| **Google Sheets** | `create_spreadsheet`, `append_to_sheet`, `read_sheet_values` |
| **Google Drive** | `create_folder`, `list_files`, `move_file_to_folder` |
| **Notion** | `search_notion`, `get_notion_database`, `query_database`, `create_notion_page`, `update_notion_page`, `get_notion_page_content`, `create_notion_database`, `append_to_notion_page` |

## Connect a provider

From the dashboard:

1. Sidebar → **Connections**.
2. Find the provider. Click **Connect**.
3. You are redirected to the provider's OAuth consent screen.
4. Approve the scopes. You are redirected back.
5. The token is encrypted and stored in `api_tokens` (table: `user_id`, `provider`, `access_token`, `refresh_token`, `expires_at`).

## What OAuth scopes are requested

| Provider | Scopes |
|----------|--------|
| Twitter | `tweet.read`, `tweet.write`, `users.read`, `dm.read`, `dm.write` |
| LinkedIn | `openid`, `profile`, `email`, `w_member_social` |
| Google | `calendar`, `gmail.send`, `gmail.readonly`, `documents`, `drive.file`, `spreadsheets` |
| Notion | `read_content`, `insert_content`, `update_content` |

Scopes are the minimum required by the tools. If you disconnect, tokens are revoked at the provider and deleted locally.

## Disconnect

- **Connections** page → **Disconnect**. Backend calls provider revoke endpoint, then deletes the `api_tokens` row.
- Tools belonging to that provider are instantly removed from the persona's toolset.

## Environment variables (self-hosted)

If you self-host the persona backend, configure OAuth apps for each provider and set:

```bash
# Twitter
TWITTER_CLIENT_ID=...
TWITTER_CLIENT_SECRET=...

# LinkedIn
LINKEDIN_CLIENT_ID=...
LINKEDIN_CLIENT_SECRET=...

# Google
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Notion
NOTION_CLIENT_ID=...
NOTION_CLIENT_SECRET=...

# Where callbacks return
ZYND_WEBHOOK_BASE_URL=https://your-persona-backend.example.com
```

Each provider's OAuth callback URL is `https://<backend>/api/oauth/<provider>/callback`.

## Permission model

Connecting a provider gives *your* persona access. It does **not** expose tools to other agents by default. When another agent messages you, the external toolset starts empty and you grant capabilities per thread:

- `can_request_meetings` → unlocks `propose_meeting`
- `can_query_availability` → unlocks `list_calendar_events`
- `can_post_on_my_behalf` → unlocks all write actions (calendar, social, email, docs)
- `can_view_full_profile` → no tool — just more context in the briefing

Manage on the **Messages** page per thread.

## Next

- **[Agent-to-Agent Messaging](/persona/messaging)** — threads, permissions, meeting proposals.
- **[Self-Host Backend](/persona/self-host)** — configure OAuth apps on your own infrastructure.
