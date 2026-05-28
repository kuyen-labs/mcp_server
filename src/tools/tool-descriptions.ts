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
  'Loads one project (draft + published trigger mapping). Calls GET /api/v1/projects/:projectId and GET /api/v1/projects/:projectId/customizations in parallel. ' +
  'Replaces triggers[] with scoped rows: ref, signature, draft_trigger_id, published_trigger_id, draft, published. ' +
  'Stable key across versions is ref (not UUID). After publish, draft and published rows get different UUIDs for the same ref. ' +
  'conversions[] are draft incentives with nested triggers merged the same way; published_conversion_id is null until a future published-incentives API. ' +
  'Example: {"project_id":"550e8400-e29b-41d4-a716-446655440000"}.';

export const LIST_INCENTIVES_DESCRIPTION =
  'Lists draft incentives with published trigger IDs merged by ref. Calls GET /api/v1/projects/:projectId/incentives and GET .../customizations. ' +
  'Each item: slug, draft_conversion_id, published_conversion_id (null for now), draft, published (null), triggers[] (scoped merge). ' +
  'Example: {"project_id":"<uuid>"}.';

export const GET_INCENTIVE_DESCRIPTION =
  'Gets one draft incentive with scoped triggers (same merge as list_incentives). conversion_id is the **draft** conversion UUID from incentives API. ' +
  'Use draft_trigger_id from triggers[] for PATCH update_trigger; published_trigger_id for live/prod comparisons (e.g. SQL on project.metadata_id). ' +
  'Example: {"project_id":"<uuid>","conversion_id":"<uuid>"}.';

export const GET_TRIGGER_DESCRIPTION =
  'Gets one trigger row by UUID: GET /api/v1/projects/:projectId/triggers/:triggerId. Returns whichever row that UUID points to (draft or published copy). ' +
  'Does not resolve project.metadata_id. Prefer get_project or get_incentive triggers[] for draft_trigger_id vs published_trigger_id by ref. ' +
  'Example: {"project_id":"<uuid>","trigger_id":"<uuid>"}.';

export const UPDATE_PAYOUT_TERM_DESCRIPTION =
  'Updates one payout term on a draft conversion: PATCH /api/v1/projects/:projectId/conversions/:conversionId/payout_terms/:payoutTermId. ' +
  'Body is a single PayoutTermDto (use get_incentive, edit fields such as referral_amount / referrer_amount, send as payout_term). ' +
  'For variable rewards, the server expects referral_amount_percentage / referrer_amount_percentage; this tool maps GET aliases automatically (same as the dashboard). ' +
  'Per-unit rewards: edit referral_amount and referrer_amount; do not send zero percentages. dry_run shows the normalized body sent to the API. ' +
  'Example dry_run: {"project_id":"<uuid>","conversion_id":"<uuid>","payout_term_id":"<uuid>","payout_term":{...},"dry_run":true}.';

export const UPDATE_PROJECT_TIER_DESCRIPTION =
  'Updates a project affiliate tier: PATCH /api/v1/projects/:projectId/tiers/:tierId. Optional fields: name, description, rank, audience_id (null clears audience). ' +
  'At least one field required. dry_run then confirmed. Example: {"project_id":"<uuid>","tier_id":"<uuid>","rank":2,"dry_run":true}.';

export const UPDATE_AUDIENCE_DESCRIPTION =
  'Updates an audience (user list): PATCH /api/v1/projects/:projectId/audiences/:audienceId. Body matches CreateOrUpdateAudienceDto: name (required), optional conditions[] (signature + parameters), condition_match_mode "any"|"all" (required if conditions non-empty), contractId. ' +
  'dry_run then confirmed. Example dry_run: {"project_id":"<uuid>","audience_id":"<uuid>","name":"VIP","dry_run":true}.';

export const CREATE_TRIGGER_DESCRIPTION =
  'Creates a draft trigger: POST /api/v1/projects/:projectId/triggers. Body matches CreateTriggerDto (same as fuul-webapp triggersService.create). ' +
  'Call list_trigger_types and list_chains first; ask the user for trigger type, then only type-specific fields. ' +
  'Token-holder example: {"name":"Hold CRV","description":"Daily holding of CRV on Ethereum","type":"token-holder","context":{"token_address":"0x...","chain_id":1,"volume_currency_expression":"0x..."}}. ' +
  'dry_run then confirmed. Use draft_trigger_id from the response (or get_project) for incentives.';

