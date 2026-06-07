# assistantmail-mcp

MCP server for [AssistantMail](https://assistant-mail.ai) — lets AI agents send and receive email through a managed mailbox.

[Website](https://assistant-mail.ai) · [Privacy Policy](https://assistant-mail.ai/privacy.html) · [Terms of Use](https://assistant-mail.ai/terms.html) · [Contributing](./CONTRIBUTING.md)

## Installation

```bash
npx @assistantmail/assistantmail-mcp
```

Requires Node.js 24 or newer.

## For npm users

If you are installing from npm and want the shortest setup path:

1. Install/run with:

  ```bash
  npx -y @assistantmail/assistantmail-mcp
  ```

2. Set `ASSISTANT_MAIL_API_KEY` in your MCP client environment.
3. Call `assistantmail_list_mailboxes` first to get your `mailboxId`.

### Claude Desktop

```json
{
  "mcpServers": {
    "assistantmail": {
      "command": "npx",
      "args": ["-y", "@assistantmail/assistantmail-mcp"],
      "env": {
        "ASSISTANT_MAIL_API_KEY": "amk_..."
      }
    }
  }
}
```

### Cursor / VS Code (`.cursor/mcp.json` or `.vscode/mcp.json`)

```json
{
  "servers": {
    "assistantmail": {
      "command": "npx",
      "args": ["-y", "@assistantmail/assistantmail-mcp"],
      "env": {
        "ASSISTANT_MAIL_API_KEY": "amk_..."
      }
    }
  }
}
```

## Prerequisites

An AssistantMail account and API key are required before the server can do anything useful.

1. Sign in at [app.assistant-mail.ai](https://app.assistant-mail.ai).
2. Go to **API Keys** and create a new key. Copy it immediately — it is only shown once.
3. Set `ASSISTANT_MAIL_API_KEY` in the MCP server environment (see configs above), or pass `apiKey` directly in each tool call.

Mail API routes use a `mailboxId` (UUID), not an email address. Use `assistantmail_list_mailboxes` after connecting to discover your mailbox IDs.

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `ASSISTANT_MAIL_API_KEY` | _(none)_ | API key (`amk_...`). Can be omitted if passed per-tool. |
| `ASSISTANT_MAIL_API_BASE_URL` | `https://api.assistant-mail.ai` | The public API for the AssistantMail service |

## Tools

### Diagnostics
| Tool | Description |
|---|---|
| `assistantmail_health` | Check that the MCP server is running and confirm the API base URL. No API key required. |

### Account
| Tool | Description |
|---|---|
| `assistantmail_get_me` | Get account profile and plan tier. |
| `assistantmail_get_inbound_policy` | Get the current inbound email policy (who can send to this account's mailboxes). |
| `assistantmail_update_inbound_policy` | Update the inbound policy (if allowed by selected account tier). Accepted values: `owner`, `list`, `sent`. Use `allowedSenders` with `list`. |

### Mailboxes
| Tool | Description |
|---|---|
| `assistantmail_list_mailboxes` | List all mailboxes on the account. Returns `mailboxId` needed for message operations. |
| `assistantmail_create_mailbox` | Create a new mailbox (if allowed by selected account tier), optionally specifying `displayName` and `address`. |
| `assistantmail_get_mailbox` | Get metadata for a single mailbox by `mailboxId`. |
| `assistantmail_update_mailbox` | Update a mailbox's display name. |
| `assistantmail_delete_mailbox` | Permanently delete a mailbox and all its messages. THIS ACTION HAS NO CONFIRMATION. USE CAREFULLY. |

### Messages
| Tool | Description |
|---|---|
| `assistantmail_list_messages` | List inbound and outbound messages for a mailbox. Supports `since` (ISO timestamp) and `limit` (max 100). |
| `assistantmail_get_message` | Fetch a single message including `textBody` and `htmlBody`. Bodies are only returned within the plan's retention window; `bodyExpired: true` is set if the window has elapsed. |
| `assistantmail_send_email` | Queue an outbound email. Requires `to`, `subject`, and at least one of `text` or `html`. |
| `assistantmail_reply_message` | Reply to an existing message. Requires `messageId` and at least one of `text` or `html`; recipients and subject are derived automatically. |
| `assistantmail_delete_messages` | Delete messages by `messageIds` array, or pass `deleteAll: true` to clear the mailbox. |
| `assistantmail_get_usage` | Get daily and monthly send quota usage for a mailbox. A `null` limit means unlimited. |

### Recipients
| Tool | Description |
|---|---|
| `assistantmail_list_recipients` | List approved and pending recipients for the account. |
| `assistantmail_add_recipient` | Add a recipient. Sends a consent invitation email when required by the account's plan. |
| `assistantmail_remove_recipient` | Remove a recipient from the allowed list. |

### Reference tools
These return raw REST endpoint details rather than calling the API. Use them when you need to construct a request manually or inspect the exact URL and response schema.

| Tool | Description |
|---|---|
| `assistantmail_send_email_reference` | Endpoint, headers, and body fields for `POST /v1/mailboxes/{mailboxId}/messages`. |
| `assistantmail_list_messages_reference` | Endpoint and query params for `GET /v1/mailboxes/{mailboxId}/messages`. |
| `assistantmail_get_message_reference` | Endpoint and response schema for `GET /v1/mailboxes/{mailboxId}/messages/{messageId}`. |
| `assistantmail_get_usage_reference` | Endpoint and response schema for `GET /v1/mailboxes/{mailboxId}/usage`. |

## Quick start

```bash
API_KEY="amk_..."
BASE="https://api.assistant-mail.ai"

# 1) Discover your mailboxId
curl "$BASE/v1/mailboxes" -H "x-api-key: $API_KEY"

# 2) Send an email
curl -X POST "$BASE/v1/mailboxes/<mailboxId>/messages" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"to":"recipient@example.com","subject":"Hello","text":"Hi there"}'

# 3) Read inbox
curl "$BASE/v1/mailboxes/<mailboxId>/messages" -H "x-api-key: $API_KEY"
```

## Tool call examples

```json
{ "tool": "assistantmail_list_mailboxes", "input": { "apiKey": "amk_..." } }
```

```json
{
  "tool": "assistantmail_list_messages",
  "input": { "mailboxId": "<uuid>", "limit": 20, "since": "2026-01-01T00:00:00.000Z" }
}
```

```json
{
  "tool": "assistantmail_get_message",
  "input": { "mailboxId": "<uuid>", "messageId": "<uuid>" }
}
```

```json
{
  "tool": "assistantmail_send_email",
  "input": {
    "mailboxId": "<uuid>",
    "to": "recipient@example.com",
    "subject": "Hello",
    "text": "Hi there"
  }
}
```

```json
{
  "tool": "assistantmail_reply_message",
  "input": {
    "mailboxId": "<uuid>",
    "messageId": "<uuid>",
    "text": "Thanks for the update."
  }
}
```

If `ASSISTANT_MAIL_API_KEY` is set in the server environment, `apiKey` can be omitted from all tool inputs.

---

[AssistantMail](https://assistant-mail.ai) · [Privacy Policy](https://assistant-mail.ai/privacy.html) · [Terms of Use](https://assistant-mail.ai/terms.html)