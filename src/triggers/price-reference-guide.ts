/**
 * Agent guidance for token-holder volume_currency_expression (price reference).
 * Aligned with fuul-webapp mapToTokenHoldersTriggerDTO and PriceReferenceSelect.
 */

export const DAI_ETHEREUM = '0x6b175474e89094c44da98b954eedeac495271d0f';
export const EXAMPLE_UNKNOWN_STABLECOIN_18D = '0xa3931d71877C0E7a3148CB7Eb4463524FEc27fbD';

export const TOKEN_HOLDER_TYPES_WITH_PRICE_REF = new Set([
  'token-holder',
  'liquidity-pool-v2',
  'balancer',
  'solana-token-holder',
  'fogo-token-holder',
]);

export const TOKEN_HOLDER_PRICE_REFERENCE_GUIDE = {
  field_on_wire: 'context.volume_currency_expression',
  when_token_is_listed:
    'If the token address appears in list_price_references results (compare identifier case-insensitively for EVM), set volume_currency_expression to the token address.',
  when_token_is_not_listed: [
    'Ask the user: Is this a stablecoin or a variable-price token?',
    'Ask the user: How many decimals does the token have? (6 or 18 — verify on Etherscan/Arbiscan/etc.)',
    'Pick a price reference from list_price_references with the same decimals on that chain.',
    'Set volume_currency_expression to that reference identifier (not the held token address).',
  ],
  decimal_hints: {
    '6_stablecoin': 'Prefer USDC or another 6-decimal stablecoin on that chain.',
    '18_stablecoin': 'Prefer DAI or another 18-decimal stablecoin on that chain.',
    '18_variable': 'Prefer WETH or another 18-decimal liquid asset on that chain.',
  },
  examples: {
    working: {
      token_address: DAI_ETHEREUM,
      chain: 'ethereum (chain_id 1)',
      volume_currency_expression: DAI_ETHEREUM,
      note: 'DAI is already a price reference — use the same address.',
    },
    broken_if_misconfigured: {
      token_address: EXAMPLE_UNKNOWN_STABLECOIN_18D,
      chain: 'ethereum (chain_id 1)',
      wrong: `volume_currency_expression = ${EXAMPLE_UNKNOWN_STABLECOIN_18D}`,
      correct: `volume_currency_expression = ${DAI_ETHEREUM} (18-decimal stablecoin → DAI)`,
      note: 'Token not listed; trigger returns 201 but never prices volume correctly without a valid reference.',
    },
  },
} as const;

export const PRICE_REFERENCE_POST_CREATE_WARNING =
  'Verify volume_currency_expression for this token-holder trigger. Call list_price_references for the chain before create if you have not already. ' +
  'If the held token is not in that list, the user must confirm stablecoin vs variable-price and decimals; use a listed reference with matching decimals. ' +
  `Example: unknown 18-decimal stablecoin on Ethereum → DAI (${DAI_ETHEREUM}). ` +
  'Wrong reference → trigger saves but volume/pricing fails at runtime.';

export function normalizeEvmAddress(address: string): string {
  return address.trim().toLowerCase();
}

export function isTokenListedAsPriceReference(tokenAddress: string, results: Array<{ identifier?: string }>): boolean {
  const normalized = normalizeEvmAddress(tokenAddress);
  return results.some((row) => typeof row.identifier === 'string' && normalizeEvmAddress(row.identifier) === normalized);
}
