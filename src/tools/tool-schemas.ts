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
