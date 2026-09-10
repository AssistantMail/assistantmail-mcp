import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatApiErrorText } from '../src/format-api-error.js';
import { assistantMailRequest } from '../src/assistant-mail-request.js';

const FREE_LIMIT_UPGRADE_URL =
  'https://app.assistant-mail.ai/upgrade?plan=starter&utm_source=mcp&utm_medium=error&utm_campaign=mcp_limit';

const freeLimitBody = {
  message: 'Free plan daily send limit reached (25/day).',
  fix: 'Upgrade to Starter for a higher daily send limit.',
  upgradeUrl: FREE_LIMIT_UPGRADE_URL,
};

test('joins message, fix, and upgradeUrl with newlines', () => {
  const toolErrorText = formatApiErrorText(freeLimitBody, 429);
  assert.equal(
    toolErrorText,
    [
      freeLimitBody.message,
      freeLimitBody.fix,
      FREE_LIMIT_UPGRADE_URL,
    ].join('\n'),
  );
});

test('Free limit tool error text includes locked mcp_limit upgrade CTA', () => {
  const toolErrorText = formatApiErrorText(freeLimitBody, 429);
  assert.match(toolErrorText, /utm_campaign=mcp_limit/);
  assert.match(toolErrorText, /utm_source=mcp/);
  assert.match(toolErrorText, /utm_medium=error/);
  assert.equal(
    toolErrorText.split('\n').at(-1),
    FREE_LIMIT_UPGRADE_URL,
  );
});

test('uses error or code when message is absent', () => {
  assert.equal(
    formatApiErrorText({ error: 'Policy rejected this recipient.', code: 'INBOUND_POLICY' }, 403),
    'Policy rejected this recipient.',
  );
  assert.equal(
    formatApiErrorText({ code: 'RATE_LIMITED' }, 429),
    'RATE_LIMITED',
  );
});

test('preserves non-upgrade errors as a single message line', () => {
  assert.equal(
    formatApiErrorText({ message: 'Invalid API key.' }, 401),
    'Invalid API key.',
  );
  assert.equal(
    formatApiErrorText({ raw: '<html>gateway timeout</html>' }, 504),
    'AssistantMail API request failed (504).',
  );
});

test('assistantMailRequest throws joined Free limit text as the tool error', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify(freeLimitBody), {
    status: 429,
    headers: { 'Content-Type': 'application/json' },
  });

  try {
    await assert.rejects(
      () => assistantMailRequest({
        method: 'POST',
        path: '/v1/mailboxes/mbx_test/messages',
        apiKey: 'amk_test',
        body: { to: 'user@example.com', subject: 'Hi', text: 'Hello' },
      }),
      (error) => {
        assert.ok(error instanceof Error);
        assert.match(error.message, /utm_campaign=mcp_limit/);
        assert.equal(
          error.message,
          [
            freeLimitBody.message,
            freeLimitBody.fix,
            FREE_LIMIT_UPGRADE_URL,
          ].join('\n'),
        );
        return true;
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('assistantMailRequest preserves non-upgrade API error text', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ message: 'Mailbox not found.' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });

  try {
    await assert.rejects(
      () => assistantMailRequest({
        method: 'GET',
        path: '/v1/mailboxes/missing',
        apiKey: 'amk_test',
      }),
      (error) => {
        assert.equal(error.message, 'Mailbox not found.');
        assert.doesNotMatch(error.message, /upgrade/i);
        return true;
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
