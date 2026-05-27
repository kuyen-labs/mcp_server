#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import {
  affiliatePortalStatsPath,
  projectAffiliatesBreakdownPath,
  projectAffiliateTotalStatsPath,
} from './affiliate-portal/affiliate-portal-queries.js';
import { assertWriteConfirmedOrDryRun, WriteNotConfirmedError } from './agent/write-confirmation.js';
import { OAuthClient } from './auth/oauth-client.js';
import { TokenStore } from './auth/token-store.js';
import { loadEnv } from './config/env.js';
import { runCheckEventStatus, runSendBatchEvents, runSendEvent } from './events/events-handlers.js';
import { ApiRequestError, FuulApiClient, NotLoggedInError } from './http/fuul-api-client.js';
import { MissingProjectApiKeyError, resolveProjectApiKeyBearer } from './http/project-api-key-bearer.js';
import { MetadataService } from './metadata/metadata-service.js';
import {
  loadIncentivesListWithMetadataScope,
  loadIncentiveWithMetadataScope,
  loadProjectWithMetadataScope,
} from './metadata-scope/fetch-project-config.js';
import { runPayoutBatchAction } from './payouts/payout-batch-handlers.js';
import {
  runRemoveUserFromReferralCode,
  runSwapUserReferralCode,
  runUpdateUserReferrer,
} from './referral-attribution/referral-attribution-handlers.js';
import {
  APPROVE_PAYOUTS_DESCRIPTION,
  CHECK_EVENT_STATUS_DESCRIPTION,
  CREATE_PROJECT_AFFILIATE_PUBLIC_DESCRIPTION,
  GET_AFFILIATE_PORTAL_STATS_DESCRIPTION,
  GET_INCENTIVE_DESCRIPTION,
  GET_PROJECT_AFFILIATE_PUBLIC_DESCRIPTION,
  GET_PROJECT_AFFILIATE_TOTAL_STATS_DESCRIPTION,
  GET_PROJECT_AFFILIATES_BREAKDOWN_DESCRIPTION,
  GET_PROJECT_DESCRIPTION,
  GET_TRIGGER_DESCRIPTION,
  LIST_CHAINS_DESCRIPTION,
  LIST_INCENTIVES_DESCRIPTION,
  LIST_PAYOUT_SCHEMAS_DESCRIPTION,
  LIST_PAYOUTS_PENDING_APPROVAL_DESCRIPTION,
  LIST_PROJECTS_DESCRIPTION,
  LIST_REWARDS_PAYOUTS_DESCRIPTION,
  LIST_TRIGGER_TYPES_DESCRIPTION,
  PING_DESCRIPTION,
  REJECT_PAYOUTS_DESCRIPTION,
  REMOVE_USER_FROM_REFERRAL_CODE_DESCRIPTION,
  SEND_BATCH_EVENTS_DESCRIPTION,
  SEND_EVENT_DESCRIPTION,
  SWAP_USER_REFERRAL_CODE_DESCRIPTION,
  UPDATE_AUDIENCE_DESCRIPTION,
  UPDATE_PAYOUT_TERM_DESCRIPTION,
  UPDATE_PROJECT_AFFILIATE_PUBLIC_DESCRIPTION,
  UPDATE_PROJECT_TIER_DESCRIPTION,
  UPDATE_TRIGGER_DESCRIPTION,
  UPDATE_USER_REFERRER_DESCRIPTION,
  WHOAMI_DESCRIPTION,
} from './tools/tool-descriptions.js';
import {
  checkEventStatusInputSchema,
  createProjectAffiliatePublicFieldsSchema,
  createProjectAffiliatePublicInputSchema,
  getAffiliatePortalStatsSchema,
  getIncentiveInputSchema,
  getProjectAffiliatePublicInputSchema,
  getProjectAffiliatesBreakdownSchema,
  getProjectAffiliateTotalStatsSchema,
  getTriggerInputSchema,
  listPayoutsPendingApprovalSchema,
  listProjectsInputSchema,
  listRewardsPayoutsSchema,
  payoutBatchActionInputSchema,
  projectIdParamSchema,
  removeUserFromReferralCodeFieldsSchema,
  removeUserFromReferralCodeInputSchema,
  sendBatchEventsFieldsSchema,
  sendBatchEventsInputSchema,
  sendEventFieldsSchema,
  sendEventInputSchema,
  swapUserReferralCodeFieldsSchema,
  swapUserReferralCodeInputSchema,
  updateAudienceFieldsSchema,
  updateAudienceInputSchema,
  updatePayoutTermInputSchema,
  updateProjectAffiliatePublicFieldsSchema,
  updateProjectAffiliatePublicInputSchema,
  updateProjectTierFieldsSchema,
  updateProjectTierInputSchema,
  updateTriggerFieldsSchema,
  updateTriggerInputSchema,
  updateUserReferrerFieldsSchema,
  updateUserReferrerInputSchema,
} from './tools/tool-schemas.js';
import { compactQuery } from './util/compact-query.js';
import { ToolTimeoutError, withTimeout } from './util/with-timeout.js';