export const DELETE_TRIGGER_DESCRIPTION =
  'Deletes a draft trigger: DELETE /api/v1/projects/:projectId/triggers/:triggerId. Use draft_trigger_id from get_project. ' +
  'Requires dry_run then confirmed. Never call without explicit user approval. ' +
  'If HTTP 422 (trigger used in conversions): delete linked incentives first with delete_incentive, or create a replacement with create_trigger. ' +
  'To change token_address on a token-holder trigger, do NOT use update_trigger — use this delete+create flow or create_trigger only.';

export const CREATE_INCENTIVE_DESCRIPTION =
  'Creates a draft incentive (conversion): POST /api/v1/projects/:projectId/incentives. Body: name, trigger_ids[], payout_terms[] (same as webapp CreateIncentiveDTO). ' +
  'Call list_payout_schemas; collect incentive type, recipient, linked triggers, payout currency and amounts before posting. ' +
  'Payout terms are normalized for variable rewards (referral_amount → referral_amount_percentage) like update_payout_term. dry_run then confirmed.';

export const DELETE_INCENTIVE_DESCRIPTION =
  'Deletes a draft incentive: DELETE /api/v1/projects/:projectId/incentives/:conversionId. Use draft_conversion_id from list_incentives. ' +
  'Soft-deletes the conversion and its payout terms. dry_run then confirmed. Required before delete_trigger when the trigger is still linked.';

export const UPDATE_TRIGGER_DESCRIPTION =
  'Updates a trigger: PATCH /api/v1/projects/:projectId/triggers/:triggerId. Partial body matching UpdateTriggerDto (name, description, event_type, expressions, payable, ref, contract_ids as single-element array, etc.). ' +
  'Does NOT update context fields such as token_address or chain_id — those are set only at create time. To change the tracked token, explain that to the user and offer delete_trigger + create_trigger (with confirmation) or create_trigger alone. ' +
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
  'Duplicate dedup_id returns HTTP 409. After send, use check_event_status with verbose=true (dedup_id + event_name) to verify the pipeline. dry_run then confirmed.' +
  PROJECT_API_KEY_HINT +
  EVENTS_SEND_RATE_LIMIT +
  RATE_LIMIT_HINT +
  '\n\n**args shape for value/revenue:** For non-tracking events (swaps, deposits), args can include `value` and/or `revenue`, each as `{ amount: string, currency: {...} }`. ' +
  '`amount` is a string integer in the smallest unit (e.g. "1000000" for 1 USDC with 6 decimals); decimals only for fiat. ' +
  '`currency` accepts two forms: (1) Official symbol: `{ "name": "USDC" }` or `{ "name": "USD" }` or `{ "name": "POINT" }`, ' +
  '(2) Token identifier: `{ "identifier": "0xa0b...", "identifier_type": "evm_contract", "chain_identifier": "evm:1" }`. ' +
  '\n\nExample with value/revenue: {"name":"swap","user_identifier":"0x...","user_identifier_type":"evm_address","dedup_id":"swap-123",' +
  '"args":{"value":{"amount":"1000000","currency":{"name":"USDC"}},"revenue":{"amount":"3000","currency":{"name":"USDC"}}},"dry_run":true}. ' +
  '\n\nSimple dry_run: {"name":"trade","user_identifier":"0x...","user_identifier_type":"evm_address","dedup_id":"uuid-here","dry_run":true}.';

export const SEND_BATCH_EVENTS_DESCRIPTION =
  'Send up to 100 conversion events: POST /api/v1/events/batch. For backfills and bulk ingestion; processing is atomic (all succeed or all fail). Duplicate dedup_id values are silently ignored; response includes ingested_events count.' +
  PROJECT_API_KEY_HINT +
  ' dry_run then confirmed.' +
  EVENTS_BATCH_RATE_LIMIT +
  RATE_LIMIT_HINT +
  '\n\n**args shape for value/revenue:** Same as send_event — each event in the batch can include `args.value` and/or `args.revenue` as `{ amount: string, currency: {...} }`. ' +
  'See send_event description for currency formats and amount encoding. ' +
  '\n\nExample dry_run: {"events":[{"name":"swap","user_identifier":"0x...","user_identifier_type":"evm_address","dedup_id":"id-1",' +
  '"args":{"value":{"amount":"5000000000","currency":{"identifier":"0xa0b...","identifier_type":"evm_contract","chain_identifier":"evm:1"}}}}],"dry_run":true}.';

