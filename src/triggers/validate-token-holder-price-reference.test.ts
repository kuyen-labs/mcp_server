import { describe, expect, it, vi } from 'vitest';

import { DAI_ETHEREUM } from './price-reference-guide.js';
import { assertTokenHolderPriceReferenceValid } from './validate-token-holder-price-reference.js';

vi.mock('../currencies/fetch-price-references.js', () => ({
  fetchPriceReferences: vi.fn(),
}));

import { fetchPriceReferences } from '../currencies/fetch-price-references.js';

const mockFetchPriceReferences = vi.mocked(fetchPriceReferences);

describe('assertTokenHolderPriceReferenceValid', () => {
  it('accepts listed token when chain_id resolves to numeric chain_identifier', async () => {
    mockFetchPriceReferences.mockResolvedValue([
      {
        id: '1',
        name: 'DAI',
        identifier: DAI_ETHEREUM,
        chain_identifier: '1',
        decimals: 18,
      },
    ]);

    await expect(
      assertTokenHolderPriceReferenceValid({ getJson: vi.fn() } as never, {
        type: 'token-holder',
        context: {
          token_address: DAI_ETHEREUM,
          volume_currency_expression: DAI_ETHEREUM,
          chain_id: 1,
        },
      }),
    ).resolves.toBeUndefined();

    expect(mockFetchPriceReferences).toHaveBeenCalledWith(expect.anything(), '1');
  });

  it('accepts listed reference when chain_identifier slug is normalized', async () => {
    mockFetchPriceReferences.mockResolvedValue([
      {
        id: '1',
        name: 'DAI',
        identifier: DAI_ETHEREUM,
        chain_identifier: '1',
        decimals: 18,
      },
    ]);

    await expect(
      assertTokenHolderPriceReferenceValid({ getJson: vi.fn() } as never, {
        type: 'token-holder',
        context: {
          token_address: DAI_ETHEREUM,
          volume_currency_expression: DAI_ETHEREUM,
          chain_identifier: 'ethereum',
        },
      }),
    ).resolves.toBeUndefined();

    expect(mockFetchPriceReferences).toHaveBeenCalledWith(expect.anything(), '1');
  });
});
