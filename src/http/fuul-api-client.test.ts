import type { AxiosResponse } from 'axios';
import { describe, expect, it } from 'vitest';

import { ApiRequestError, throwIfNotSuccess } from './fuul-api-client.js';

function mockRes(status: number, data: unknown, headers: Record<string, string> = {}): AxiosResponse {
  return {
    status,
    data,
    statusText: '',
    headers,
    config: {} as never,
  };
}

describe('throwIfNotSuccess', () => {
  it('passes for 200', () => {
    expect(() => throwIfNotSuccess(mockRes(200, {}))).not.toThrow();
  });

  it('throws ApiRequestError for 400 with message', () => {
    expect(() => throwIfNotSuccess(mockRes(400, { message: 'bad' }))).toThrow(ApiRequestError);
    try {
      throwIfNotSuccess(mockRes(400, { message: 'bad' }));
    } catch (e) {
      expect(e instanceof ApiRequestError && e.message).toBe('bad');
    }
  });

  it('throws ApiRequestError for 429', () => {
    expect(() => throwIfNotSuccess(mockRes(429, {}, { 'retry-after': '10' }))).toThrow(ApiRequestError);
    try {
      throwIfNotSuccess(mockRes(429, {}, { 'retry-after': '10' }));
    } catch (e) {
      expect(e instanceof ApiRequestError && e.status).toBe(429);
      expect(e instanceof ApiRequestError && e.retryAfterSeconds).toBe(10);
    }
  });
});
