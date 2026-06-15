/**
 * Canonical tiered audience boost playbook for MCP agents.
 * Wire format matches fuul-webapp encode.ts (buildTieredIncentiveAmounts) and
 * fuul-server PayoutGroupDto / TieredPayoutTermAmountsValidator.
 */

export const TIERED_AUDIENCE_BOOST_SOURCES = {
  webapp_encode: 'fuul-webapp src/modules/conversions/infra/encode.ts — buildTieredIncentiveAmounts',
  server_payout_group_dto: 'fuul-server src/payouts/payout-terms/dto/payout-group.dto.ts',
  server_payout_validators: 'fuul-server src/payouts/payout-terms/payout-term-amounts.validator.ts',
  server_tiers_api: 'fuul-server POST /api/v1/projects/:projectId/tiers (CreateProjectTierDto)',
  server_audiences_api: 'fuul-server GET /api/v1/projects/:projectId/audiences',
} as const;

export const TIERED_AUDIENCE_BOOST_LAYERS = [
  {
    layer: 'audience',
    role: 'User segment (conditions only). Does not set payout rates.',
    key_fields: ['id', 'name', 'conditions', 'condition_match_mode'],
    mcp_tool: 'list_audiences',
  },
  {
    layer: 'project_tier',
    role: 'Ranked project entity linking one audience (optional) to a priority. Rank 1 = highest; on multi-match, highest rank wins.',
    key_fields: ['id', 'name', 'slug', 'rank', 'audience_id'],
    mcp_tools: ['list_project_tiers', 'create_project_tier', 'update_project_tier'],
  },
  {
    layer: 'payout_group',
    role: 'One reward row inside a payout term when tier_type is set. References a tier, not an audience directly.',
    key_fields: [
      'project_tier_id',
      'end_user_amount_percentage',
      'affiliate_amount_percentage',
      'payout_cap_enabled',
      'wallet_cap_enabled',
      'enduser_cap_enabled',
      'dynamic_referral_cap_enabled',
    ],
    mcp_tools: ['create_incentive', 'update_payout_term'],
  },
] as const;

export const TIERED_AUDIENCE_BOOST_WORKFLOW_STEPS = [
  {
    step: 1,
    action: 'Resolve audience UUIDs for each segment that should get a boost.',
    mcp_tool: 'list_audiences',
    notes: 'Audiences are read-only lists; create them in the dashboard if missing.',
  },
  {
    step: 2,
    action: 'Ensure a project tier exists per boosted audience (or reuse from list).',
    mcp_tool: 'create_project_tier or list_project_tiers',
    notes:
      'POST body: name, slug (kebab-case), rank, optional audience_id. Server accepts explicit ranks (gaps OK, no auto-resequence). ' +
      'Boost tier rank must be higher priority (lower rank number) than the Default Tier. Tiers apply live immediately.',
  },
  {
    step: 3,
    action: 'Build or patch the payout term with tier_type and payout_groups[].',
    mcp_tool: 'create_incentive or update_payout_term',
    notes:
      'Set tier_type "audience". Amounts live in payout_groups[] only — never referral_amount / referral_amount_percentage on the term. ' +
      'Default/base rate: one group with no project_tier_id (maps to Default Tier). ' +
      'Each boost: project_tier_id + end_user_amount_percentage (and affiliate_amount_percentage when payee_type is affiliate or both). ' +
      'Match existing base_currency on the incentive (e.g. "none" = % of volume, per-unit modes differ).',
  },
  {
    step: 4,
    action: 'Preview with dry_run: true; review normalized body and MCP hints.',
    mcp_tool: 'same write tool',
    notes:
      'Check response body (normalized wire), _warnings (e.g. audience_id without project_tier_id), _validation_errors (amounts), _amount_rounding. ' +
      'dry_run green does not replace dashboard readback.',
  },
  {
    step: 5,
    action: 'Execute with confirmed: true after user approval.',
    mcp_tool: 'same write tool',
    notes: 'Response includes _publish_metadata_reminder for draft incentive metadata.',
  },
  {
    step: 6,
    action: 'Read back and verify tier wiring on the saved term.',
    mcp_tool: 'get_incentive',
    notes:
      'Each payout_groups[] row should have project_tier populated (not null) with expected amounts. ' +
      'Follow _readback_reminder on tiered writes. Publish project metadata from the dashboard when ready.',
  },
] as const;

