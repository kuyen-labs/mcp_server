/**
 * Maps webapp reward types to POST /incentives body (CreateIncentiveDto + payout_terms[]).
 * Aligned with fuul-webapp conversions/infra/encode.ts (mapToIncentiveTypeMapper).
 */

import { POOL_PAYOUT_PLAYBOOK } from './pool-payout-guide.js';
import { TIERED_AUDIENCE_BOOST_PLAYBOOK } from './tiered-audience-boost-guide.js';

export type IncentiveRewardTypeId = 'fixed-reward' | 'variable-reward' | 'proportional-pool' | 'leaderboard' | 'tiered-audience-boost';

export const CREATE_INCENTIVE_GLOBAL_GUIDE = {
  endpoint: 'POST /api/v1/projects/:projectId/incentives',
  body_shape: {
    name: 'string (incentive / conversion name)',
    trigger_ids: 'uuid[] (draft_trigger_id from create_trigger or get_project; min 1)',
    payout_terms: 'array of PayoutTermDto objects (min 1); one term per reward configuration',
  },
  reward_types: {
    'fixed-reward': {
      webapp_mapper: 'mapToFixedIncentiveDTO',
      scheme: 'pay-per-attribution',
      calculation_strategy: 'fixed',
      notes:
        'Use referral_amount / referrer_amount (wei strings for onchain-currency, plain strings for point). ' +
        'type "point" uses payout_currency_address 0x0..0 and chain_id 0.',
    },
    'variable-reward': {
      webapp_mapper: 'mapToVariableIncentiveDTO',
      scheme: 'pay-per-attribution',
      calculation_strategy: 'variable',
      notes:
        'Use referrer_amount_percentage / referral_amount_percentage (0–1 for % of revenue, or unit amounts when base_currency is not "none"). ' +
        'Requires trigger_amount_source (e.g. "volume"). base_currency "none" = % of revenue mode.',
    },
    'proportional-pool': {
      webapp_mapper: 'mapToPoolIncentiveDTO',
      scheme: 'pool',
      notes:
        'Requires amount_source, pool_amount (fixed per cycle), pool_duration (hours), pool_calculation_day_cron (e.g. "*" for daily). ' +
        'Optional pool_start_date, pool_end_date, pool_distribution_mode ("linear" | "square_root"). ' +
        'Full mechanics and unsupported capabilities: create_incentive_payload_guide.pool_payout_playbook.',
      unsupported_capabilities_summary: [
        'No dynamic/volume-banded pool sizing',
        'pool_amount does not scale with network volume',
        'payee_type "both" not supported',
      ],
    },
    leaderboard: {
      webapp_mapper: 'mapToLeaderboardIncentiveDTO',
      scheme: 'rank',
      notes:
        'Requires rank_scheme_config.ranks (position -> { prizeAmount }), amount_source, pool_amount (total), ' +
        'pool_duration, pool_calculation_day_cron, pool_start_date, pool_end_date.',
    },
    'tiered-audience-boost': {
      webapp_mapper: 'mapToVariableIncentiveDTO + buildTieredIncentiveAmounts',
      scheme: 'pay-per-attribution',
      calculation_strategy: 'variable',
      notes:
        'Set tier_type "audience". Amounts only in payout_groups[] (project_tier_id, not audience_id). ' +
        'Full workflow, wire format, and gotchas: create_incentive_payload_guide.tiered_audience_boost_playbook (same as list_payout_schemas).',
    },
  },
  workflow: [
    'Call list_payout_schemas (enriched with reward_types and create_payload_example).',
    'Create or pick draft triggers (create_trigger); collect draft_trigger_id values.',
    'Build payout_terms[] for the chosen reward type; create_incentive with dry_run then confirmed.',
  ],
  mcp_normalization:
    'create_incentive runs preparePayoutTermBodyForWrite on each payout term (point fixed/pool/rank: rounds decimal amounts to integers; variable: maps referral_amount aliases to *_percentage; tiered: maps group aliases, strips term-level amounts, injects cap booleans, surfaces _validation_errors and _warnings).',
  tiered_audience_boost_playbook: TIERED_AUDIENCE_BOOST_PLAYBOOK,
  pool_payout_playbook: POOL_PAYOUT_PLAYBOOK,
  reference: TIERED_AUDIENCE_BOOST_PLAYBOOK.sources.webapp_encode,
} as const;

