/**
 * MCP tool descriptions tuned for LLMs (parameters + short examples).
 */

export const PING_DESCRIPTION = 'Health check: returns "pong" if the MCP process is running. No API calls. Example: invoke with empty input {}.';

export const WHOAMI_DESCRIPTION =
  'Returns the current Fuul dashboard user as JSON from GET /api/v1/auth/user. Requires prior CLI login (tokens in ~/.fuul/tokens.json). Example: {} after `npm run cli -- login`.';

export const LIST_CHAINS_DESCRIPTION =
  'Lists supported blockchain chains from GET /public-api/v1/metadata/chains. Uses server metadata (not a hardcoded catalog); responses are cached with ETag/Cache-Control. Params: none (pass {}). Pagination: not exposed by this tool until the API adds cursor/limit.';

export const LIST_TRIGGER_TYPES_DESCRIPTION =
  'Lists trigger type metadata from GET /public-api/v1/metadata/trigger-types (cached). Use ids from this response when building programs/triggers. Params: {}.';

export const LIST_PAYOUT_SCHEMAS_DESCRIPTION = 'Lists payout schema metadata from GET /public-api/v1/metadata/payout-schemas (cached). Params: {}.';

export const LIST_PROJECTS_DESCRIPTION =
  'Lists dashboard projects for the current user: GET /api/v1/projects with optional ?page= (1-based) and ?query=. Example: {"page":1} or {"query":"acme"}.';

export const GET_PROJECT_DESCRIPTION =
  'Loads one project: GET /api/v1/projects/:projectId. Example: {"project_id":"550e8400-e29b-41d4-a716-446655440000"}.';

export const LIST_INCENTIVES_DESCRIPTION =
  'Lists draft incentives (conversions) for a project: GET /api/v1/projects/:projectId/incentives. Example: {"project_id":"<uuid>"}.';

export const GET_INCENTIVE_DESCRIPTION =
  'Gets one incentive: GET /api/v1/projects/:projectId/incentives/:conversionId. Example: {"project_id":"<uuid>","conversion_id":"<uuid>"}.';

export const GET_TRIGGER_DESCRIPTION =
  'Gets trigger details (including triggerType for metadata checks): GET /api/v1/projects/:projectId/triggers/:triggerId. Example: {"project_id":"<uuid>","trigger_id":"<uuid>"}.';

export const UPDATE_PAYOUT_TERM_DESCRIPTION =
  'Updates one payout term on a draft conversion: PATCH /api/v1/projects/:projectId/conversions/:conversionId/payout_terms/:payoutTermId. ' +
  'Body is a single PayoutTermDto (use get_incentive or GET the payout term, modify, send as payout_term). dry_run then confirmed. ' +
  'Example dry_run: {"project_id":"<uuid>","conversion_id":"<uuid>","payout_term_id":"<uuid>","payout_term":{...},"dry_run":true}.';

export const UPDATE_PROJECT_TIER_DESCRIPTION =
  'Updates a project affiliate tier: PATCH /api/v1/projects/:projectId/tiers/:tierId. Optional fields: name, description, rank, audience_id (null clears audience). ' +
  'At least one field required. dry_run then confirmed. Example: {"project_id":"<uuid>","tier_id":"<uuid>","rank":2,"dry_run":true}.';

export const LIST_PAYOUTS_PENDING_APPROVAL_DESCRIPTION =
  'Lists payouts pending approval: GET /api/v1/projects/:projectId/payouts/pending-approval. Optional page, page_size. Example: {"project_id":"<uuid>","page":1,"page_size":50}.';

export const LIST_REWARDS_PAYOUTS_DESCRIPTION =
  'Lists rewards payouts history: GET /api/v1/projects/:projectId/payouts/rewards-payouts. Optional page, page_size, status, from_date, to_date. Example: {"project_id":"<uuid>","page":1}.';

export const APPROVE_PAYOUTS_DESCRIPTION =
  'Approves payouts: PATCH /api/v1/projects/:projectId/payouts/approve. Body: payout_ids OR date filters (server validates mutual exclusivity). dry_run then confirmed. Example dry_run: {"project_id":"<uuid>","payout_ids":["<uuid>"],"dry_run":true}.';

export const REJECT_PAYOUTS_DESCRIPTION = 'Rejects payouts: PATCH /api/v1/projects/:projectId/payouts/reject. Same body rules as approve_payouts.';

const RATE_LIMIT_HINT = ' If the API returns HTTP 429, wait Retry-After seconds (if present) before retrying.';

export const GET_AFFILIATE_PORTAL_STATS_DESCRIPTION =
  'Project affiliate stats for one user identifier: GET /api/v1/projects/:projectId/affiliate-portal/stats. ' +
  'Requires dashboard JWT (same as other project tools). Query params match the dashboard affiliate management UI. ' +
  'Example: {"project_id":"<uuid>","user_identifier":"evm:0x..."}.' +
  RATE_LIMIT_HINT;

export const GET_PROJECT_AFFILIATE_TOTAL_STATS_DESCRIPTION =
  'Aggregated project-wide affiliate totals: GET /api/v1/projects/:projectId/affiliate-portal/total-stats. ' +
  'Optional filters: statuses, regions, audiences, tiers, dateRange, dateFrom, dateTo (see fuul-server GetTotalStatsDto). ' +
  'Example: {"project_id":"<uuid>"} or {"project_id":"<uuid>","dateRange":"30d"}.' +
  RATE_LIMIT_HINT;

export const GET_PROJECT_AFFILIATES_BREAKDOWN_DESCRIPTION =
  'Affiliate breakdown for a project (by audience, tier, region, or status): GET /api/v1/projects/:projectId/affiliate-portal/global-breakdown. ' +
  'groupBy is required (audience | tier | region | status). Optional sortBy, sortOrder, date filters, and dimension filters. ' +
  'Example: {"project_id":"<uuid>","groupBy":"region","dateRange":"30d"}.' +
  RATE_LIMIT_HINT;