export const CHECK_EVENT_STATUS_DESCRIPTION =
  'Check event ingestion and downstream pipeline. Default (verbose omitted or false): GET /api/v1/events/status with user_identifier, user_identifier_type, event_name → {"created":true|false}. ' +
  'verbose=true: GET /api/v1/events/pipeline — returns event, trigger_executions (status, status_details), attributions, payouts, movements. ' +
  'Requires event_id OR dedup_id + event_name (same dedup_id/name as send_event). Poll every 2–5s after send_event until attributions/payouts appear. 404 → {"created":false}.' +
  PROJECT_API_KEY_HINT +
  EVENTS_SEND_RATE_LIMIT +
  RATE_LIMIT_HINT +
  ' Example status: {"user_identifier":"0x...","user_identifier_type":"evm_address","event_name":"trade"}. ' +
  'Example verbose: {"verbose":true,"dedup_id":"swap-123","event_name":"trade"}.';

export const GET_USER_REFERRER_DESCRIPTION =
  'Read a user referrer from user_referrers: GET /api/v1/user/referrer?user_identifier=&user_identifier_type=. Returns referrer_identifier, referrer_code, referrer_codes, referrer_name, referrer_user_rebate_rate (null referrer fields when unassigned). Unlike GET /referral_codes/status, this reflects PUT /user-referrers assignments even without referral_code_uses.' +
  PROJECT_API_KEY_HINT +
  ' Example: {"user_identifier":"0xUser...","user_identifier_type":"evm_address"}.';

export const UPDATE_USER_REFERRER_DESCRIPTION =
  'Admin override: create or overwrite user_referrers via PUT /api/v1/user-referrers (idempotent upsert). Sets source=project_imported; does NOT create referral_code_uses or increment actual_uses (status may stay referred:false). For real code redemption use use_referral_code instead. Requires service_role project API key.' +
  PROJECT_API_KEY_HINT +
  ' dry_run then confirmed. Example dry_run: {"user_identifier":"0xUser...","user_identifier_type":"evm_address","referrer_identifier":"0xKol...","referrer_identifier_type":"evm_address","dry_run":true}.';

export const USE_REFERRAL_CODE_DESCRIPTION =
  'Redeem a referral code for a user: PATCH /api/v1/referral_codes/:code/use. Creates referral_code_uses, increments actual_uses, sets user_referrers with source=code_redemption (GET /referral_codes/status → referred:true). Referrer is the code owner (do not pass referrer_identifier). Requires user has no existing referrer unless service_role idempotent replay of the same code. No wallet signature with service_role.' +
  PROJECT_API_KEY_HINT +
  ' dry_run then confirmed. Example dry_run: {"referral_code":"PROMO2024","user_identifier":"0xUser...","user_identifier_type":"evm_address","dry_run":true}.';

export const REMOVE_USER_FROM_REFERRAL_CODE_DESCRIPTION =
  'Remove a user from a referral code: DELETE /api/v1/referral_codes/:code/referrals. Atomically deletes user_referrers + referral_code_uses and decrements actual_uses. Not idempotent on the API; this tool maps known 422 cases to {"already_removed":true,"reason":"..."} for safe retries. Requires service_role project API key (no wallet signature).' +
  PROJECT_API_KEY_HINT +
  ' dry_run then confirmed. Example dry_run: {"referral_code":"PROMO2024","user_identifier":"0xUser...","user_identifier_type":"evm_address","referrer_identifier":"0xKol...","referrer_identifier_type":"evm_address","dry_run":true}.';

export const SWAP_USER_REFERRAL_CODE_DESCRIPTION =
  'Move a user between referral codes with full redemption semantics: DELETE from from_referral_code then PATCH /api/v1/referral_codes/:to_referral_code/use (not atomic). Step 1 tolerates already-removed 422s (e.g. user never had a prior code). Step 2 assigns to the owner of to_referral_code — there are no to_referrer_* params. If PATCH /use fails after DELETE, response has partial:true with use_error; complete with use_referral_code or update_user_referrer. Legacy PUT-only users (user_referrers without referral_code_use) may block step 2 with "User already has a referrer". For first assign with no prior code, use use_referral_code directly. Requires service_role project API key.' +
  PROJECT_API_KEY_HINT +
  ' dry_run then confirmed. Example dry_run: {"user_identifier":"0xUser...","user_identifier_type":"evm_address","from_referral_code":"OLD","from_referrer_identifier":"0xOldKol...","from_referrer_identifier_type":"evm_address","to_referral_code":"NEW","dry_run":true}.';
