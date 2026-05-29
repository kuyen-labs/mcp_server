/**
 * Maps list_trigger_types `id` values to POST /triggers body shape.
 * Aligned with fuul-webapp `encodeByTriggerType` / `encode.ts` and fuul-server
 * `CreateTriggerCommand.parseTriggerContext`.
 */

export type CreatePayloadLayout = 'flat_dto' | 'context_only' | 'context_and_root_fields';

/** Server copies the whole DTO into stored context (fields must be at trigger root, not only in context). */
const FLAT_DTO_TRIGGER_TYPES = new Set<string>(['custom', 'classic']);

/** Preset types: type-specific fields live only under trigger.context (no root identifier fields). */
const CONTEXT_ONLY_TRIGGER_TYPES = new Set<string>(['token-holder', 'liquidity-pool-v2']);

export const CREATE_TRIGGER_GLOBAL_GUIDE = {
  endpoint: 'POST /api/v1/projects/:projectId/triggers',
  always_required: ['name', 'description', 'type'],
  type_field: 'Set trigger.type to the trigger_types[].id from list_trigger_types (e.g. "token-holder", "custom", "hibachi-trading").',
  layouts: {
    flat_dto: {
      applies_to: [...FLAT_DTO_TRIGGER_TYPES],
      rule:
        'Put every field from context_json_schema on the trigger object ROOT (siblings of name, description, type). ' +
        'Do NOT nest signature, event_type, or expressions only inside trigger.context — the API validates them at the root. ' +
        'The server persists them as trigger context internally.',
    },
    context_only: {
      applies_to: [...CONTEXT_ONLY_TRIGGER_TYPES],
      rule: 'Put type-specific fields under trigger.context only. Required: name, description, type, and context per context_json_schema.',
    },
    context_and_root_fields: {
      applies_to: 'All other trigger type ids (protocol presets, liquidity v3, social, trading, etc.).',
      rule:
        'Put type-specific fields under trigger.context per context_json_schema. ' +
        'Also set end_user_identifier_property (and end_user_identifier_expression when needed) at the trigger ROOT when the schema or webapp form requires it.',
    },
  },
  workflow: [
    'Call list_trigger_types and read create_payload_layout + create_payload_example for the chosen id.',
    'Call list_chains when the trigger needs chain_id.',
    'Build trigger object; use create_trigger with dry_run then confirmed.',
  ],
  reference: 'fuul-webapp src/modules/triggers/infra/encode.ts (encodeByTriggerType)',
} as const;

/** Minimal create_trigger.trigger examples (dashboard-aligned). */
export const CREATE_PAYLOAD_EXAMPLES: Partial<Record<string, Record<string, unknown>>> = {
  'token-holder': {
    name: 'Hold TOKEN',
    description: 'Daily holding of TOKEN on Ethereum',
    type: 'token-holder',
    context: {
      token_address: '0x0000000000000000000000000000000000000000',
      chain_id: 1,
      volume_currency_expression: '0x0000000000000000000000000000000000000000',
    },
  },
  custom: {
    name: 'My off-chain event',
    description: 'Tracks a custom SDK / off-chain event',
    type: 'custom',
    signature: 'my_event_name',
    event_type: 'off-chain-event',
    end_user_identifier_property: 'address',
    payable: true,
    volume_expression: 'extractedValueAmount',
    revenue_expression: 'extractedRevenueAmount',
    currency_expression: 'extractedVolumeCurrencyAddress',
    volume_currency_expression: 'extractedVolumeCurrencyAddress',
    revenue_currency_expression: 'extractedRevenueCurrencyAddress',
  },
  'hibachi-trading': {
    name: 'Hibachi Trades',
    description: 'Trades from Hibachi platform',
    type: 'hibachi-trading',
    context: { chainId: 8453 },
    end_user_identifier_property: 'address',
    end_user_identifier_expression: null,
  },
  'hibachi-affiliate-referred-fees': {
    name: 'Hibachi Affiliates - Base - Level1',
    description: 'Hibachi affiliate referred fees',
    type: 'hibachi-affiliate-referred-fees',
    context: { chainId: 8453, referredFeesLevel: 'level1' },
    end_user_identifier_property: 'address',
    end_user_identifier_expression: null,
  },
  'follow-on-x': {
    name: 'Follow @handle on X',
    description: 'Follow on X',
    type: 'follow-on-x',
    context: { usernameToFollow: 'handle' },
    end_user_identifier_property: 'twitter_username',
    end_user_identifier_expression: null,
  },
  'liquidity-pool-v2': {
    name: 'Hold TOKEN - Ethereum',
    description: 'Daily holding on Ethereum',
    type: 'liquidity-pool-v2',
    context: {
      token_address: '0x0000000000000000000000000000000000000000',
      chain_id: 1,
      volume_currency_expression: '0x0000000000000000000000000000000000000000',
    },
  },
  'uniswap-liquidity-v3': {
    name: 'Uniswap WETH-USDC',
    description: 'Deposit into WETH-USDC pool on Uniswap',
    type: 'uniswap-liquidity-v3',
    context: {
      liquidityPoolId: '<pool-uuid>',
      strategy: 'ActiveLiquidity',
      activeLiquidityArgs: { tokenDenominator: 'token0' },
    },
    end_user_identifier_property: 'address',
    end_user_identifier_expression: null,
  },
  'solana-token-holder': {
    name: 'Hold TOKEN - Solana',
    description: 'Daily holding of Solana token',
    type: 'solana-token-holder',
    context: {
      token_address: '<mint-address>',
      volume_currency_expression: '<optional-mint-or-price-ref>',
      chain_identifier: '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    },
    end_user_identifier_property: 'address',
    end_user_identifier_expression: null,
  },
};

export function getCreatePayloadLayout(triggerTypeId: string): CreatePayloadLayout {
  if (FLAT_DTO_TRIGGER_TYPES.has(triggerTypeId)) {
    return 'flat_dto';
  }
  if (CONTEXT_ONLY_TRIGGER_TYPES.has(triggerTypeId)) {
    return 'context_only';
  }
  return 'context_and_root_fields';
}

export function getCreatePayloadNotes(layout: CreatePayloadLayout): string {
  switch (layout) {
    case 'flat_dto':
      return CREATE_TRIGGER_GLOBAL_GUIDE.layouts.flat_dto.rule;
    case 'context_only':
      return CREATE_TRIGGER_GLOBAL_GUIDE.layouts.context_only.rule;
    case 'context_and_root_fields':
      return CREATE_TRIGGER_GLOBAL_GUIDE.layouts.context_and_root_fields.rule;
  }
}

type TriggerTypeRow = Record<string, unknown> & { id?: string };

export function enrichTriggerTypesResponse(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') {
    return raw;
  }

  const payload = raw as { trigger_types?: unknown };
  if (!Array.isArray(payload.trigger_types)) {
    return raw;
  }

  const trigger_types = payload.trigger_types.map((row) => {
    if (!row || typeof row !== 'object') {
      return row;
    }
    const typed = row as TriggerTypeRow;
    const id = typeof typed.id === 'string' ? typed.id : '';
    const layout = id ? getCreatePayloadLayout(id) : 'context_and_root_fields';
    const example = id ? CREATE_PAYLOAD_EXAMPLES[id] : undefined;

    return {
      ...typed,
      create_payload_layout: layout,
      create_payload_notes: getCreatePayloadNotes(layout),
      ...(example ? { create_payload_example: example } : {}),
    };
  });

  return {
    ...payload,
    create_trigger_payload_guide: CREATE_TRIGGER_GLOBAL_GUIDE,
    trigger_types,
  };
}
