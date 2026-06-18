/**
 * Canonical proportional pool payout playbook for MCP agents.
 * Wire format matches fuul-webapp encode.ts (mapToPoolIncentiveDTO) and
 * fuul-server PayoutTermDto / pool calculation pipeline.
 */

export const POOL_PAYOUT_SOURCES = {
  webapp_encode: 'fuul-webapp src/modules/conversions/infra/encode.ts — mapToPoolIncentiveDTO',
  server_payout_term_dto: 'fuul-server src/payouts/payout-terms/dto/payout-term.dto.ts',
  server_pool_shares: 'fuul-server src/payouts/payout-pools/calculation/queries/create-payout-pool-shares.query.ts',
  server_pool_payout_strategy: 'fuul-server src/payouts/pipelines/creation/strategies/pool.payout-calculation-strategy.ts',
  server_pool_scheduler: 'fuul-server src/payouts/payout-pools/calculation/payout-pool-scheduler.ts',
} as const;

export const POOL_PAYOUT_MECHANICS = {
  summary:
    'Each cycle distributes a fixed pool_amount pro-rata by eligible volume/revenue share. ' +
    'pool_amount does NOT scale with total network volume — only each user relative share does.',
  cycle_window: 'UTC window [cycle_end - pool_duration hours, cycle_end); pool_duration is in hours (1–8760).',
  scheduling:
    'Cycles run when pool_calculation_day_cron matches (UTC weekday or "*" for any day), after pool_start_date, before pool_end_date, and elapsed time since start is a multiple of pool_duration.',
  distribution_steps: [
    'Sum eligible attribution volume or revenue per payee in the cycle window (amount_source: volume | revenue).',
    'Optional: multiply item amounts by audience-tier multipliers when tier_type is set on the term.',
    'Compute share: linear = user_total / pool_total; square_root = sqrt(user_total) / sum(sqrt(all)).',
    'Payout per user = pool_amount × share (points or onchain-currency per term type).',
  ],
  pool_amount_semantics:
    'Fixed budget per cycle — set explicitly via pool_amount. Changing pool_amount affects future cycles only; past payout_pools are historical.',
} as const;

export const POOL_PAYOUT_EDITABLE_FIELDS = [
  {
    field: 'pool_amount',
    type: 'numeric string (integer units / wei)',
    required: true,
    bounds: 'Positive integer string; point type amounts rounded to integer on MCP write.',
    notes: 'Fixed per-cycle budget — NOT derived from volume.',
  },
  {
    field: 'pool_duration',
    type: 'integer (hours)',
    required: true,
    bounds: '1–8760 (365 × 24)',
    notes: 'Length of each distribution cycle.',
  },
  {
    field: 'pool_calculation_day_cron',
    type: 'string',
    required: true,
    bounds: '"*" (any UTC day) or "0"–"6" (Sunday–Saturday UTC)',
    notes: 'When pool_start_date / pool_end_date are set, they must align with this weekday (except "*").',
  },
  {
    field: 'amount_source',
    type: 'enum',
    required: true,
    bounds: 'volume | revenue (attribution-count is not supported in pool runtime)',
    notes: 'Determines which attribution metric drives pro-rata shares.',
  },
  {
    field: 'pool_distribution_mode',
    type: 'enum',
    required: false,
    bounds: 'linear (default) | square_root',
    notes: 'square_root softens whale dominance; still uses fixed pool_amount — not dynamic sizing.',
  },
  {
    field: 'pool_start_date',
    type: 'ISO8601 date',
    required: 'practically required for scheduler',
    bounds: 'Must match pool_calculation_day_cron weekday when cron is not "*"',
    notes: 'Anchor for first cycle.',
  },
  {
    field: 'pool_end_date',
    type: 'ISO8601 date',
    required: false,
    bounds: 'Must be pool_start_date + N × pool_duration hours',
    notes: 'Optional campaign end.',
  },
  {
    field: 'payee_type',
    type: 'enum',
    required: true,
    bounds: 'affiliate | end-user (both is NOT supported for pool)',
    notes: 'Single payee role per pool term.',
  },
  {
    field: 'type',
    type: 'enum',
    required: true,
    bounds: 'point | onchain-currency',
    notes: 'Reward currency for distributed payouts.',
  },
  {
    field: 'payout_condition_expression',
    type: 'simple expression',
    required: false,
    bounds: '{totalVolume|totalRevenue}AmountUSD >=|>|< number',
    notes: 'Eligibility threshold when creating pool items — not complex AND/OR.',
  },
  {
    field: 'require_affiliate',
    type: 'boolean',
    required: false,
    bounds: 'true | false',
    notes: 'Standard payout term flag.',
  },
  {
    field: 'require_approval',
    type: 'boolean',
    required: false,
    bounds: 'true | false',
    notes: 'Standard payout term flag.',
  },
] as const;

