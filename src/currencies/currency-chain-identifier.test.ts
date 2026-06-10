import { describe, expect, it } from 'vitest';

import { chainIdentifierFromChainId, normalizeCurrencyChainIdentifier } from './currency-chain-identifier.js';

describe('chainIdentifierFromChainId', () => {
  it('returns numeric string for EVM chain_id', () => {
    expect(chainIdentifierFromChainId(1)).toBe('1');
    expect(chainIdentifierFromChainId(42161)).toBe('42161');
  });
});

describe('normalizeCurrencyChainIdentifier', () => {
  it('passes through numeric strings', () => {
    expect(normalizeCurrencyChainIdentifier('1')).toBe('1');
    expect(normalizeCurrencyChainIdentifier('42161')).toBe('42161');
  });

  it('maps EVM slug aliases to numeric strings', () => {
    expect(normalizeCurrencyChainIdentifier('ethereum')).toBe('1');
    expect(normalizeCurrencyChainIdentifier('Ethereum')).toBe('1');
    expect(normalizeCurrencyChainIdentifier('arbitrum')).toBe('42161');
    expect(normalizeCurrencyChainIdentifier('optimistic-ethereum')).toBe('10');
  });

  it('passes through non-EVM identifiers unchanged', () => {
    const solanaGenesis = '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
    expect(normalizeCurrencyChainIdentifier(solanaGenesis)).toBe(solanaGenesis);
  });
});