function toolErrorPayload(e: unknown, httpDetail = 'Request failed'): { content: [{ type: 'text'; text: string }]; isError: true } {
  const message =
    e instanceof ToolTimeoutError
      ? `${e.message} Increase FUUL_MCP_TOOL_TIMEOUT_MS if the API is slow.`
      : e instanceof NotLoggedInError
        ? e.message
        : e instanceof WriteNotConfirmedError
          ? e.message
          : e instanceof MissingProjectApiKeyError
            ? e.message
            : e instanceof ApiRequestError
              ? e.status === 401
                ? `${httpDetail} (HTTP ${e.status}). Run \`fuul-mcp login\` if you are not authenticated.`
                : e.message
              : e instanceof Error
                ? e.message
                : String(e);
  return { content: [{ type: 'text', text: message }], isError: true };
}

function managedProjectAffiliateBody(parsed: Record<string, unknown>, extraOmit: readonly string[]): Record<string, unknown> {
  const omit = new Set<string>(['dry_run', 'confirmed', 'project_api_key', ...extraOmit]);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(parsed)) {
    if (omit.has(k) || v === undefined) {
      continue;
    }
    out[k] = v;
  }
  return out;
}

async function main(): Promise<void> {
  const env = loadEnv();
  const store = new TokenStore();
  const oauth = new OAuthClient(env, store);
  const api = new FuulApiClient(env, store, oauth);
  const metadata = new MetadataService(api);
  const toolTimeoutMs = env.FUUL_MCP_TOOL_TIMEOUT_MS;

  const server = new McpServer({
    name: '@fuul/mcp-server',
    version: '0.1.0',
  });

  server.tool('ping', PING_DESCRIPTION, {}, async () => ({
    content: [{ type: 'text', text: 'pong' }],
  }));

  server.tool('whoami', WHOAMI_DESCRIPTION, {}, async () => {
    try {
      const user = await withTimeout(api.getAuthUser(), toolTimeoutMs, 'whoami');
      return { content: [{ type: 'text', text: JSON.stringify(user, null, 2) }] };
    } catch (e) {
      return toolErrorPayload(e, 'Failed to load user');
    }
  });

  server.tool('list_chains', LIST_CHAINS_DESCRIPTION, {}, async () => {
    try {
      const data = await withTimeout(metadata.getChains(), toolTimeoutMs, 'list_chains');
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return toolErrorPayload(e);
    }
  });

  server.tool('list_trigger_types', LIST_TRIGGER_TYPES_DESCRIPTION, {}, async () => {
    try {
      const data = await withTimeout(metadata.getTriggerTypes(), toolTimeoutMs, 'list_trigger_types');
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return toolErrorPayload(e);
    }
  });

  server.tool('list_payout_schemas', LIST_PAYOUT_SCHEMAS_DESCRIPTION, {}, async () => {
    try {
      const data = await withTimeout(metadata.getPayoutSchemas(), toolTimeoutMs, 'list_payout_schemas');
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return toolErrorPayload(e);
    }
  });

  server.tool('list_projects', LIST_PROJECTS_DESCRIPTION, listProjectsInputSchema.shape, async (args) => {
    try {
      const parsed = listProjectsInputSchema.parse(args);
      const query: Record<string, unknown> = {};
      if (parsed.page != null) {
        query.page = parsed.page;
      }
      if (parsed.query != null) {
        query.query = parsed.query;
      }
      const data = await withTimeout(api.getJson('/api/v1/projects', { query }), toolTimeoutMs, 'list_projects');
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return toolErrorPayload(e, 'Failed to list projects');
    }
  });

  server.tool('get_project', GET_PROJECT_DESCRIPTION, projectIdParamSchema.shape, async (args) => {
    try {
      const { project_id } = projectIdParamSchema.parse(args);
      const data = await loadProjectWithMetadataScope(api, project_id, toolTimeoutMs);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return toolErrorPayload(e, 'Failed to load project');
    }
  });

  server.tool('list_incentives', LIST_INCENTIVES_DESCRIPTION, projectIdParamSchema.shape, async (args) => {
    try {
      const { project_id } = projectIdParamSchema.parse(args);
      const data = await loadIncentivesListWithMetadataScope(api, project_id, toolTimeoutMs);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return toolErrorPayload(e, 'Failed to list incentives');
    }
  });

  server.tool('get_incentive', GET_INCENTIVE_DESCRIPTION, getIncentiveInputSchema.shape, async (args) => {
    try {
      const { project_id, conversion_id } = getIncentiveInputSchema.parse(args);
      const data = await loadIncentiveWithMetadataScope(api, project_id, conversion_id, toolTimeoutMs);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return toolErrorPayload(e, 'Failed to load incentive');
    }
  });

  server.tool('get_trigger', GET_TRIGGER_DESCRIPTION, getTriggerInputSchema.shape, async (args) => {
    try {
      const { project_id, trigger_id } = getTriggerInputSchema.parse(args);
      const data = await withTimeout(api.getJson(`/api/v1/projects/${project_id}/triggers/${trigger_id}`), toolTimeoutMs, 'get_trigger');
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return toolErrorPayload(e, 'Failed to load trigger');
    }
  });

  server.tool('get_affiliate_portal_stats', GET_AFFILIATE_PORTAL_STATS_DESCRIPTION, getAffiliatePortalStatsSchema.shape, async (args) => {
    try {
      const parsed = getAffiliatePortalStatsSchema.parse(args);
      const data = await withTimeout(api.getJson(affiliatePortalStatsPath(parsed)), toolTimeoutMs, 'get_affiliate_portal_stats');
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return toolErrorPayload(e, 'Failed to load affiliate portal stats');
    }
  });

  server.tool(
    'get_project_affiliate_total_stats',
    GET_PROJECT_AFFILIATE_TOTAL_STATS_DESCRIPTION,
    getProjectAffiliateTotalStatsSchema.shape,
    async (args) => {
      try {
        const parsed = getProjectAffiliateTotalStatsSchema.parse(args);
        const data = await withTimeout(api.getJson(projectAffiliateTotalStatsPath(parsed)), toolTimeoutMs, 'get_project_affiliate_total_stats');
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return toolErrorPayload(e, 'Failed to load project affiliate total stats');
      }
    },
  );

  server.tool(
    'get_project_affiliates_breakdown',
    GET_PROJECT_AFFILIATES_BREAKDOWN_DESCRIPTION,
    getProjectAffiliatesBreakdownSchema.shape,
    async (args) => {
      try {
        const parsed = getProjectAffiliatesBreakdownSchema.parse(args);
        const data = await withTimeout(api.getJson(projectAffiliatesBreakdownPath(parsed)), toolTimeoutMs, 'get_project_affiliates_breakdown');
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return toolErrorPayload(e, 'Failed to load project affiliates breakdown');
      }
    },
  );

  server.tool('get_project_affiliate_public', GET_PROJECT_AFFILIATE_PUBLIC_DESCRIPTION, getProjectAffiliatePublicInputSchema.shape, async (args) => {
    try {
      const parsed = getProjectAffiliatePublicInputSchema.parse(args);
      const bearer = resolveProjectApiKeyBearer(env, parsed.project_api_key);
      const data = await withTimeout(
        api.getJson(`/api/v1/project-affiliates/${parsed.project_affiliate_id}`, { bearerToken: bearer }),
        toolTimeoutMs,
        'get_project_affiliate_public',
      );
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return toolErrorPayload(e, 'Failed to load managed project affiliate');
    }
  });

  server.tool(
    'create_project_affiliate_public',
    CREATE_PROJECT_AFFILIATE_PUBLIC_DESCRIPTION,
    createProjectAffiliatePublicFieldsSchema.shape,
    async (args) => {
      try {
        const parsed = createProjectAffiliatePublicInputSchema.parse(args);
        const bearer = resolveProjectApiKeyBearer(env, parsed.project_api_key);
        assertWriteConfirmedOrDryRun(parsed);
        const body = managedProjectAffiliateBody(parsed as unknown as Record<string, unknown>, []);
        if (parsed.dry_run === true) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ dry_run: true, would_post: '/api/v1/project-affiliates', body }, null, 2),
              },
            ],
          };
        }
        const data = await withTimeout(
          api.postJson('/api/v1/project-affiliates', body, { bearerToken: bearer }),
          toolTimeoutMs,
          'create_project_affiliate_public',
        );
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return toolErrorPayload(e, 'Failed to create managed project affiliate');
      }
    },
  );

  server.tool(
    'update_project_affiliate_public',
    UPDATE_PROJECT_AFFILIATE_PUBLIC_DESCRIPTION,
    updateProjectAffiliatePublicFieldsSchema.shape,
    async (args) => {
      try {
        const parsed = updateProjectAffiliatePublicInputSchema.parse(args);
        const bearer = resolveProjectApiKeyBearer(env, parsed.project_api_key);
        assertWriteConfirmedOrDryRun(parsed);
        const body = managedProjectAffiliateBody(parsed as unknown as Record<string, unknown>, ['project_affiliate_id']);
        const path = `/api/v1/project-affiliates/${parsed.project_affiliate_id}`;
        if (parsed.dry_run === true) {
          return {
            content: [{ type: 'text', text: JSON.stringify({ dry_run: true, would_patch: path, body }, null, 2) }],
          };
        }
        const data = await withTimeout(api.patchJson(path, body, { bearerToken: bearer }), toolTimeoutMs, 'update_project_affiliate_public');
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return toolErrorPayload(e, 'Failed to update managed project affiliate');
      }
    },
  );

  server.tool('send_event', SEND_EVENT_DESCRIPTION, sendEventFieldsSchema.shape, async (args) => {
    try {
      const parsed = sendEventInputSchema.parse(args);
      const bearer = resolveProjectApiKeyBearer(env, parsed.project_api_key);
      const data = await withTimeout(runSendEvent(api, bearer, parsed), toolTimeoutMs, 'send_event');
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return toolErrorPayload(e, 'Failed to send event');
    }
  });

  server.tool('send_batch_events', SEND_BATCH_EVENTS_DESCRIPTION, sendBatchEventsFieldsSchema.shape, async (args) => {
    try {
      const parsed = sendBatchEventsInputSchema.parse(args);
      const bearer = resolveProjectApiKeyBearer(env, parsed.project_api_key);
      const data = await withTimeout(runSendBatchEvents(api, bearer, parsed), toolTimeoutMs, 'send_batch_events');
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return toolErrorPayload(e, 'Failed to send batch events');
    }
  });

  server.tool('check_event_status', CHECK_EVENT_STATUS_DESCRIPTION, checkEventStatusInputSchema.shape, async (args) => {
    try {
      const parsed = checkEventStatusInputSchema.parse(args);
      const bearer = resolveProjectApiKeyBearer(env, parsed.project_api_key);
      const data = await withTimeout(runCheckEventStatus(api, bearer, parsed), toolTimeoutMs, 'check_event_status');
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return toolErrorPayload(e, 'Failed to check event status');
    }
  });

  server.tool('update_user_referrer', UPDATE_USER_REFERRER_DESCRIPTION, updateUserReferrerFieldsSchema.shape, async (args) => {
    try {
      const parsed = updateUserReferrerInputSchema.parse(args);
      const bearer = resolveProjectApiKeyBearer(env, parsed.project_api_key);
      const data = await withTimeout(runUpdateUserReferrer(api, bearer, parsed), toolTimeoutMs, 'update_user_referrer');
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return toolErrorPayload(e, 'Failed to update user referrer');
    }
  });

  server.tool(
    'remove_user_from_referral_code',
    REMOVE_USER_FROM_REFERRAL_CODE_DESCRIPTION,
    removeUserFromReferralCodeFieldsSchema.shape,
    async (args) => {
      try {
        const parsed = removeUserFromReferralCodeInputSchema.parse(args);
        const bearer = resolveProjectApiKeyBearer(env, parsed.project_api_key);
        const data = await withTimeout(runRemoveUserFromReferralCode(api, bearer, parsed), toolTimeoutMs, 'remove_user_from_referral_code');
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return toolErrorPayload(e, 'Failed to remove user from referral code');
      }
    },
  );

  server.tool('swap_user_referral_code', SWAP_USER_REFERRAL_CODE_DESCRIPTION, swapUserReferralCodeFieldsSchema.shape, async (args) => {
    try {
      const parsed = swapUserReferralCodeInputSchema.parse(args);
      const bearer = resolveProjectApiKeyBearer(env, parsed.project_api_key);
      const data = await withTimeout(runSwapUserReferralCode(api, bearer, parsed), toolTimeoutMs, 'swap_user_referral_code');
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return toolErrorPayload(e, 'Failed to swap user referral code');
    }
  });

  server.tool('list_payouts_pending_approval', LIST_PAYOUTS_PENDING_APPROVAL_DESCRIPTION, listPayoutsPendingApprovalSchema.shape, async (args) => {
    try {
      const parsed = listPayoutsPendingApprovalSchema.parse(args);
      const query = compactQuery({ page: parsed.page, page_size: parsed.page_size });
      const data = await withTimeout(
        api.getJson(`/api/v1/projects/${parsed.project_id}/payouts/pending-approval`, { query }),
        toolTimeoutMs,
        'list_payouts_pending_approval',
      );
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return toolErrorPayload(e, 'Failed to list pending approval payouts');
    }
  });

  server.tool('list_rewards_payouts', LIST_REWARDS_PAYOUTS_DESCRIPTION, listRewardsPayoutsSchema.shape, async (args) => {
    try {
      const parsed = listRewardsPayoutsSchema.parse(args);
      const query = compactQuery({
        page: parsed.page,
        page_size: parsed.page_size,
        status: parsed.status,
        from_date: parsed.from_date,
        to_date: parsed.to_date,
      });
      const data = await withTimeout(
        api.getJson(`/api/v1/projects/${parsed.project_id}/payouts/rewards-payouts`, { query }),
        toolTimeoutMs,
        'list_rewards_payouts',
      );
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return toolErrorPayload(e, 'Failed to list rewards payouts');
    }
  });

  server.tool('approve_payouts', APPROVE_PAYOUTS_DESCRIPTION, payoutBatchActionInputSchema.shape, async (args) => {
    try {
      const parsed = payoutBatchActionInputSchema.parse(args);
      const data = await withTimeout(runPayoutBatchAction(api, parsed, 'approve'), toolTimeoutMs, 'approve_payouts');
      return { content: [{ type: 'text', text: JSON.stringify(data ?? { ok: true }, null, 2) }] };
    } catch (e) {
      return toolErrorPayload(e, 'Failed to approve payouts');
    }
  });

  server.tool('reject_payouts', REJECT_PAYOUTS_DESCRIPTION, payoutBatchActionInputSchema.shape, async (args) => {
    try {
      const parsed = payoutBatchActionInputSchema.parse(args);
      const data = await withTimeout(runPayoutBatchAction(api, parsed, 'reject'), toolTimeoutMs, 'reject_payouts');
      return { content: [{ type: 'text', text: JSON.stringify(data ?? { ok: true }, null, 2) }] };
    } catch (e) {
      return toolErrorPayload(e, 'Failed to reject payouts');
    }
  });

  server.tool('update_payout_term', UPDATE_PAYOUT_TERM_DESCRIPTION, updatePayoutTermInputSchema.shape, async (args) => {
    try {
      const parsed = updatePayoutTermInputSchema.parse(args);
      assertWriteConfirmedOrDryRun(parsed);
      const path = `/api/v1/projects/${parsed.project_id}/conversions/${parsed.conversion_id}/payout_terms/${parsed.payout_term_id}`;
      if (parsed.dry_run === true) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ dry_run: true, would_patch: path, body: parsed.payout_term }, null, 2),
            },
          ],
        };
      }
      const data = await withTimeout(api.patchJson(path, parsed.payout_term), toolTimeoutMs, 'update_payout_term');
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return toolErrorPayload(e, 'Failed to update payout term');
    }
  });

  server.tool('update_audience', UPDATE_AUDIENCE_DESCRIPTION, updateAudienceFieldsSchema.shape, async (args) => {
    try {
      const parsed = updateAudienceInputSchema.parse(args);
      assertWriteConfirmedOrDryRun(parsed);
      const path = `/api/v1/projects/${parsed.project_id}/audiences/${parsed.audience_id}`;
      const body: Record<string, unknown> = { name: parsed.name };
      if (parsed.conditions !== undefined) {
        body.conditions = parsed.conditions;
      }
      if (parsed.condition_match_mode !== undefined) {
        body.condition_match_mode = parsed.condition_match_mode;
      }
      if (parsed.contractId !== undefined) {
        body.contractId = parsed.contractId;
      }
      if (parsed.dry_run === true) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ dry_run: true, would_patch: path, body }, null, 2) }],
        };
      }
      const data = await withTimeout(api.patchJson(path, body), toolTimeoutMs, 'update_audience');
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return toolErrorPayload(e, 'Failed to update audience');
    }
  });

  server.tool('update_trigger', UPDATE_TRIGGER_DESCRIPTION, updateTriggerFieldsSchema.shape, async (args) => {
    try {
      const parsed = updateTriggerInputSchema.parse(args);
      assertWriteConfirmedOrDryRun(parsed);
      const path = `/api/v1/projects/${parsed.project_id}/triggers/${parsed.trigger_id}`;
      const body: Record<string, unknown> = {};
      if (parsed.name !== undefined) {
        body.name = parsed.name;
      }
      if (parsed.description !== undefined) {
        body.description = parsed.description;
      }
      if (parsed.event_type !== undefined) {
        body.event_type = parsed.event_type;
      }
      if (parsed.condition_expression !== undefined) {
        body.condition_expression = parsed.condition_expression;
      }
      if (parsed.amount_expression !== undefined) {
        body.amount_expression = parsed.amount_expression;
      }
      if (parsed.volume_expression !== undefined) {
        body.volume_expression = parsed.volume_expression;
      }
      if (parsed.revenue_expression !== undefined) {
        body.revenue_expression = parsed.revenue_expression;
      }
      if (parsed.currency_expression !== undefined) {
        body.currency_expression = parsed.currency_expression;
      }
      if (parsed.volume_currency_expression !== undefined) {
        body.volume_currency_expression = parsed.volume_currency_expression;
      }
      if (parsed.revenue_currency_expression !== undefined) {
        body.revenue_currency_expression = parsed.revenue_currency_expression;
      }
      if (parsed.end_user_identifier_property !== undefined) {
        body.end_user_identifier_property = parsed.end_user_identifier_property;
      }
      if (parsed.end_user_identifier_expression !== undefined) {
        body.end_user_identifier_expression = parsed.end_user_identifier_expression;
      }
      if (parsed.payable !== undefined) {
        body.payable = parsed.payable;
      }
      if (parsed.ref !== undefined) {
        body.ref = parsed.ref;
      }
      if (parsed.contract_ids !== undefined) {
        body.contract_ids = parsed.contract_ids;
      }
      if (parsed.dry_run === true) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ dry_run: true, would_patch: path, body }, null, 2) }],
        };
      }
      const data = await withTimeout(api.patchJson(path, body), toolTimeoutMs, 'update_trigger');
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return toolErrorPayload(e, 'Failed to update trigger');
    }
  });

  server.tool('update_project_tier', UPDATE_PROJECT_TIER_DESCRIPTION, updateProjectTierFieldsSchema.shape, async (args) => {
    try {
      const parsed = updateProjectTierInputSchema.parse(args);
      assertWriteConfirmedOrDryRun(parsed);
      const path = `/api/v1/projects/${parsed.project_id}/tiers/${parsed.tier_id}`;
      const body: Record<string, unknown> = {};
      if (parsed.name !== undefined) {
        body.name = parsed.name;
      }
      if (parsed.description !== undefined) {
        body.description = parsed.description;
      }
      if (parsed.rank !== undefined) {
        body.rank = parsed.rank;
      }
      if (parsed.audience_id !== undefined) {
        body.audience_id = parsed.audience_id;
      }
      if (parsed.dry_run === true) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ dry_run: true, would_patch: path, body }, null, 2) }],
        };
      }
      const data = await withTimeout(api.patchJson(path, body), toolTimeoutMs, 'update_project_tier');
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return toolErrorPayload(e, 'Failed to update project tier');
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