export const POOL_PAYOUT_UNSUPPORTED = [
  'Dynamic / volume-banded pool sizing — pool_amount cannot be a formula of network volume or conditional on volume tiers.',
  'Pool budget that auto-scales with total cycle volume (only relative shares scale, not pool_amount).',
  'Volume bands with different payout percentages per band (use tiered audience boost on pay-per-attribution, or audience-tier multipliers on pool items — not banded pool budgets).',
  'payee_type "both" — pool pays affiliate OR end-user, not a split to both.',
  'amount_source "attribution-count" — enum exists on DTO but pool item SQL does not implement it.',
  'calculation_strategy fixed/variable with referrer_amount / *_percentage — pool uses scheme "pool", not pay-per-attribution amounts.',
  'Rank-based fixed prizes — that is scheme "rank" (leaderboard), not proportional pool.',
  'Multi-level referral payouts (L2–L4) on pool scheme.',
] as const;

export const POOL_PAYOUT_WORKFLOW_STEPS = [
  {
    step: 1,
    action: 'Load capability boundaries before analyzing or editing a pool incentive.',
    mcp_tool: 'list_payout_schemas or get_incentive',
    notes:
      'Read create_incentive_payload_guide.pool_payout_playbook (full rules) or _pool_capability_boundary on get_incentive when scheme is pool. ' +
      'Do not propose config outside editable_fields or listed in unsupported_capabilities.',
  },
  {
    step: 2,
    action: 'Inspect the current pool term.',
    mcp_tool: 'get_incentive',
    notes: 'payout_terms live on draft object. Note pool_amount, pool_duration, cron, amount_source, distribution_mode.',
  },
  {
    step: 3,
    action: 'If optimizing, stay within supported knobs only.',
    mcp_tool: 'analysis only or update_payout_term',
    notes:
      'Supported tweaks: change fixed pool_amount, cycle length (pool_duration), cron, dates, linear vs square_root, amount_source volume/revenue, eligibility expression. ' +
      'If the user asks for dynamic/volume-banded pools, explain unsupported_capabilities and offer supported alternatives — do NOT present unsupported changes as actionable PATCHes.',
  },
  {
    step: 4,
    action: 'Preview writes with dry_run: true.',
    mcp_tool: 'create_incentive or update_payout_term',
    notes: 'Review body, _warnings, _validation_errors, _amount_rounding.',
  },
  {
    step: 5,
    action: 'Execute with confirmed: true after user approval.',
    mcp_tool: 'same write tool',
    notes: 'Response includes _publish_metadata_reminder. Config changes affect future cycles.',
  },
  {
    step: 6,
    action: 'Read back saved term.',
    mcp_tool: 'get_incentive',
    notes: 'Verify pool fields; _pool_capability_boundary is attached again on read.',
  },
] as const;

export const POOL_PAYOUT_GOTCHAS = [
  'pool_duration is hours, not days — 168 = one week.',
  'pool_calculation_day_cron uses UTC weekdays; "*" fires every day.',
  'square_root distribution mode changes share curve — it is NOT dynamic pool sizing.',
  'Audience tier multipliers can weight volume before pro-rata — still with fixed pool_amount per cycle.',
  'dry_run success does not replace get_incentive readback before telling the user a change is live.',
  'Past payout_pools are immutable; editing the term only affects future cycles.',
] as const;

/** Compact summary attached to get_incentive when a pool scheme term is present. */
export const POOL_PAYOUT_CAPABILITY_SUMMARY = {
  pool_amount_is_fixed_per_cycle: true,
  distribution: 'pro_rata_by_volume_or_revenue_share_times_fixed_pool_amount',
  editable_fields_ref: 'list_payout_schemas → create_incentive_payload_guide.pool_payout_playbook.editable_fields',
  key_unsupported: 'No dynamic/volume-banded pool sizing — pool_amount is a fixed value each cycle, not conditional on volume.',
} as const;

/** Full playbook returned by list_payout_schemas → create_incentive_payload_guide.pool_payout_playbook */
export const POOL_PAYOUT_PLAYBOOK = {
  summary:
    'Proportional pool (scheme "pool"): fixed pool_amount distributed each cycle pro-rata by volume/revenue share. ' +
    'Same model as fuul-webapp mapToPoolIncentiveDTO and fuul-server pool calculation pipeline.',
  sources: POOL_PAYOUT_SOURCES,
  mechanics: POOL_PAYOUT_MECHANICS,
  editable_fields: POOL_PAYOUT_EDITABLE_FIELDS,
  unsupported_capabilities: POOL_PAYOUT_UNSUPPORTED,
  workflow_steps: POOL_PAYOUT_WORKFLOW_STEPS,
  gotchas: POOL_PAYOUT_GOTCHAS,
  capability_summary: POOL_PAYOUT_CAPABILITY_SUMMARY,
  dry_run_response_fields: ['body', '_warnings', '_validation_errors', '_amount_rounding', '_draft_id_resolution'],
  after_confirmed_fields: ['_publish_metadata_reminder'],
} as const;

/** Short hint appended to pool-related tool descriptions. */
export const POOL_PAYOUT_TOOL_HINT =
  'Proportional pool: call list_payout_schemas for pool_payout_playbook. pool_amount is FIXED per cycle (not volume-driven). ' +
  'get_incentive includes _pool_capability_boundary when scheme is pool. Do not propose dynamic/volume-banded pools — see unsupported_capabilities.';