export const TIERED_AUDIENCE_BOOST_WIRE_FORMAT = {
  payout_term_when_tiered: {
    tier_type: '"audience" (audience-based tiers; webapp PayoutTermTierType.Audience)',
    scheme: 'pay-per-attribution',
    calculation_strategy: 'variable | fixed (amounts still in payout_groups[])',
    forbidden_on_term: [
      'referral_amount',
      'referrer_amount',
      'referral_amount_percentage',
      'referrer_amount_percentage',
      'referrer2_amount',
      'referrer3_amount',
      'referrer4_amount',
    ],
  },
  payout_group: {
    project_tier_id:
      'UUID of project tier, or omit/null on default group — same as webapp projectTierId. Do NOT use audience_id on the group when the project uses ranked tiers.',
    amounts_variable: 'end_user_amount_percentage, affiliate_amount_percentage (0–1 for % of volume when base_currency is "none")',
    amounts_fixed: 'end_user_amount, affiliate_amount (string integers, wei for onchain-currency)',
    required_cap_booleans: ['payout_cap_enabled', 'wallet_cap_enabled', 'enduser_cap_enabled'],
    optional_cap_boolean: 'dynamic_referral_cap_enabled (defaults false)',
    webapp_defaults: 'All cap booleans default false in encode.ts; MCP injects the same when omitted.',
  },
} as const;

export const TIERED_AUDIENCE_BOOST_GOTCHAS = [
  'Using audience_id on payout_groups[] skips the ranked Tiers system — dashboard shows "Select tier… (empty)"; use project_tier_id.',
  'No multiplier field — precompute boosted percentages (e.g. base 0.3 × 1.5 → 0.45).',
  'Term-level amount fields are rejected when tier_type is set (server TieredPayoutTermAmountsValidator).',
  'create_project_tier / tier rank changes are live; incentive payout term edits are draft until dashboard publish.',
  'Preserve base_currency from the existing incentive when patching — "usd" is per-unit, "none" is % of volume.',
  'dry_run success does not guarantee valid tier wiring — always get_incentive readback (_readback_reminder).',
  'If multiple audiences can overlap on one user, assign ranks so the highest boost has the lowest rank number (highest priority).',
  'Large projects: set FUUL_MCP_WRITE_TIMEOUT_MS (default 120000); metadata refresh before writes is cached 30s.',
] as const;

/** Full playbook returned by list_payout_schemas → create_incentive_payload_guide.tiered_audience_boost_playbook */
export const TIERED_AUDIENCE_BOOST_PLAYBOOK = {
  summary:
    'Give audience-specific payout boosts by wiring project tiers (audience → tier) then payout_groups[] with project_tier_id. ' +
    'Same model as the Fuul dashboard Tiers page and webapp encode.ts.',
  sources: TIERED_AUDIENCE_BOOST_SOURCES,
  layers: TIERED_AUDIENCE_BOOST_LAYERS,
  workflow_steps: TIERED_AUDIENCE_BOOST_WORKFLOW_STEPS,
  wire_format: TIERED_AUDIENCE_BOOST_WIRE_FORMAT,
  gotchas: TIERED_AUDIENCE_BOOST_GOTCHAS,
  dry_run_response_fields: ['body', '_warnings', '_validation_errors', '_amount_rounding', '_draft_id_resolution'],
  after_confirmed_fields: ['_publish_metadata_reminder', '_readback_reminder'],
} as const;

/** Short hint appended to create_incentive / update_payout_term tool descriptions. */
export const TIERED_AUDIENCE_BOOST_TOOL_HINT =
  'Tiered audience boost: call list_payout_schemas for tiered_audience_boost_playbook (canonical workflow). ' +
  'Use project_tier_id on payout_groups (not audience_id). dry_run → review body, _warnings, _validation_errors; confirmed → get_incentive readback.';