/** Minimal create_incentive examples; replace TRIGGER_UUID. */
export const CREATE_INCENTIVE_EXAMPLES: Record<IncentiveRewardTypeId, { description: string; payload: Record<string, unknown> }> = {
  'fixed-reward': {
    description: 'Fixed points to affiliate per attribution',
    payload: {
      name: 'MCP fixed points incentive',
      trigger_ids: ['<TRIGGER_UUID>'],
      payout_terms: [
        {
          scheme: 'pay-per-attribution',
          type: 'point',
          calculation_strategy: 'fixed',
          payee_type: 'affiliate',
          require_affiliate: true,
          require_approval: false,
          referral_amount: '0',
          referrer_amount: '10',
        },
      ],
    },
  },
  'variable-reward': {
    description: 'Variable % of volume to affiliate',
    payload: {
      name: 'MCP variable incentive',
      trigger_ids: ['<TRIGGER_UUID>'],
      payout_terms: [
        {
          scheme: 'pay-per-attribution',
          type: 'point',
          calculation_strategy: 'variable',
          payee_type: 'affiliate',
          require_affiliate: true,
          require_approval: false,
          trigger_amount_source: 'volume',
          base_currency: 'none',
          referrer_amount_percentage: 0.1,
          referral_amount_percentage: 0,
        },
      ],
    },
  },
  'proportional-pool': {
    description: 'Proportional pool distributed by volume',
    payload: {
      name: 'MCP pool incentive',
      trigger_ids: ['<TRIGGER_UUID>'],
      payout_terms: [
        {
          scheme: 'pool',
          type: 'point',
          payee_type: 'affiliate',
          require_affiliate: true,
          require_approval: false,
          amount_source: 'volume',
          pool_amount: '1000',
          pool_duration: 168,
          pool_calculation_day_cron: '*',
          pool_distribution_mode: 'linear',
        },
      ],
    },
  },
  'tiered-audience-boost': {
    description: 'Variable % of volume with tier-based audience boosts via project tiers',
    payload: {
      name: 'MCP tiered audience boost',
      trigger_ids: ['<TRIGGER_UUID>'],
      payout_terms: [
        {
          scheme: 'pay-per-attribution',
          type: 'point',
          calculation_strategy: 'variable',
          payee_type: 'end-user',
          require_affiliate: false,
          require_approval: false,
          trigger_amount_source: 'volume',
          base_currency: 'none',
          tier_type: 'audience',
          payout_groups: [
            {
              end_user_amount_percentage: 0.3,
              payout_cap_enabled: false,
              wallet_cap_enabled: false,
              enduser_cap_enabled: false,
            },
            {
              project_tier_id: '<TIER_UUID>',
              end_user_amount_percentage: 0.45,
              payout_cap_enabled: false,
              wallet_cap_enabled: false,
              enduser_cap_enabled: false,
            },
          ],
        },
      ],
    },
  },
  leaderboard: {
    description: 'Rank leaderboard with prizes for top positions',
    payload: {
      name: 'MCP leaderboard incentive',
      trigger_ids: ['<TRIGGER_UUID>'],
      payout_terms: [
        {
          scheme: 'rank',
          type: 'point',
          payee_type: 'affiliate',
          require_affiliate: true,
          require_approval: false,
          amount_source: 'volume',
          pool_amount: '100',
          rank_scheme_config: {
            ranks: {
              '1': { prizeAmount: '60' },
              '2': { prizeAmount: '40' },
            },
          },
          pool_duration: 168,
          pool_calculation_day_cron: '1',
          pool_start_date: '2026-05-29T00:00:00.000Z',
          pool_end_date: '2026-06-05T00:00:00.000Z',
        },
      ],
    },
  },
};

export function enrichPayoutSchemasResponse(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') {
    return raw;
  }

  const payload = raw as Record<string, unknown>;
  const reward_types = (Object.keys(CREATE_INCENTIVE_EXAMPLES) as IncentiveRewardTypeId[]).map((id) => ({
    id,
    ...CREATE_INCENTIVE_GLOBAL_GUIDE.reward_types[id],
    create_payload_example: CREATE_INCENTIVE_EXAMPLES[id].payload,
    example_description: CREATE_INCENTIVE_EXAMPLES[id].description,
  }));

  return {
    ...payload,
    create_incentive_payload_guide: CREATE_INCENTIVE_GLOBAL_GUIDE,
    reward_types,
  };
}
