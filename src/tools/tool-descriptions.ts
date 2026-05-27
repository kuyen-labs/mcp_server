/**
 * MCP tool descriptions tuned for LLMs (parameters + short examples).
 */

export const PING_DESCRIPTION = 'Health check: returns "pong" if the MCP process is running. No API calls. Example: invoke with empty input {}.';

export const WHOAMI_DESCRIPTION =
  'Returns the current Fuul dashboard user as JSON from GET /api/v1/auth/user. Requires prior CLI login (tokens in ~/.fuul/tokens.json). Example: {} after `npm run cli -- login`.';

export const LIST_CHAINS_DESCRIPTION =
  'Lists supported blockchain chains from GET /public-api/v1/metadata/chains. Uses server metadata (not a hardcoded catalog); responses are cached with ETag/Cache-Control. Each chain includes snake_case fields such as chain_id, is_testnet, optional svm_network and webapp_capabilities, and can_be_used_for_payouts (boolean: true where Fuul reward/payout infra is deployed). Params: none (pass {}). Pagination: not exposed by this tool until the API adds cursor/limit.';

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

export const UPDATE_AUDIENCE_DESCRIPTION =
  'Updates an audience (user list): PATCH /api/v1/projects/:projectId/audiences/:audienceId. Body matches CreateOrUpdateAudienceDto: name (required), optional conditions[] (signature + parameters), condition_match_mode "any"|"all" (required if conditions non-empty), contractId. ' +
  'dry_run then confirmed. Example dry_run: {"project_id":"<uuid>","audience_id":"<uuid>","name":"VIP","dry_run":true}.';

export const UPDATE_TRIGGER_DESCRIPTION =
  'Updates a trigger: PATCH /api/v1/projects/:projectId/triggers/:triggerId. Partial body matching UpdateTriggerDto (name, description, event_type, expressions, payable, ref, contract_ids as single-element array, etc.). ' +
  'At least one patch field required. dry_run then confirmed. Use get_trigger first for current state.';

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
  'Response includes active referred-user counts by multilevel depth (`active_referred_users_r2`–`r4`) scoped like volumes. ' +
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

const PROJECT_API_KEY_HINT =
  ' Auth: **project API key** only (pass `project_api_key` or set env `FUUL_MCP_PROJECT_API_KEY`). Dashboard OAuth from `fuul-mcp login` is not accepted on these routes.';

export const GET_PROJECT_AFFILIATE_PUBLIC_DESCRIPTION =
  'Loads one **managed** project affiliate (full detail: tiers, protections, audiences, tax): GET /api/v1/project-affiliates/:projectAffiliateId.' +
  PROJECT_API_KEY_HINT +
  ' Example: {"project_affiliate_id":"<uuid>"} with key via env or `project_api_key` field.';

export const CREATE_PROJECT_AFFILIATE_PUBLIC_DESCRIPTION =
  'Creates a managed project affiliate: POST /api/v1/project-affiliates. Body matches server public DTO (user_identifier, user_identifier_type, optional alias, region, status, note, audiences, tier_protection, approve_project_tier_ids + reviewed_by_user_id when approving tiers).' +
  PROJECT_API_KEY_HINT +
  ' Use dry_run: true then confirmed: true like other write tools. Example dry_run: {"user_identifier":"0x...","user_identifier_type":"evm_address","dry_run":true}.';

export const UPDATE_PROJECT_AFFILIATE_PUBLIC_DESCRIPTION =
  'Updates a managed project affiliate: PATCH /api/v1/project-affiliates/:projectAffiliateId. Partial body (alias, region, status, note, audiences, tier_protection including null to clear, approve_project_tier_ids with reviewed_by_user_id).' +
  PROJECT_API_KEY_HINT +
  ' dry_run then confirmed. Example dry_run: {"project_affiliate_id":"<uuid>","alias":"New name","dry_run":true}.';

const EVENTS_SEND_RATE_LIMIT = ' Rate limit: 100 requests/minute.';
const EVENTS_BATCH_RATE_LIMIT = ' Rate limit: 10 requests/minute.';

