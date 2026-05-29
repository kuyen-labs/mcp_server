import { z } from 'zod';

import { writeConfirmationFieldsSchema } from '../agent/write-confirmation.js';

const uuid = z.string().uuid();

export const listProjectsInputSchema = z.object({
  page: z.coerce.number().int().positive().optional().describe('1-based page index; sent as ?page='),
  query: z.string().optional().describe('Search string; sent as ?query='),
});

export const projectIdParamSchema = z.object({
  project_id: uuid.describe('Project UUID'),
});

export const getIncentiveInputSchema = z.object({
  project_id: uuid,
  conversion_id: uuid.describe('Incentive (conversion) UUID'),
});

export const getTriggerInputSchema = z.object({
  project_id: uuid,
  trigger_id: uuid.describe('Trigger UUID'),
});

export const payoutTermSchema = z.record(z.string(), z.unknown());

/** Body must match server PayoutTermDto (see fuul-server payouts/payout-terms/dto/payout-term.dto). */
export const updatePayoutTermInputSchema = writeConfirmationFieldsSchema.extend({
  project_id: uuid,
  conversion_id: uuid.describe('Incentive (conversion) UUID'),
  payout_term_id: uuid,
  payout_term: payoutTermSchema.describe('Full payout term payload as returned by get_incentive / GET payout_term, with edits applied.'),
});

export type UpdatePayoutTermInput = z.infer<typeof updatePayoutTermInputSchema>;

/** Registered on MCP tools; use {@link updateProjectTierInputSchema} in handlers for full validation. */
export const updateProjectTierFieldsSchema = writeConfirmationFieldsSchema.extend({
  project_id: uuid,
  tier_id: uuid,
  name: z.string().min(1).max(100).optional(),
  description: z.union([z.string().min(1).max(500), z.null()]).optional(),
  rank: z.coerce.number().int().min(1).optional(),
  audience_id: z.string().uuid().nullable().optional(),
});

export const updateProjectTierInputSchema = updateProjectTierFieldsSchema.refine(
  (v) => v.name != null || v.description !== undefined || v.rank != null || v.audience_id !== undefined,
  { message: 'Provide at least one of: name, description, rank, audience_id' },
);

export type UpdateProjectTierInput = z.infer<typeof updateProjectTierInputSchema>;

const audienceConditionSchema = z.object({
  signature: z.string(),
  parameters: z.record(z.string(), z.unknown()),
});

/** Registered on MCP tools; use {@link updateAudienceInputSchema} in handlers. */
export const updateAudienceFieldsSchema = writeConfirmationFieldsSchema.extend({
  project_id: uuid,
  audience_id: uuid,
  name: z.string().min(1),
  conditions: z.array(audienceConditionSchema).optional(),
  condition_match_mode: z.enum(['any', 'all']).optional().describe('Required when conditions is non-empty.'),
  contractId: z.string().optional(),
});

export const updateAudienceInputSchema = updateAudienceFieldsSchema.refine(
  (v) => !v.conditions || v.conditions.length === 0 || (v.condition_match_mode != null && v.condition_match_mode.length > 0),
  { message: 'condition_match_mode is required when conditions is non-empty' },
);

export type UpdateAudienceInput = z.infer<typeof updateAudienceInputSchema>;

/** Registered on MCP tools; use {@link updateTriggerInputSchema} in handlers. */
export const updateTriggerFieldsSchema = writeConfirmationFieldsSchema.extend({
  project_id: uuid,
  trigger_id: uuid,
  name: z.string().optional(),
  description: z.string().optional(),
  event_type: z.string().optional(),
  condition_expression: z.string().optional(),
  amount_expression: z.string().optional(),
  volume_expression: z.string().optional(),
  revenue_expression: z.string().optional(),
  currency_expression: z.string().optional(),
  volume_currency_expression: z.string().optional(),
  revenue_currency_expression: z.string().optional(),
  end_user_identifier_property: z.string().optional(),
  end_user_identifier_expression: z.string().optional(),
  payable: z.boolean().optional(),
  ref: z.string().optional(),
  contract_ids: z.array(uuid).length(1).optional().describe('Exactly one contract UUID when updating on-chain contract event triggers.'),
});

