/**
 * Currencies API chain_identifier values match fuul-webapp: EVM chains use numeric strings
 * (String(chain_id)), e.g. "1" for Ethereum. Slug aliases are accepted for agent convenience.
 */

/** EVM slug aliases → currencies API chain_identifier (numeric string). */
export const EVM_CHAIN_SLUG_ALIASES: Record<string, string> = {
  ethereum: '1',
  'optimistic-ethereum': '10',
  optimism: '10',
  polygon: '137',
  arbitrum: '42161',
  base: '8453',
};

export function chainIdentifierFromChainId(chainId: number): string {
  return String(chainId);
}

export function normalizeCurrencyChainIdentifier(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return trimmed;
  }

  if (/^\d+$/.test(trimmed)) {
    return trimmed;
  }

  const alias = EVM_CHAIN_SLUG_ALIASES[trimmed.toLowerCase()];
  if (alias) {
    return alias;
  }

  return trimmed;
}
