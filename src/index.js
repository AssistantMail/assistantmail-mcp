#!/usr/bin/env node
import process from 'node:process';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const apiBaseUrl = process.env.ASSISTANT_MAIL_API_BASE_URL ?? 'https://api.assistant-mail.ai';
const defaultApiKey = process.env.ASSISTANT_MAIL_API_KEY ?? '';

const server = new McpServer({
  name: 'assistantmail-mcp',
  version: '1.2.0',
});

function resolveApiKey(inputApiKey) {
  const key = (inputApiKey ?? '').trim() || defaultApiKey.trim();
  return key.startsWith('amk_') ? key : null;
}

async function assistantMailRequest({ method, path, apiKey, query = {}, body }) {
  const key = resolveApiKey(apiKey);
  if (!key) {
    throw new Error(
      'Missing API key. Provide apiKey in tool input or set ASSISTANT_MAIL_API_KEY in the MCP server environment.',
    );
  }

  const url = new URL(path, apiBaseUrl);
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && `${v}`.length > 0) {
      url.searchParams.set(k, `${v}`);
    }
  }

  const headers = {
    Accept: 'application/json',
    'x-api-key': key,
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const raw = await res.text();
  let parsed = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = { raw };
  }

  if (!res.ok) {
    const message = typeof parsed?.message === 'string'
      ? parsed.message
      : `AssistantMail API request failed (${res.status}).`;
    throw new Error(message);
  }

  return {
    data: parsed,
    status: res.status,
    request: {
      method,
      url: url.toString(),
    },
  };
}

async function assistantMailGet(path, apiKey, query = {}) {
  return assistantMailRequest({ method: 'GET', path, apiKey, query });
}

async function assistantMailPost(path, apiKey, body) {
  return assistantMailRequest({ method: 'POST', path, apiKey, body });
}

async function assistantMailPut(path, apiKey, body) {
  return assistantMailRequest({ method: 'PUT', path, apiKey, body });
}

async function assistantMailDelete(path, apiKey, body) {
  return assistantMailRequest({ method: 'DELETE', path, apiKey, body });
}

server.tool(
  'assistantmail_health',
  'Returns AssistantMail MCP server and API endpoint metadata.',
  {},
  async () => ({
    content: [
      {
        type: 'text',
        text: `assistantmail-mcp is running. API base URL: ${apiBaseUrl}`,
      },
    ],
    structuredContent: {
      status: 'ok',
      apiBaseUrl,
    },
  }),
);