export const updateTriggerInputSchema = updateTriggerFieldsSchema.refine(
  (v) =>
    v.name !== undefined ||
    v.description !== undefined ||
    v.event_type !== undefined ||
    v.condition_expression !== undefined ||
    v.amount_expression !== undefined ||
    v.volume_expression !== undefined ||
    v.revenue_expression !== undefined ||
    v.currency_expression !== undefined ||
    v.volume_currency_expression !== undefined ||
    v.revenue_currency_expression !== undefined ||
    v.end_user_identifier_property !== undefined ||
    v.end_user_identifier_expression !== undefined ||
    v.payable !== undefined ||
    v.ref !== undefined ||
    v.contract_ids !== undefined,
  { message: 'Provide at least one trigger field to patch (e.g. name, description, event_type, expressions, contract_ids).' },
);

export type UpdateTriggerInput = z.infer<typeof updateTriggerInputSchema>;

/** POST body matches fuul-server CreateTriggerDto (same shape as fuul-webapp triggersService.create). */
export const createTriggerFieldsSchema = writeConfirmationFieldsSchema.extend({
  project_id: uuid,
  trigger: z
    .record(z.string(), z.unknown())
    .describe(
      'CreateTriggerDto body. Required: name, description, type (list_trigger_types[].id). ' +
        'Layout from list_trigger_types create_payload_layout: flat_dto (custom/classic) = schema fields at root; ' +
        'context_only (token-holder, liquidity-pool-v2) = fields in context; ' +
        'context_and_root_fields = fields in context + end_user_identifier_property at root. ' +
        'See create_payload_example on the matching trigger_types row.',
    ),
});

export const createTriggerInputSchema = createTriggerFieldsSchema.superRefine((v, ctx) => {
  const name = v.trigger.name;
  if (typeof name !== 'string' || name.trim().length === 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'trigger.name is required (non-empty string)', path: ['trigger', 'name'] });
  }
  const description = v.trigger.description;
  if (typeof description !== 'string' || description.trim().length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'trigger.description is required (non-empty string)',
      path: ['trigger', 'description'],
    });
  }
});

export type CreateTriggerInput = z.infer<typeof createTriggerInputSchema>;

export const deleteTriggerFieldsSchema = writeConfirmationFieldsSchema.extend({
  project_id: uuid,
  trigger_id: uuid.describe('Draft trigger UUID (draft_trigger_id from get_project or get_incentive triggers[]).'),
});

export const deleteTriggerInputSchema = deleteTriggerFieldsSchema;

export type DeleteTriggerInput = z.infer<typeof deleteTriggerInputSchema>;

export const createIncentiveFieldsSchema = writeConfirmationFieldsSchema.extend({
  project_id: uuid,
  name: z.string().min(1),
  trigger_ids: z.array(uuid).min(1).describe('Draft trigger UUIDs that activate this incentive.'),
  payout_terms: z
    .array(payoutTermSchema)
    .min(1)
    .describe(
      'PayoutTermDto[] (min 1). Use list_payout_schemas reward_types[].create_payload_example. ' +
        'Schemes: pay-per-attribution (fixed/variable), pool, rank. See create_incentive_payload_guide.',
    ),
});

export const createIncentiveInputSchema = createIncentiveFieldsSchema;

export type CreateIncentiveInput = z.infer<typeof createIncentiveInputSchema>;

export const deleteIncentiveFieldsSchema = writeConfirmationFieldsSchema.extend({
  project_id: uuid,
  conversion_id: uuid.describe('Draft incentive UUID (draft_conversion_id from list_incentives).'),
});

export const deleteIncentiveInputSchema = deleteIncentiveFieldsSchema;

export type DeleteIncentiveInput = z.infer<typeof deleteIncentiveInputSchema>;

export const listPayoutsPendingApprovalSchema = z.object({
  project_id: uuid,
  page: z.coerce.number().int().positive().optional().describe('Forwarded as ?page='),
  page_size: z.coerce.number().int().positive().max(100).optional().describe('Forwarded as ?page_size='),
});

