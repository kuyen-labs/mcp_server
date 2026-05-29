import { describe, expect, it, vi } from 'vitest';

import { enrichPriceReferencesResponse, runListPriceReferences } from './currency-handlers.js';

describe('runListPriceReferences', () => {
  it('calls currencies API with price_reference=true', async () => {
    const getJson = vi.fn().mockResolvedValue({ results: [], next_page: null });
    await runListPriceReferences({ getJson } as never, {});
    expect(getJson).toHaveBeenCalledWith('/api/v1/currencies', {
      query: {
        price_reference: true,
        page: 1,
        page_size: 100,
      },
    });
  });

  it('adds chain_identifier filter when provided', async () => {
    const getJson = vi.fn().mockResolvedValue({ results: [] });
    await runListPriceReferences({ getJson } as never, { chain_identifier: 'ethereum' });
    expect(getJson).toHaveBeenCalledWith('/api/v1/currencies', {
      query: expect.objectContaining({ chain_identifier: 'ethereum' }),
    });
  });
});

describe('enrichPriceReferencesResponse', () => {
  it('attaches token_holder_price_reference_guide', () => {
    const enriched = enrichPriceReferencesResponse({
      results: [{ identifier: '0x6b175474e89094c44da98b954eedeac495271d0f', name: 'DAI', decimals: 18 }],
    }) as { token_holder_price_reference_guide: { field_on_wire: string } };

    expect(enriched.token_holder_price_reference_guide.field_on_wire).toBe('context.volume_currency_expression');
  });
});
