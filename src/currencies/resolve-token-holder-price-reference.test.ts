import { describe, expect, it } from 'vitest';

import { DAI_ETHEREUM, EXAMPLE_UNKNOWN_STABLECOIN_18D } from '../triggers/price-reference-guide.js';
import type { PriceReferenceRow } from './fetch-price-references.js';
import { pickPriceReference, resolveTokenHolderPriceReference } from './resolve-token-holder-price-reference.js';

const ethereumRefs: PriceReferenceRow[] = [
  {
    id: '1',
    name: 'DAI',
    identifier: DAI_ETHEREUM,
    chain_identifier: 'ethereum',
    decimals: 18,
  },
  {
    id: '2',
    name: 'USDC',
    identifier: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    chain_identifier: 'ethereum',
    decimals: 6,
  },
  {
    id: '3',
    name: 'WETH',
    identifier: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    chain_identifier: 'ethereum',
    decimals: 18,
  },
];

describe('resolveTokenHolderPriceReference', () => {
  it('listed token uses same address', () => {
    const result = resolveTokenHolderPriceReference({ token_address: DAI_ETHEREUM, chain_identifier: 'ethereum' }, ethereumRefs);
    expect(result.status).toBe('listed_use_same_address');
    expect(result.volume_currency_expression).toBe(DAI_ETHEREUM);
    expect(result.token_is_listed_as_price_reference).toBe(true);
  });

  it('unlisted token without answers asks user', () => {
    const result = resolveTokenHolderPriceReference({ token_address: EXAMPLE_UNKNOWN_STABLECOIN_18D, chain_identifier: 'ethereum' }, ethereumRefs);
    expect(result.status).toBe('needs_user_input');
    expect(result.volume_currency_expression).toBeNull();
    expect(result.questions_for_user).toHaveLength(2);
  });

  it('unlisted 18-decimal stablecoin assigns DAI', () => {
    const result = resolveTokenHolderPriceReference(
      {
        token_address: EXAMPLE_UNKNOWN_STABLECOIN_18D,
        chain_identifier: 'ethereum',
        token_kind: 'stablecoin',
        decimals: 18,
      },
      ethereumRefs,
    );
    expect(result.status).toBe('resolved');
    expect(result.volume_currency_expression).toBe(DAI_ETHEREUM);
    expect(result.assigned_reference?.name).toBe('DAI');
  });

  it('unlisted 6-decimal stablecoin assigns USDC', () => {
    const result = resolveTokenHolderPriceReference(
      {
        token_address: EXAMPLE_UNKNOWN_STABLECOIN_18D,
        chain_identifier: 'ethereum',
        token_kind: 'stablecoin',
        decimals: 6,
      },
      ethereumRefs,
    );
    expect(result.volume_currency_expression).toBe('0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48');
  });

  it('variable 18 decimals assigns WETH', () => {
    const result = resolveTokenHolderPriceReference(
      {
        token_address: EXAMPLE_UNKNOWN_STABLECOIN_18D,
        chain_identifier: 'ethereum',
        token_kind: 'variable',
        decimals: 18,
      },
      ethereumRefs,
    );
    expect(result.assigned_reference?.name).toBe('WETH');
  });
});

describe('pickPriceReference', () => {
  it('prefers DAI for stablecoin 18', () => {
    expect(pickPriceReference(ethereumRefs, 'stablecoin', 18)?.name).toBe('DAI');
  });
});
