import { describe, expect, it, vi } from 'vitest';

import type { FuulApiClient } from '../http/fuul-api-client.js';
import { MetadataService } from './metadata-service.js';

function okResponse(data: unknown) {
  return {
    status: 200 as const,
    data,
    etag: undefined as string | undefined,
    cacheControl: undefined as string | undefined,
    retryAfterSeconds: undefined as number | undefined,
  };
}

describe('MetadataService', () => {
  it('requests chains path on cold cache', async () => {
    const getAuthorized = vi.fn().mockResolvedValue(okResponse([{ chain_id: 1 }]));
    const api = { getAuthorized } as unknown as FuulApiClient;
    const svc = new MetadataService(api);
    await svc.getChains();
    expect(getAuthorized).toHaveBeenCalledWith('/public-api/v1/metadata/chains', undefined);
  });

  it('sends If-None-Match on second call when etag present', async () => {
    const getAuthorized = vi
      .fn()
      .mockResolvedValueOnce({
        ...okResponse({ v: 1 }),
        etag: '"abc"',
        cacheControl: 'max-age=0',
      })
      .mockResolvedValueOnce({
        status: 304 as const,
        data: undefined,
        etag: '"abc"',
        cacheControl: 'max-age=60',
        retryAfterSeconds: undefined,
      });

    const api = { getAuthorized } as unknown as FuulApiClient;
    const svc = new MetadataService(api);
    await svc.getChains();
    await svc.getChains();

    expect(getAuthorized).toHaveBeenLastCalledWith('/public-api/v1/metadata/chains', {
      'If-None-Match': '"abc"',
    });
  });
});