export const listRewardsPayoutsSchema = z.object({
  project_id: uuid,
  page: z.coerce.number().int().positive().optional(),
  page_size: z.coerce.number().int().positive().max(100).optional(),
  status: z.string().optional(),
  from_date: z.string().optional(),
  to_date: z.string().optional(),
});

export const payoutBatchActionInputSchema = writeConfirmationFieldsSchema.extend({
  project_id: uuid,
  payout_ids: z.array(uuid).optional().describe('Mutually exclusive with from_date/to_date filters on server.'),
  from_date: z.string().optional(),
  to_date: z.string().optional(),
  user_address: z.string().optional(),
  affiliate_address: z.string().optional(),
});

export type PayoutBatchActionInput = z.infer<typeof payoutBatchActionInputSchema>;

const dateRangePresetSchema = z.enum(['7d', '30d', '90d', 'MTD', 'QTD', 'custom', 'all']);

/** GET .../affiliate-portal/stats — matches fuul-server GetAffiliateStatsDto query names. */
export const getAffiliatePortalStatsSchema = z.object({
  project_id: uuid,
  user_identifier: z.string().min(1).describe('Encoded identifier string (e.g. evm:0x..., solana:...).'),
  from: z.string().optional(),
  to: z.string().optional(),
  this_month: z.string().optional().describe('Use "true" for current month (mutually exclusive with from/to).'),
  conversion_external_id: z.coerce.number().int().min(0).optional(),
  conversion_name: z.string().optional(),
});

export type GetAffiliatePortalStatsInput = z.infer<typeof getAffiliatePortalStatsSchema>;

/** GET .../affiliate-portal/total-stats — matches GetTotalStatsDto. */
export const getProjectAffiliateTotalStatsSchema = z.object({
  project_id: uuid,
  statuses: z.array(z.string()).optional(),
  regions: z.array(z.string()).optional(),
  audiences: z.array(z.string()).optional(),
  tiers: z.array(z.string().uuid()).optional(),
  dateRange: dateRangePresetSchema.optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export type GetProjectAffiliateTotalStatsInput = z.infer<typeof getProjectAffiliateTotalStatsSchema>;

const breakdownGroupBySchema = z.enum(['audience', 'tier', 'region', 'status']);
const breakdownSortBySchema = z.enum(['totalReferralVolume', 'revenueFromReferrals', 'earnings', 'pointsPaid']);

/** GET .../affiliate-portal/global-breakdown — matches GetProjectAffiliatesBreakdownDto (groupBy required). */
export const getProjectAffiliatesBreakdownSchema = z.object({
  project_id: uuid,
  groupBy: breakdownGroupBySchema,
  dateRange: dateRangePresetSchema.optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sortBy: breakdownSortBySchema.optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  statuses: z.array(z.string()).optional(),
  regions: z.array(z.string()).optional(),
  audiences: z.array(z.string()).optional(),
  tiers: z.array(z.string().uuid()).optional(),
});

export type GetProjectAffiliatesBreakdownInput = z.infer<typeof getProjectAffiliatesBreakdownSchema>;

const identifierTypeForAffiliateSchema = z.enum(['evm_address', 'solana_address', 'sui_address', 'xrpl_address', 'email']);

/** Matches CreateOrUpdateUserReferrerDto / DeleteReferralQueryDto IdentifierType on fuul-server. */
export const identifierTypeForReferrerSchema = z.enum(['evm_address', 'solana_address', 'sui_address', 'xrpl_address', 'email', 'uuid']);

export const projectApiKeyBearerFieldsSchema = z.object({
  project_api_key: z
    .string()
    .min(1)
    .optional()
    .describe('Project API key used as Bearer for this request. Falls back to FUUL_MCP_PROJECT_API_KEY when omitted.'),
});

export const tierProtectionPublicBodySchema = z.object({
  tier_id: uuid,
  expires_at: z.string().optional(),
  protection_days: z.coerce.number().int().min(1).max(365).optional(),
});

function approveTiersRequireReviewer(val: { approve_project_tier_ids?: string[] | undefined; reviewed_by_user_id?: string | undefined }): boolean {
  const ids = val.approve_project_tier_ids;
  if (ids != null && ids.length > 0 && val.reviewed_by_user_id == null) {
    return false;
  }
  return true;
}

export const createProjectAffiliatePublicFieldsSchema = writeConfirmationFieldsSchema.merge(projectApiKeyBearerFieldsSchema).extend({
  user_identifier: z.string().min(1),
  user_identifier_type: identifierTypeForAffiliateSchema,
  alias: z.string().optional(),
  region: z.string().optional(),
  status: z.string().optional(),
  note: z.string().optional(),
  audiences: z.array(uuid).optional(),
  approve_project_tier_ids: z.array(uuid).optional(),
  reviewed_by_user_id: uuid.optional(),
  tier_protection: tierProtectionPublicBodySchema.optional(),
});

export const createProjectAffiliatePublicInputSchema = createProjectAffiliatePublicFieldsSchema
  .superRefine((val, ctx) => {
    if (!approveTiersRequireReviewer(val)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'reviewed_by_user_id is required when approve_project_tier_ids is non-empty',
        path: ['reviewed_by_user_id'],
      });
    }
  })
  .superRefine((val, ctx) => {
    const tp = val.tier_protection;
    if (tp == null) {
      return;
    }
    const hasExp = tp.expires_at != null && tp.expires_at !== '';
    const hasDays = tp.protection_days != null;
    if (hasExp === hasDays) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'tier_protection requires exactly one of expires_at or protection_days',
        path: ['tier_protection'],
      });
    }
  });

