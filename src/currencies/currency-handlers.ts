import type { FuulApiClient } from '../http/fuul-api-client.js';
import type { ListPriceReferencesInput, ResolveTokenHolderPriceReferenceInput } from '../tools/tool-schemas.js';
import { TOKEN_HOLDER_PRICE_REFERENCE_GUIDE } from '../triggers/price-reference-guide.js';
import { chainIdentifierFromChainId, normalizeCurrencyChainIdentifier } from './currency-chain-identifier.js';
import { fetchPriceReferences } from './fetch-price-references.js';
import { resolveTokenHolderPriceReference } from './resolve-token-holder-price-reference.js';

const CURRENCIES_PATH = '/api/v1/currencies';

export async function runListPriceReferences(api: FuulApiClient, input: ListPriceReferencesInput): Promise<unknown> {
  const query: Record<string, unknown> = {
    price_reference: true,
    page: 1,
    page_size: 100,
  };

  if (input.chain_identifier != null && input.chain_identifier !== '') {
    query.chain_identifier = normalizeCurrencyChainIdentifier(input.chain_identifier);
  }

  const data = await api.getJson(CURRENCIES_PATH, { query });
  return enrichPriceReferencesResponse(data);
}

export async function runResolveTokenHolderPriceReference(api: FuulApiClient, input: ResolveTokenHolderPriceReferenceInput): Promise<unknown> {
  const chainIdentifier = resolveChainIdentifier(input);
  const priceReferences = await fetchPriceReferences(api, chainIdentifier);

  const result = resolveTokenHolderPriceReference(
    {
      token_address: input.token_address,
      chain_identifier: chainIdentifier,
      token_kind: input.token_kind,
      decimals: input.decimals,
    },
    priceReferences,
  );

  return {
    ...result,
    next_step:
      result.status === 'needs_user_input'
        ? 'Ask the user the questions_for_user, then call resolve_token_holder_price_reference again with token_kind and decimals before create_trigger.'
        : result.status === 'resolved' || result.status === 'listed_use_same_address'
          ? `Set trigger.context.volume_currency_expression to ${result.volume_currency_expression}, then create_trigger (dry_run then confirmed).`
          : 'Review matching_references_by_decimals or contact Fuul support.',
  };
}

function resolveChainIdentifier(input: ResolveTokenHolderPriceReferenceInput): string {
  if (input.chain_identifier != null && input.chain_identifier !== '') {
    return normalizeCurrencyChainIdentifier(input.chain_identifier);
  }
  if (input.chain_id != null) {
    return chainIdentifierFromChainId(input.chain_id);
  }
  throw new Error('Provide chain_identifier (e.g. "1" or "ethereum") or chain_id (e.g. 1).');
}

export function enrichPriceReferencesResponse(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') {
    return {
      results: [],
      token_holder_price_reference_guide: TOKEN_HOLDER_PRICE_REFERENCE_GUIDE,
    };
  }

  return {
    ...(raw as Record<string, unknown>),
    token_holder_price_reference_guide: TOKEN_HOLDER_PRICE_REFERENCE_GUIDE,
  };
}
