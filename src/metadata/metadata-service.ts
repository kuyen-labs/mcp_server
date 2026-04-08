import { ApiRequestError, type FuulApiClient } from '../http/fuul-api-client.js';
import { formatRateLimitMessage } from '../http/retry-after.js';

/** Aligns with server {@link PUBLIC_API_METADATA_CACHE_TTL_MS} when Cache-Control is absent. */
const DEFAULT_METADATA_FRESH_MS = 15 * 60 * 1000;

const PATH_CHAINS = '/public-api/v1/metadata/chains';
const PATH_TRIGGER_TYPES = '/public-api/v1/metadata/trigger-types';
const PATH_PAYOUT_SCHEMAS = '/public-api/v1/metadata/payout-schemas';

type CacheEntry = {
  data: unknown;
  etag?: string;
  expiresAt: number;
};

export class MetadataService {
  private readonly cache = new Map<string, CacheEntry>();

  constructor(private readonly api: FuulApiClient) {}

  getChains(): Promise<unknown> {
    return this.getCached(PATH_CHAINS);
  }

  getTriggerTypes(): Promise<unknown> {
    return this.getCached(PATH_TRIGGER_TYPES);
  }

  getPayoutSchemas(): Promise<unknown> {
    return this.getCached(PATH_PAYOUT_SCHEMAS);
  }

  private async getCached(path: string): Promise<unknown> {
    const now = Date.now();
    const entry = this.cache.get(path);

    if (entry && now < entry.expiresAt) {
      return entry.data;
    }

    const conditionalHeaders: Record<string, string> = {};
    if (entry?.etag) {
      conditionalHeaders['If-None-Match'] = entry.etag;
    }

    const res = await this.api.getAuthorized(path, Object.keys(conditionalHeaders).length ? conditionalHeaders : undefined);

    if (res.status === 304) {
      if (!entry) {
        throw new ApiRequestError('Unexpected HTTP 304 without local cache', 304);
      }
      const ttl = parseMaxAgeMs(res.cacheControl) ?? DEFAULT_METADATA_FRESH_MS;
      this.cache.set(path, { ...entry, expiresAt: now + ttl });
      return entry.data;
    }

    if (res.status !== 200) {
      if (res.status === 429) {
        throw new ApiRequestError(formatRateLimitMessage(res.retryAfterSeconds), 429, res.data, res.retryAfterSeconds);
      }
      throw new ApiRequestError(`Metadata request failed (HTTP ${res.status})`, res.status, res.data);
    }

    const ttl = parseMaxAgeMs(res.cacheControl) ?? DEFAULT_METADATA_FRESH_MS;
    this.cache.set(path, {
      data: res.data,
      etag: res.etag,
      expiresAt: now + ttl,
    });
    return res.data;
  }
}

function parseMaxAgeMs(cacheControl: string | undefined): number | undefined {
  if (!cacheControl) {
    return undefined;
  }
  const m = /max-age=(\d+)/i.exec(cacheControl);
  if (!m) {
    return undefined;
  }
  const sec = Number(m[1]);
  if (!Number.isFinite(sec) || sec < 0) {
    return undefined;
  }
  return sec * 1000;
}