export type CreateProjectAffiliatePublicInput = z.infer<typeof createProjectAffiliatePublicInputSchema>;

export const updateProjectAffiliatePublicFieldsSchema = writeConfirmationFieldsSchema.merge(projectApiKeyBearerFieldsSchema).extend({
  project_affiliate_id: uuid.describe('Projects-affiliates row id (returned by create_project_affiliate_public or the dashboard).'),
  alias: z.string().optional(),
  region: z.string().optional(),
  status: z.string().optional(),
  note: z.string().optional(),
  audiences: z.array(uuid).optional(),
  approve_project_tier_ids: z.array(uuid).optional(),
  reviewed_by_user_id: uuid.optional(),
  tier_protection: z.union([tierProtectionPublicBodySchema, z.null()]).optional(),
});

export const updateProjectAffiliatePublicInputSchema = updateProjectAffiliatePublicFieldsSchema
  .superRefine((val, ctx) => {
    if (!approveTiersRequireReviewer(val)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'reviewed_by_user_id is required when approve_project_tier_ids is non-empty',
        path: ['reviewed_by_user_id'],
      });
    }
  })
  .superRefine((val, ctx) => {
    if (val.dry_run === true) {
      return;
    }
    const hasPatch =
      val.alias !== undefined ||
      val.region !== undefined ||
      val.status !== undefined ||
      val.note !== undefined ||
      val.audiences !== undefined ||
      val.approve_project_tier_ids !== undefined ||
      val.reviewed_by_user_id !== undefined ||
      val.tier_protection !== undefined;
    if (!hasPatch) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Provide at least one field to patch (e.g. alias, status, audiences, tier_protection, approve_project_tier_ids) or use dry_run: true.',
        path: [],
      });
    }
  })
  .superRefine((val, ctx) => {
    const tp = val.tier_protection;
    if (tp == null || tp === null) {
      return;
    }
    const hasExp = tp.expires_at != null && tp.expires_at !== '';
    const hasDays = tp.protection_days != null;
    if (hasExp === hasDays) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'tier_protection requires exactly one of expires_at or protection_days',
        path: ['tier_protection'],
      });
    }
  });

export const getProjectAffiliatePublicInputSchema = projectApiKeyBearerFieldsSchema.extend({
  project_affiliate_id: uuid,
});

export type GetProjectAffiliatePublicInput = z.infer<typeof getProjectAffiliatePublicInputSchema>;

const eventArgValueSchema = z.union([z.string(), z.number(), z.boolean()]);