export const SEND_EVENT_DESCRIPTION =
  'Send one conversion event: POST /api/v1/events. Triggers real-time reward attribution. Required: name (trigger name), user_identifier, user_identifier_type, dedup_id. Optional: args, timestamp (ms). ' +
  'Duplicate dedup_id returns HTTP 409. Use check_event_status before resending. dry_run then confirmed.' +
  PROJECT_API_KEY_HINT +
  EVENTS_SEND_RATE_LIMIT +
  RATE_LIMIT_HINT +
  ' Example dry_run: {"name":"trade","user_identifier":"0x...","user_identifier_type":"evm_address","dedup_id":"uuid-here","dry_run":true}.';

export const SEND_BATCH_EVENTS_DESCRIPTION =
  'Send up to 100 conversion events: POST /api/v1/events/batch. For backfills and bulk ingestion; processing is atomic (all succeed or all fail). Duplicate dedup_id values are silently ignored; response includes ingested_events count.' +
  PROJECT_API_KEY_HINT +
  ' dry_run then confirmed.' +
  EVENTS_BATCH_RATE_LIMIT +
  RATE_LIMIT_HINT +
  ' Example dry_run: {"events":[{"name":"trade","user_identifier":"0x...","user_identifier_type":"evm_address","dedup_id":"id-1"}],"dry_run":true}.';

export const CHECK_EVENT_STATUS_DESCRIPTION =
  'Check if an event exists for a user: GET /api/v1/events/status. Query: user_identifier, user_identifier_type, event_name (case-sensitive). Returns {"created":true} or {"created":false}.' +
  PROJECT_API_KEY_HINT +
  EVENTS_SEND_RATE_LIMIT +
  RATE_LIMIT_HINT +
  ' Example: {"user_identifier":"0x...","user_identifier_type":"evm_address","event_name":"trade"}.';

export const UPDATE_USER_REFERRER_DESCRIPTION =
  'Create or overwrite a user referrer: PUT /api/v1/user-referrers (idempotent upsert). Sets user_referrers for the project inferred from the API key. Optional referral_code links referral_code_id on the row; does not create referral_code_uses or increment actual_uses. Requires project API key with service_role scope.' +
  PROJECT_API_KEY_HINT +
  ' dry_run then confirmed. Example dry_run (reassign KOL, no code): {"user_identifier":"0xUser...","user_identifier_type":"evm_address","referrer_identifier":"0xNewKol...","referrer_identifier_type":"evm_address","dry_run":true}. Example with code: add "referral_code":"PROMO2024".';

export const REMOVE_USER_FROM_REFERRAL_CODE_DESCRIPTION =
  'Remove a user from a referral code: DELETE /api/v1/referral_codes/:code/referrals. Atomically deletes user_referrers + referral_code_uses and decrements actual_uses. Not idempotent on the API; this tool maps known 422 cases to {"already_removed":true,"reason":"..."} for safe retries. Requires service_role project API key (no wallet signature).' +
  PROJECT_API_KEY_HINT +
  ' dry_run then confirmed. Example dry_run: {"referral_code":"PROMO2024","user_identifier":"0xUser...","user_identifier_type":"evm_address","referrer_identifier":"0xKol...","referrer_identifier_type":"evm_address","dry_run":true}.';

export const SWAP_USER_REFERRAL_CODE_DESCRIPTION =
  'Swap a user from one referral code to another referrer/code: DELETE from from_referral_code then PUT /api/v1/user-referrers (not a single atomic API transaction). Step 1 tolerates already-removed 422s. If PUT fails after DELETE, response includes partial:true with remove result and assign_error. Requires service_role project API key.' +
  PROJECT_API_KEY_HINT +
  ' dry_run then confirmed. Example dry_run: {"user_identifier":"0xUser...","user_identifier_type":"evm_address","from_referral_code":"OLD","from_referrer_identifier":"0xOldKol...","from_referrer_identifier_type":"evm_address","to_referrer_identifier":"0xNewKol...","to_referrer_identifier_type":"evm_address","to_referral_code":"NEW","dry_run":true}.';
