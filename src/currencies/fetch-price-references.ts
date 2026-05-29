import type { FuulApiClient } from '../http/fuul-api-client.js';

const CURRENCIES_PATH = '/api/v1/currencies';

export type PriceReferenceRow = {
  id: string;
  name: string;
  identifier: string;
  chain_identifier: string;
  decimals: number;
};

export async function fetchPriceReferences(api: FuulApiClient, chainIdentifier: string): Promise<PriceReferenceRow[]> {
  const data = await api.getJson(CURRENCIES_PATH, {
    query: {
      price_reference: true,
      chain_identifier: chainIdentifier,
      page: 1,
      page_size: 100,
    },
  });

  return parsePriceReferenceResults(data);
}

export function parsePriceReferenceResults(raw: unknown): PriceReferenceRow[] {
  if (!raw || typeof raw !== 'object') {
    return [];
  }

  const results = (raw as { results?: unknown }).results;
  if (!Array.isArray(results)) {
    return [];
  }

  const rows: PriceReferenceRow[] = [];
  for (const row of results) {
    if (!row || typeof row !== 'object') {
      continue;
    }
    const r = row as Record<string, unknown>;
    if (typeof r.identifier !== 'string' || typeof r.name !== 'string' || typeof r.decimals !== 'number') {
      continue;
    }
    rows.push({
      id: typeof r.id === 'string' ? r.id : '',
      name: r.name,
      identifier: r.identifier,
      chain_identifier: typeof r.chain_identifier === 'string' ? r.chain_identifier : '',
      decimals: r.decimals,
    });
  }

  return rows;
}