/**
 * Currency specification for value/revenue in event args.
 * Two forms accepted:
 * 1. Official symbol: { name: "USDC" | "USD" | "POINT" | ... }
 * 2. Token identifier: { identifier, identifier_type, chain_identifier }
 */
const eventArgCurrencySchema = z
  .union([
    z.object({ name: z.string().describe('Official currency symbol (e.g. "USDC", "USD", "POINT").') }),
    z.object({
      identifier: z.string().describe('Token identifier (e.g. contract address or mint).'),
      identifier_type: z.string().describe('Type of identifier (e.g. "evm_contract", "solana_mint").'),
      chain_identifier: z.string().describe('Chain identifier (e.g. "evm:1", "solana:mainnet").'),
    }),
  ])
  .describe('Currency in one of two forms: (1) { name: "USDC"|"USD"|"POINT" }, (2) { identifier, identifier_type, chain_identifier }.');

/**
 * Value or revenue amount with currency.
 * amount is a string integer in the currency's smallest unit (e.g. wei for ETH, cents for fiat).
 * Decimals only allowed for fiat-type currencies (USD, etc.).
 */
const eventArgAmountSchema = z.object({
  amount: z.string().describe('Amount as string integer in smallest unit (e.g. "1000000" for 1 USDC with 6 decimals). Decimals only for fiat.'),
  currency: eventArgCurrencySchema,
});

/**
 * Event args supporting value and revenue for non-tracking events.
 * Additional arbitrary key-value pairs are allowed.
 */
const eventArgsSchema = z
  .object({
    value: eventArgAmountSchema.optional().describe('Transaction value (e.g. swap input amount, deposit amount).'),
    revenue: eventArgAmountSchema.optional().describe('Revenue generated (e.g. fees earned, commission).'),
  })
  .catchall(eventArgValueSchema)
  .describe(
    'Event metadata. For non-tracking events (swaps, deposits), include value and/or revenue as { amount: string, currency: {...} }. Additional custom fields allowed.',
  );

/** Single conversion event payload (Public API SendEventRequest). */
export const sendEventPayloadSchema = z.object({
  name: z.string().min(1).max(200).describe('Trigger/event name configured in the project.'),
  dedup_id: z.string().min(1).max(200).describe('Unique idempotency key; duplicates return HTTP 409 on single send.'),
  user_identifier: z.string().min(1).describe('User who performed the action.'),
  user_identifier_type: identifierTypeForAffiliateSchema,
  args: eventArgsSchema.optional().describe('Event metadata including optional value/revenue. See schema for structure.'),
  timestamp: z.coerce.number().int().nonnegative().optional().describe('Event time in ms since epoch; defaults to server time.'),
});

export type SendEventPayload = z.infer<typeof sendEventPayloadSchema>;

export const sendEventFieldsSchema = projectApiKeyBearerFieldsSchema.merge(writeConfirmationFieldsSchema).merge(sendEventPayloadSchema);

export const sendEventInputSchema = sendEventFieldsSchema;

export type SendEventInput = z.infer<typeof sendEventInputSchema>;

export const sendBatchEventsFieldsSchema = projectApiKeyBearerFieldsSchema.merge(writeConfirmationFieldsSchema).extend({
  events: z
    .array(sendEventPayloadSchema)
    .min(1)
    .max(100)
    .describe('Up to 100 events per request; atomic batch. Duplicate dedup_id values are silently skipped.'),
});

export const sendBatchEventsInputSchema = sendBatchEventsFieldsSchema;

export type SendBatchEventsInput = z.infer<typeof sendBatchEventsInputSchema>;

export const checkEventStatusFieldsSchema = projectApiKeyBearerFieldsSchema.extend({
  verbose: z.boolean().optional().describe('When true, returns full downstream pipeline (trigger executions, attributions, payouts, movements).'),
  user_identifier: z.string().min(1).optional(),
  user_identifier_type: identifierTypeForAffiliateSchema.optional(),
  event_name: z.string().min(1).optional().describe('Case-sensitive trigger name.'),
  event_id: z.string().uuid().optional().describe('Event UUID. Use with verbose instead of dedup_id + event_name.'),
  dedup_id: z.string().min(1).optional().describe('Dedup id from send_event. Required with event_name when verbose and event_id omitted.'),
});

