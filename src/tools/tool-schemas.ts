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
