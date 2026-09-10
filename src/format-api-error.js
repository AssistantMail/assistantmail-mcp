function asNonEmptyString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/**
 * Join AssistantMail API error JSON into copy-pasteable tool error text.
 * Order: message (or error/code) + fix + upgradeUrl, newline-separated.
 * Missing fields are omitted so non-upgrade errors stay a single line.
 */
export function formatApiErrorText(parsed, status = 0) {
  const message =
    asNonEmptyString(parsed?.message)
    ?? asNonEmptyString(parsed?.error)
    ?? asNonEmptyString(parsed?.code)
    ?? `AssistantMail API request failed (${status}).`;

  const lines = [message];

  const fix = asNonEmptyString(parsed?.fix);
  if (fix) {
    lines.push(fix);
  }

  const upgradeUrl = asNonEmptyString(parsed?.upgradeUrl);
  if (upgradeUrl) {
    lines.push(upgradeUrl);
  }

  return lines.join('\n');
}