server.tool(
  'assistantmail_get_me',
  'Gets account profile and tier metadata for the authenticated account.',
  {
    apiKey: z.string().startsWith('amk_').optional(),
  },
  async ({ apiKey }) => {
    try {
      const result = await assistantMailGet('/v1/users/me', apiKey);
      return {
        content: [
          {
            type: 'text',
            text: `Retrieved account profile for ${result.data?.email ?? 'authenticated account'}.`,
          },
        ],
        structuredContent: result,
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `assistantmail_get_me failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },
);

server.tool(
  'assistantmail_get_inbound_policy',
  'Gets inbound email policy settings for the authenticated account.',
  {
    apiKey: z.string().startsWith('amk_').optional(),
  },
  async ({ apiKey }) => {
    try {
      const result = await assistantMailGet('/v1/inbound-policy', apiKey);
      return {
        content: [
          {
            type: 'text',
            text: `Retrieved inbound policy (${result.data?.policy ?? 'unknown'}).`,
          },
        ],
        structuredContent: result,
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `assistantmail_get_inbound_policy failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },
);

server.tool(
  'assistantmail_update_inbound_policy',
  'Updates inbound email policy for the authenticated account.',
  {
    policy: z.enum(['owner', 'list', 'sent']),
    allowedSenders: z.array(z.string().email()).optional(),
    apiKey: z.string().startsWith('amk_').optional(),
  },
  async ({ policy, allowedSenders, apiKey }) => {
    try {
      const result = await assistantMailPut('/v1/inbound-policy', apiKey, {
        policy,
        allowedSenders,
      });
      return {
        content: [
          {
            type: 'text',
            text: `Updated inbound policy to ${policy}.`,
          },
        ],
        structuredContent: result,
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `assistantmail_update_inbound_policy failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },
);

server.tool(
  'assistantmail_create_mailbox',
  'Creates a mailbox for the authenticated account.',
  {
    displayName: z.string().min(1).max(120).optional(),
    address: z.string().min(1).optional(),
    apiKey: z.string().startsWith('amk_').optional(),
  },
  async ({ displayName, address, apiKey }) => {
    try {
      const result = await assistantMailPost('/v1/mailboxes', apiKey, {
        displayName,
        address,
      });
      return {
        content: [
          {
            type: 'text',
            text: `Created mailbox ${result.data?.mailbox?.mailboxId ?? '(unknown id)'}.`,
          },
        ],
        structuredContent: result,
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `assistantmail_create_mailbox failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },
);

server.tool(
  'assistantmail_list_mailboxes',
  'Lists mailboxes accessible to the authenticated account.',
  {
    apiKey: z.string().startsWith('amk_').optional(),
  },
  async ({ apiKey }) => {
    try {
      const result = await assistantMailGet('/v1/mailboxes', apiKey);
      return {
        content: [
          {
            type: 'text',
            text: `Retrieved ${Array.isArray(result.data?.mailboxes) ? result.data.mailboxes.length : 0} mailbox(es).`,
          },
        ],
        structuredContent: result,
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `assistantmail_list_mailboxes failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },
);

server.tool(
  'assistantmail_get_mailbox',
  'Gets mailbox metadata for a mailbox ID.',
  {
    mailboxId: z.string().min(1),
    apiKey: z.string().startsWith('amk_').optional(),
  },
  async ({ mailboxId, apiKey }) => {
    try {
      const result = await assistantMailGet(`/v1/mailboxes/${mailboxId}`, apiKey);
      return {
        content: [
          {
            type: 'text',
            text: `Retrieved mailbox ${mailboxId}.`,
          },
        ],
        structuredContent: result,
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `assistantmail_get_mailbox failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },
);

server.tool(
  'assistantmail_update_mailbox',
  'Updates mailbox metadata (currently display name).',
  {
    mailboxId: z.string().min(1),
    displayName: z.string().min(1).max(120),
    apiKey: z.string().startsWith('amk_').optional(),
  },
  async ({ mailboxId, displayName, apiKey }) => {
    try {
      const result = await assistantMailPut(`/v1/mailboxes/${mailboxId}`, apiKey, {
        displayName,
      });
      return {
        content: [
          {
            type: 'text',
            text: `Updated mailbox ${mailboxId}.`,
          },
        ],
        structuredContent: result,
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `assistantmail_update_mailbox failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },
);

server.tool(
  'assistantmail_delete_mailbox',
  'Deletes a mailbox and all associated messages.',
  {
    mailboxId: z.string().min(1),
    apiKey: z.string().startsWith('amk_').optional(),
  },
  async ({ mailboxId, apiKey }) => {
    try {
      const result = await assistantMailDelete(`/v1/mailboxes/${mailboxId}`, apiKey);
      return {
        content: [
          {
            type: 'text',
            text: `Deleted mailbox ${mailboxId}.`,
          },
        ],
        structuredContent: result,
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `assistantmail_delete_mailbox failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },
);

server.tool(
  'assistantmail_list_messages',
  'Lists inbound and outbound messages for a mailbox.',
  {
    mailboxId: z.string().min(1),
    since: z.string().datetime().optional(),
    limit: z.number().int().min(1).max(100).optional(),
    apiKey: z.string().startsWith('amk_').optional(),
  },
  async ({ mailboxId, since, limit, apiKey }) => {
    try {
      const result = await assistantMailGet(`/v1/mailboxes/${mailboxId}/messages`, apiKey, {
        since,
        limit,
      });
      return {
        content: [
          {
            type: 'text',
            text: `Retrieved ${Array.isArray(result.data?.messages) ? result.data.messages.length : 0} message(s) for mailbox ${mailboxId}.`,
          },
        ],
        structuredContent: result,
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `assistantmail_list_messages failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },
);

server.tool(
  'assistantmail_get_message',
  'Gets a specific message for a mailbox, including hydrated text/html bodies when available.',
  {
    mailboxId: z.string().min(1),
    messageId: z.string().min(1),
    apiKey: z.string().startsWith('amk_').optional(),
  },
  async ({ mailboxId, messageId, apiKey }) => {
    try {
      const result = await assistantMailGet(`/v1/mailboxes/${mailboxId}/messages/${messageId}`, apiKey);
      return {
        content: [
          {
            type: 'text',
            text: `Retrieved message ${messageId} for mailbox ${mailboxId}.`,
          },
        ],
        structuredContent: result,
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `assistantmail_get_message failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },
);

server.tool(
  'assistantmail_send_email',
  'Queues an outbound email for a mailbox.',
  {
    mailboxId: z.string().min(1),
    to: z.string().email(),
    subject: z.string().min(1),
    text: z.string().optional(),
    html: z.string().optional(),
    apiKey: z.string().startsWith('amk_').optional(),
  },
  async ({ mailboxId, to, subject, text, html, apiKey }) => {
    if (!text && !html) {
      return {
        content: [
          {
            type: 'text',
            text: 'assistantmail_send_email failed: Provide at least one of text or html.',
          },
        ],
        isError: true,
      };
    }

    try {
      const result = await assistantMailPost(`/v1/mailboxes/${mailboxId}/messages`, apiKey, {
        to,
        subject,
        text,
        html,
      });
      return {
        content: [
          {
            type: 'text',
            text: `Queued email to ${to} from mailbox ${mailboxId}.`,
          },
        ],
        structuredContent: result,
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `assistantmail_send_email failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },
);

server.tool(
  'assistantmail_reply_message',
  'Replies to an existing message in a mailbox thread.',
  {
    mailboxId: z.string().min(1),
    messageId: z.string().min(1),
    text: z.string().optional(),
    html: z.string().optional(),
    apiKey: z.string().startsWith('amk_').optional(),
  },
  async ({ mailboxId, messageId, text, html, apiKey }) => {
    if (!text && !html) {
      return {
        content: [
          {
            type: 'text',
            text: 'assistantmail_reply_message failed: Provide at least one of text or html.',
          },
        ],
        isError: true,
      };
    }

    try {
      const result = await assistantMailPost(
        `/v1/mailboxes/${mailboxId}/messages/${messageId}/reply`,
        apiKey,
        { text, html },
      );
      const reply = result.data;
      if (
        !reply
        || typeof reply !== 'object'
        || typeof reply.messageId !== 'string'
        || typeof reply.status !== 'string'
        || typeof reply.inReplyTo !== 'string'
        || typeof reply.subject !== 'string'
      ) {
        throw new Error('AssistantMail API returned an unexpected reply payload.');
      }
      return {
        content: [
          {
            type: 'text',
            text: `Queued reply for message ${messageId} in mailbox ${mailboxId}.`,
          },
        ],
        structuredContent: {
          messageId: reply.messageId,
          status: reply.status,
          inReplyTo: reply.inReplyTo,
          subject: reply.subject,
        },
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `assistantmail_reply_message failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },
);

server.tool(
  'assistantmail_delete_messages',
  'Deletes messages from a mailbox by IDs or deletes all messages.',
  {
    mailboxId: z.string().min(1),
    messageIds: z.array(z.string().min(1)).optional(),
    deleteAll: z.boolean().optional(),
    apiKey: z.string().startsWith('amk_').optional(),
  },
  async ({ mailboxId, messageIds, deleteAll, apiKey }) => {
    if (!deleteAll && (!Array.isArray(messageIds) || messageIds.length === 0)) {
      return {
        content: [
          {
            type: 'text',
            text: 'assistantmail_delete_messages failed: Provide messageIds or set deleteAll to true.',
          },
        ],
        isError: true,
      };
    }

    try {
      const result = await assistantMailDelete(`/v1/mailboxes/${mailboxId}/messages`, apiKey, {
        messageIds,
        deleteAll,
      });
      return {
        content: [
          {
            type: 'text',
            text: `Deleted messages for mailbox ${mailboxId}.`,
          },
        ],
        structuredContent: result,
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `assistantmail_delete_messages failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },
);

server.tool(
  'assistantmail_get_usage',
  'Gets daily and monthly send quota usage for a mailbox.',
  {
    mailboxId: z.string().min(1),
    apiKey: z.string().startsWith('amk_').optional(),
  },
  async ({ mailboxId, apiKey }) => {
    try {
      const result = await assistantMailGet(`/v1/mailboxes/${mailboxId}/usage`, apiKey);
      return {
        content: [
          {
            type: 'text',
            text: `Retrieved usage for mailbox ${mailboxId}.`,
          },
        ],
        structuredContent: result,
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `assistantmail_get_usage failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },
);

server.tool(
  'assistantmail_list_recipients',
  'Lists approved/pending recipients for the authenticated account.',
  {
    apiKey: z.string().startsWith('amk_').optional(),
  },
  async ({ apiKey }) => {
    try {
      const result = await assistantMailGet('/v1/recipients', apiKey);
      return {
        content: [
          {
            type: 'text',
            text: `Retrieved ${Array.isArray(result.data?.recipients) ? result.data.recipients.length : 0} recipient(s).`,
          },
        ],
        structuredContent: result,
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `assistantmail_list_recipients failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },
);

server.tool(
  'assistantmail_add_recipient',
  'Adds a recipient and sends a consent invitation when required.',
  {
    email: z.string().email(),
    apiKey: z.string().startsWith('amk_').optional(),
  },
  async ({ email, apiKey }) => {
    try {
      const result = await assistantMailPost('/v1/recipients', apiKey, { email });
      return {
        content: [
          {
            type: 'text',
            text: `Processed recipient ${email}.`,
          },
        ],
        structuredContent: result,
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `assistantmail_add_recipient failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },
);

server.tool(
  'assistantmail_remove_recipient',
  'Removes a recipient from the allowed recipient list.',
  {
    email: z.string().email(),
    apiKey: z.string().startsWith('amk_').optional(),
  },
  async ({ email, apiKey }) => {
    try {
      const result = await assistantMailDelete(`/v1/recipients/${encodeURIComponent(email)}`, apiKey);
      return {
        content: [
          {
            type: 'text',
            text: `Removed recipient ${email}.`,
          },
        ],
        structuredContent: result,
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `assistantmail_remove_recipient failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },
);

server.tool(
  'assistantmail_send_email_reference',
  'Provides the AssistantMail REST endpoint and required headers for email send requests.',
  {
    mailboxId: z.string().min(1),
  },
  async ({ mailboxId }) => ({
    content: [
      {
        type: 'text',
        text: [
          `Use POST ${apiBaseUrl}/v1/mailboxes/${mailboxId}/messages to queue outbound email.`,
          'Headers: x-api-key: <your-api-key>, Content-Type: application/json',
          'Body fields: to (required), subject (required), text and/or html (at least one required).',
        ].join(' '),
      },
    ],
    structuredContent: {
      endpoint: `${apiBaseUrl}/v1/mailboxes/${mailboxId}/messages`,
      method: 'POST',
      headers: {
        'x-api-key': '<your-api-key>',
        'Content-Type': 'application/json',
      },
      bodyFields: {
        to: 'string (required) - recipient email address',
        subject: 'string (required)',
        text: 'string (optional) - plain-text body',
        html: 'string (optional) - HTML body',
      },
      note: 'At least one of text or html is required. Provide both for best email client compatibility.',
      exampleBody: {
        to: 'recipient@example.com',
        subject: 'Hello from AssistantMail',
        text: 'Message body',
        html: '<p>Message body</p>',
      },
    },
  }),
);

server.tool(
  'assistantmail_list_messages_reference',
  'Provides the AssistantMail REST endpoint for listing messages (inbound and outbound) in a mailbox.',
  {
    mailboxId: z.string().min(1),
  },
  async ({ mailboxId }) => ({
    content: [
      {
        type: 'text',
        text: [
          `Use GET ${apiBaseUrl}/v1/mailboxes/${mailboxId}/messages to list messages.`,
          'Headers: x-api-key: <your-api-key>.',
          'Optional query params: since (ISO timestamp to filter messages after), limit (max 100, default 50).',
          'Returns both inbound and outbound messages.',
        ].join(' '),
      },
    ],
    structuredContent: {
      endpoint: `${apiBaseUrl}/v1/mailboxes/${mailboxId}/messages`,
      method: 'GET',
      headers: {
        'x-api-key': '<your-api-key>',
      },
      queryParams: {
        since: 'ISO 8601 timestamp (optional) - return messages after this time',
        limit: 'integer 1-100 (optional, default 50)',
      },
    },
  }),
);

server.tool(
  'assistantmail_get_message_reference',
  'Provides the AssistantMail REST endpoint for fetching a single message including its full body content.',
  {
    mailboxId: z.string().min(1),
    messageId: z.string().min(1),
  },
  async ({ mailboxId, messageId }) => ({
    content: [
      {
        type: 'text',
        text: [
          `Use GET ${apiBaseUrl}/v1/mailboxes/${mailboxId}/messages/${messageId} to fetch the full message.`,
          'Headers: x-api-key: <your-api-key>.',
          'Returns message metadata plus textBody and htmlBody fields populated from storage when still within the body-retention window.',
          'If the retention window has elapsed, textBody/htmlBody are omitted and bodyExpired is true.',
        ].join(' '),
      },
    ],
    structuredContent: {
      endpoint: `${apiBaseUrl}/v1/mailboxes/${mailboxId}/messages/${messageId}`,
      method: 'GET',
      headers: {
        'x-api-key': '<your-api-key>',
      },
      responseFields: {
        message: {
          messageId: 'string',
          direction: '"inbound" | "outbound"',
          from: 'string',
          to: 'string',
          subject: 'string',
          status: '"queued" | "sent" | "failed" | "received"',
          textBody: 'string | undefined - plain-text body (populated at read time)',
          htmlBody: 'string | undefined - HTML body (populated at read time)',
          bodyExpired: 'boolean | undefined - true when body retention has elapsed',
          createdAt: 'ISO timestamp',
        },
      },
    },
  }),
);

server.tool(
  'assistantmail_get_usage_reference',
  'Provides the AssistantMail REST endpoint for checking send quota usage for a mailbox.',
  {
    mailboxId: z.string().min(1),
  },
  async ({ mailboxId }) => ({
    content: [
      {
        type: 'text',
        text: [
          `Use GET ${apiBaseUrl}/v1/mailboxes/${mailboxId}/usage to check send quota.`,
          'Headers: x-api-key: <your-api-key>.',
          'Returns daily and monthly usage counts and limits for the account tier.',
          'A null limit means unlimited for that period.',
        ].join(' '),
      },
    ],
    structuredContent: {
      endpoint: `${apiBaseUrl}/v1/mailboxes/${mailboxId}/usage`,
      method: 'GET',
      headers: {
        'x-api-key': '<your-api-key>',
      },
      responseFields: {
        tier: 'string - account plan name',
        day: { used: 'number', limit: 'number | null' },
        month: { used: 'number', limit: 'number | null' },
      },
    },
  }),
);

const transport = new StdioServerTransport();
await server.connect(transport);
