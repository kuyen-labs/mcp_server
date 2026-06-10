import { chainIdentifierFromChainId, normalizeCurrencyChainIdentifier } from '../currencies/currency-chain-identifier.js';
import { fetchPriceReferences } from '../currencies/fetch-price-references.js';
import type { FuulApiClient } from '../http/fuul-api-client.js';
import { isTokenListedAsPriceReference, normalizeEvmAddress, TOKEN_HOLDER_TYPES_WITH_PRICE_REF } from './price-reference-guide.js';

type TriggerBody = Record<string, unknown> & {
  type?: string;
  context?: Record<string, unknown>;
};

export async function assertTokenHolderPriceReferenceValid(api: FuulApiClient, trigger: TriggerBody): Promise<void> {
  const type = trigger.type;
  if (typeof type !== 'string' || !TOKEN_HOLDER_TYPES_WITH_PRICE_REF.has(type)) {
    return;
  }

  const context = trigger.context;
  if (!context || typeof context !== 'object') {
    return;
  }

  const tokenAddress = context.token_address;
  const volumeExpr = context.volume_currency_expression;
  if (typeof tokenAddress !== 'string' || typeof volumeExpr !== 'string') {
    return;
  }

  const chainIdentifier = resolveChainFromContext(context);
  if (!chainIdentifier) {
    return;
  }

  const priceReferences = await fetchPriceReferences(api, chainIdentifier);

  if (isTokenListedAsPriceReference(tokenAddress, priceReferences)) {
    if (normalizeEvmAddress(volumeExpr) !== normalizeEvmAddress(tokenAddress)) {
      throw new Error(
        'Token is a listed price reference; volume_currency_expression should match token_address. ' +
          `Got volume_currency_expression=${volumeExpr}, token_address=${tokenAddress}.`,
      );
    }
    return;
  }

  if (normalizeEvmAddress(volumeExpr) === normalizeEvmAddress(tokenAddress)) {
    throw new Error(
      'Token is not a listed price reference but volume_currency_expression equals token_address. ' +
        'Call resolve_token_holder_price_reference first: ask the user stablecoin vs variable-price and decimals (6/18), ' +
        'then set volume_currency_expression to the assigned reference (e.g. 18-decimal stablecoin on Ethereum → DAI 0x6b175474e89094c44da98b954eedeac495271d0f).',
    );
  }

  if (!isTokenListedAsPriceReference(volumeExpr, priceReferences)) {
    throw new Error(
      `volume_currency_expression (${volumeExpr}) is not a listed price reference on ${chainIdentifier}. ` +
        'Call resolve_token_holder_price_reference to pick a valid reference before create_trigger.',
    );
  }
}

function resolveChainFromContext(context: Record<string, unknown>): string | null {
  if (typeof context.chain_identifier === 'string' && context.chain_identifier !== '') {
    return normalizeCurrencyChainIdentifier(context.chain_identifier);
  }
  if (typeof context.chain_id === 'number') {
    return chainIdentifierFromChainId(context.chain_id);
  }
  return null;
}
