import type { AxiosResponseHeaders, RawAxiosResponseHeaders } from 'axios';

/**
 * Parses Retry-After from response headers (seconds or HTTP-date).
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Retry-After
 */
export function parseRetryAfterFromHeaders(headers: RawAxiosResponseHeaders | AxiosResponseHeaders): number | undefined {
  const raw = headers['retry-after'] ?? headers['Retry-After'];
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v == null || v === '') {
    return undefined;
  }
  const s = String(v).trim();
  const asNum = Number(s);
  if (Number.isFinite(asNum) && asNum >= 0) {
    return Math.ceil(asNum);
  }
  const dateMs = Date.parse(s);
  if (Number.isFinite(dateMs)) {
    return Math.max(0, Math.ceil((dateMs - Date.now()) / 1000));
  }
  return undefined;
}

export function formatRateLimitMessage(retryAfterSeconds?: number): string {
  if (retryAfterSeconds != null && retryAfterSeconds > 0) {
    return `Rate limited (HTTP 429). Retry after approximately ${retryAfterSeconds} second(s). Back off and avoid parallel bursts.`;
  }
  return 'Rate limited (HTTP 429). Back off and retry later; respect Retry-After when present.';
}
