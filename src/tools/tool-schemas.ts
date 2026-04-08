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

export const createIncentiveProgramInputSchema = writeConfirmationFieldsSchema.extend({
  project_id: uuid,
  name: z.string().min(1),
  trigger_ids: z.array(uuid).min(1),
  payout_terms: z.array(payoutTermSchema).min(1).describe('Objects matching server PayoutTermDto (see fuul-server).'),
});

export type CreateIncentiveProgramInput = z.infer<typeof createIncentiveProgramInputSchema>;

export const updateIncentiveProgramInputSchema = writeConfirmationFieldsSchema.extend({
  project_id: uuid,
  conversion_id: uuid,
  name: z.string().min(1),
  trigger_ids: z.array(uuid).min(1),
  payout_terms: z.array(payoutTermSchema).min(1),
});

export type UpdateIncentiveProgramInput = z.infer<typeof updateIncentiveProgramInputSchema>;

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
