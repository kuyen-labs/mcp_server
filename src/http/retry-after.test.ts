import { describe, expect, it } from 'vitest';

import { formatRateLimitMessage, parseRetryAfterFromHeaders } from './retry-after.js';

describe('parseRetryAfterFromHeaders', () => {
  it('parses delay-seconds', () => {
    expect(parseRetryAfterFromHeaders({ 'retry-after': '120' })).toBe(120);
  });

  it('parses array header', () => {
    expect(parseRetryAfterFromHeaders({ 'retry-after': ['60'] })).toBe(60);
  });

  it('returns undefined for missing header', () => {
    expect(parseRetryAfterFromHeaders({})).toBeUndefined();
  });
});

describe('formatRateLimitMessage', () => {
  it('includes seconds when provided', () => {
    expect(formatRateLimitMessage(30)).toContain('30');
    expect(formatRateLimitMessage(30)).toContain('429');
  });

  it('works without retry-after', () => {
    expect(formatRateLimitMessage(undefined)).toContain('429');
  });
});
