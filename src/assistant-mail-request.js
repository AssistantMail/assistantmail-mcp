import { formatApiErrorText } from './format-api-error.js';

export const apiBaseUrl = process.env.ASSISTANT_MAIL_API_BASE_URL ?? 'https://api.assistant-mail.ai';
const defaultApiKey = process.env.ASSISTANT_MAIL_API_KEY ?? '';

export function resolveApiKey(inputApiKey) {
  const key = (inputApiKey ?? '').trim() || defaultApiKey.trim();
  return key.startsWith('amk_') ? key : null;
}

export async function assistantMailRequest({ method, path, apiKey, query = {}, body }) {
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
    throw new Error(formatApiErrorText(parsed, res.status));
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

export async function assistantMailGet(path, apiKey, query = {}) {
  return assistantMailRequest({ method: 'GET', path, apiKey, query });
}

export async function assistantMailPost(path, apiKey, body) {
  return assistantMailRequest({ method: 'POST', path, apiKey, body });
}

export async function assistantMailPut(path, apiKey, body) {
  return assistantMailRequest({ method: 'PUT', path, apiKey, body });
}

export async function assistantMailDelete(path, apiKey, body) {
  return assistantMailRequest({ method: 'DELETE', path, apiKey, body });
}
