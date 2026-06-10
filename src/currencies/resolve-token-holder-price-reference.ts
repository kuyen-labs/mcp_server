import { isTokenListedAsPriceReference, normalizeEvmAddress } from '../triggers/price-reference-guide.js';
import type { PriceReferenceRow } from './fetch-price-references.js';

export type TokenKind = 'stablecoin' | 'variable';
export type TokenDecimals = 6 | 18;

export type ResolveTokenHolderPriceReferenceInput = {
  token_address: string;
  chain_identifier: string;
  token_kind?: TokenKind;
  decimals?: TokenDecimals;
};

export type ResolveTokenHolderPriceReferenceResult = {
  token_address: string;
  chain_identifier: string;
  token_is_listed_as_price_reference: boolean;
  status: 'listed_use_same_address' | 'resolved' | 'needs_user_input' | 'no_matching_reference';
  volume_currency_expression: string | null;
  assigned_reference: Pick<PriceReferenceRow, 'identifier' | 'name' | 'decimals'> | null;
  reason: string;
  questions_for_user?: string[];
  matching_references_by_decimals?: Array<Pick<PriceReferenceRow, 'identifier' | 'name' | 'decimals'>>;
};

const STABLECOIN_18_PREFERRED_NAMES = ['DAI'];
const STABLECOIN_6_PREFERRED_NAMES = ['USDC'];
const VARIABLE_18_PREFERRED_NAMES = ['WETH', 'ETH', 'WSTETH'];

export function resolveTokenHolderPriceReference(
  input: ResolveTokenHolderPriceReferenceInput,
  priceReferences: PriceReferenceRow[],
): ResolveTokenHolderPriceReferenceResult {
  const tokenAddress = input.token_address.trim();
  const chainIdentifier = input.chain_identifier.trim();

  const base = {
    token_address: tokenAddress,
    chain_identifier: chainIdentifier,
    token_is_listed_as_price_reference: isTokenListedAsPriceReference(tokenAddress, priceReferences),
  };

  if (base.token_is_listed_as_price_reference) {
    return {
      ...base,
      status: 'listed_use_same_address',
      volume_currency_expression: tokenAddress,
      assigned_reference: findListedRow(tokenAddress, priceReferences),
      reason:
        'Token is already a price reference in Fuul. Set context.volume_currency_expression to the same address as token_address, then create_trigger.',
    };
  }

  if (input.token_kind == null || input.decimals == null) {
    return {
      ...base,
      status: 'needs_user_input',
      volume_currency_expression: null,
      assigned_reference: null,
      reason: 'Token is not a listed price reference. Ask the user before create_trigger, then call this tool again with token_kind and decimals.',
      questions_for_user: [
        'Is this a stablecoin or a variable-price token? (stablecoin | variable)',
        'How many decimals does the token have? (6 or 18 — verify on Etherscan/Arbiscan/etc.)',
      ],
      matching_references_by_decimals: undefined,
    };
  }

  const assigned = pickPriceReference(priceReferences, input.token_kind, input.decimals);

  if (!assigned) {
    const withDecimals = priceReferences.filter((r) => r.decimals === input.decimals);
    return {
      ...base,
      status: 'no_matching_reference',
      volume_currency_expression: null,
      assigned_reference: null,
      reason: `No price reference with ${input.decimals} decimals on ${chainIdentifier}. Contact Fuul support or pick manually from list_price_references.`,
      matching_references_by_decimals: withDecimals.map((r) => ({
        identifier: r.identifier,
        name: r.name,
        decimals: r.decimals,
      })),
    };
  }

  return {
    ...base,
    status: 'resolved',
    volume_currency_expression: assigned.identifier,
    assigned_reference: {
      identifier: assigned.identifier,
      name: assigned.name,
      decimals: assigned.decimals,
    },
    reason: buildResolvedReason(input.token_kind, input.decimals, assigned),
  };
}

function findListedRow(tokenAddress: string, rows: PriceReferenceRow[]): Pick<PriceReferenceRow, 'identifier' | 'name' | 'decimals'> | null {
  const normalized = normalizeEvmAddress(tokenAddress);
  const row = rows.find((r) => normalizeEvmAddress(r.identifier) === normalized);
  if (!row) {
    return null;
  }
  return { identifier: row.identifier, name: row.name, decimals: row.decimals };
}

export function pickPriceReference(rows: PriceReferenceRow[], tokenKind: TokenKind, decimals: TokenDecimals): PriceReferenceRow | null {
  const matchingDecimals = rows.filter((r) => r.decimals === decimals);
  if (matchingDecimals.length === 0) {
    return null;
  }

  const preferredNames =
    tokenKind === 'stablecoin'
      ? decimals === 18
        ? STABLECOIN_18_PREFERRED_NAMES
        : STABLECOIN_6_PREFERRED_NAMES
      : decimals === 18
        ? VARIABLE_18_PREFERRED_NAMES
        : STABLECOIN_6_PREFERRED_NAMES;

  for (const name of preferredNames) {
    const hit = matchingDecimals.find((r) => nameMatches(r.name, name));
    if (hit) {
      return hit;
    }
  }

  return matchingDecimals[0] ?? null;
}

function nameMatches(currencyName: string, preferred: string): boolean {
  const n = currencyName.trim().toUpperCase();
  const p = preferred.toUpperCase();
  return n === p || n.startsWith(`${p} `) || n.startsWith(p);
}

function buildResolvedReason(tokenKind: TokenKind, decimals: TokenDecimals, assigned: PriceReferenceRow): string {
  return (
    `Assigned ${assigned.name} (${assigned.identifier}) as volume_currency_expression: ` +
    `${tokenKind} with ${decimals} decimals → use a listed reference with matching decimals ` +
    `(e.g. 18-decimal stablecoin on Ethereum → DAI). Put this address in context.volume_currency_expression, not the held token address.`
  );
}