export const checkEventStatusInputSchema = checkEventStatusFieldsSchema.superRefine((value, ctx) => {
  if (value.verbose === true) {
    if (value.event_id) {
      return;
    }
    if (value.dedup_id && value.event_name) {
      return;
    }
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'verbose=true requires event_id or both dedup_id and event_name',
    });
    return;
  }

  if (!value.user_identifier || !value.user_identifier_type || !value.event_name) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'user_identifier, user_identifier_type, and event_name are required when verbose is not true',
    });
  }
});

export type CheckEventStatusInput = z.infer<typeof checkEventStatusInputSchema>;

export const updateUserReferrerFieldsSchema = projectApiKeyBearerFieldsSchema.merge(writeConfirmationFieldsSchema).extend({
  user_identifier: z.string().min(1),
  user_identifier_type: identifierTypeForReferrerSchema,
  referrer_identifier: z.string().min(1),
  referrer_identifier_type: identifierTypeForReferrerSchema,
  referral_code: z
    .string()
    .min(1)
    .optional()
    .describe('Optional referral code string; links referral_code_id on user_referrers. Does not create referral_code_uses.'),
});

export const updateUserReferrerInputSchema = updateUserReferrerFieldsSchema;

export type UpdateUserReferrerInput = z.infer<typeof updateUserReferrerInputSchema>;

export const removeUserFromReferralCodeFieldsSchema = projectApiKeyBearerFieldsSchema.merge(writeConfirmationFieldsSchema).extend({
  referral_code: z.string().min(1).describe('Referral code the user used (path segment).'),
  user_identifier: z.string().min(1),
  user_identifier_type: identifierTypeForReferrerSchema,
  referrer_identifier: z.string().min(1).describe('Owner of the referral code.'),
  referrer_identifier_type: identifierTypeForReferrerSchema,
});

export const removeUserFromReferralCodeInputSchema = removeUserFromReferralCodeFieldsSchema;

export type RemoveUserFromReferralCodeInput = z.infer<typeof removeUserFromReferralCodeInputSchema>;

export const getUserReferrerFieldsSchema = projectApiKeyBearerFieldsSchema.extend({
  user_identifier: z.string().min(1),
  user_identifier_type: identifierTypeForReferrerSchema,
});

export const getUserReferrerInputSchema = getUserReferrerFieldsSchema;

export type GetUserReferrerInput = z.infer<typeof getUserReferrerInputSchema>;

export const useReferralCodeFieldsSchema = projectApiKeyBearerFieldsSchema.merge(writeConfirmationFieldsSchema).extend({
  referral_code: z.string().min(1).describe('Referral code string (path segment). Referrer is inferred from the code owner on the server.'),
  user_identifier: z.string().min(1),
  user_identifier_type: identifierTypeForReferrerSchema,
});

export const useReferralCodeInputSchema = useReferralCodeFieldsSchema;

export type UseReferralCodeInput = z.infer<typeof useReferralCodeInputSchema>;

export const swapUserReferralCodeFieldsSchema = projectApiKeyBearerFieldsSchema.merge(writeConfirmationFieldsSchema).extend({
  user_identifier: z.string().min(1),
  user_identifier_type: identifierTypeForReferrerSchema,
  from_referral_code: z.string().min(1),
  from_referrer_identifier: z.string().min(1).describe('Wallet of the owner of from_referral_code.'),
  from_referrer_identifier_type: identifierTypeForReferrerSchema,
  to_referral_code: z
    .string()
    .min(1)
    .describe('Target referral code. Step 2 PATCH /use assigns the user to this code owner (no separate to_referrer fields).'),
});

export const swapUserReferralCodeInputSchema = swapUserReferralCodeFieldsSchema.superRefine((val, ctx) => {
  if (val.to_referral_code != null && val.to_referral_code !== '' && val.from_referral_code === val.to_referral_code) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'from_referral_code and to_referral_code must differ when both are set',
      path: ['to_referral_code'],
    });
  }
});

export type SwapUserReferralCodeInput = z.infer<typeof swapUserReferralCodeInputSchema>;
