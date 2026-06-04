/**
 * MCP tool descriptions tuned for LLMs (parameters + short examples).
 */

export const PUBLISH_METADATA_AFTER_WRITE_NOTE =
  ' On successful execution (not dry_run), the response includes _publish_metadata_reminder: publish project metadata from the dashboard (Project → Incentives or Triggers → Publish now). The MCP cannot publish for you.';

export const DRAFT_ID_RESOLUTION_BEFORE_WRITE_NOTE =
  ' Before executing (including dry_run), this tool refreshes project metadata (same as get_project) and resolves trigger_id / conversion_id / trigger_ids[] to the current draft UUIDs. ' +
  'If you pass a published_trigger_id from before a dashboard publish, it is remapped to the current draft_trigger_id for the same ref. ' +
  'Responses include _draft_id_resolution when an ID was remapped. Unknown stale UUIDs fail with an explicit error.';

export const PING_DESCRIPTION = 'Health check: returns "pong" if the MCP process is running. No API calls. Example: invoke with empty input {}.';

export const WHOAMI_DESCRIPTION =
  'Returns the current Fuul dashboard user as JSON from GET /api/v1/auth/user. Requires prior CLI login (tokens in ~/.fuul/tokens.json). Example: {} after `npm run cli -- login`.';

export const LIST_CHAINS_DESCRIPTION =
  'Lists supported blockchain chains from GET /public-api/v1/metadata/chains. Uses server metadata (not a hardcoded catalog); responses are cached with ETag/Cache-Control. Each chain includes snake_case fields such as chain_id, is_testnet, optional svm_network and webapp_capabilities, and can_be_used_for_payouts (boolean: true where Fuul reward/payout infra is deployed). Params: none (pass {}). Pagination: not exposed by this tool until the API adds cursor/limit.';

export const LIST_TRIGGER_TYPES_DESCRIPTION =
  'Lists trigger type metadata from GET /public-api/v1/metadata/trigger-types (cached), enriched for create_trigger. ' +
  'Each trigger_types[] row includes: context_json_schema (field definitions), create_payload_layout (flat_dto | context_only | context_and_root_fields), create_payload_notes, and create_payload_example when available. ' +
  'Top-level create_trigger_payload_guide explains the three layouts (same as fuul-webapp encode.ts). ' +
  'Always call this before create_trigger. Params: {}.';

export const RESOLVE_TOKEN_HOLDER_PRICE_REFERENCE_DESCRIPTION =
  'Resolves context.volume_currency_expression for token-holder triggers (check + assign). ' +
  'Step 1: pass token_address and chain_identifier (or chain_id). If the token is already in Fuul price references → status listed_use_same_address, use token_address as volume_currency_expression. ' +
  'Step 2: if status needs_user_input, ask: stablecoin or variable? decimals 6 or 18? Then call again with token_kind and decimals. ' +
  'Step 3: status resolved returns assigned volume_currency_expression (e.g. stablecoin + 18 decimals on Ethereum → DAI). Use that in create_trigger. ' +
  'create_trigger rejects unlisted tokens when volume_currency_expression equals token_address. ' +
  'Example listed: {"token_address":"0x6b175474e89094c44da98b954eedeac495271d0f","chain_identifier":"ethereum"}. ' +
  'Example assign: {"token_address":"0xa3931d71877C0E7a3148CB7Eb4463524FEc27fbD","chain_identifier":"ethereum","token_kind":"stablecoin","decimals":18}.';

export const LIST_PRICE_REFERENCES_DESCRIPTION =
  'Lists currencies usable as price references for token-holder triggers: GET /api/v1/currencies?price_reference=true&page_size=100. ' +
  'Optional chain_identifier (e.g. "ethereum") filters to that chain. Each result includes identifier (use as volume_currency_expression), name, decimals, chain_identifier. ' +
  'REQUIRED before create_trigger when the held token may not be a known asset (not on CoinGecko/CMC). ' +
  'Workflow: (1) Call with the trigger chain. (2) If token_address is in results[] (EVM: compare identifier case-insensitively), set volume_currency_expression = token_address. ' +
  '(3) If NOT listed, ask the user: stablecoin or variable-price? How many decimals (6 or 18)? Pick a reference from results with matching decimals. ' +
  'Examples: DAI 0x6b175474e89094c44da98b954eedeac495271d0f on Ethereum is listed — use same address. ' +
  'Unknown 18-decimal stablecoin 0xa3931d71877C0E7a3148CB7Eb4463524FEc27fbD on Ethereum is NOT listed — use DAI as volume_currency_expression, not the token address. ' +
  'Wrong reference → trigger creates (201) but never prices volume correctly. Params: {} or {"chain_identifier":"ethereum"}.';

export const LIST_PAYOUT_SCHEMAS_DESCRIPTION =
  'Lists payout schema metadata from GET /public-api/v1/metadata/payout-schemas (cached), enriched for create_incentive. ' +
  'Includes enums, payout_term_dto.schemes (per PayoutScheme), plus reward_types[] with create_payload_example for: fixed-reward, variable-reward, proportional-pool, leaderboard. ' +
  'Top-level create_incentive_payload_guide documents body shape and webapp encode.ts mappers. Call before create_incentive. Params: {}.';

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

export const GET_INCENTIVE_STATS_DESCRIPTION =
  'Per-incentive performance snapshot: unique_active_users, total_volume, revenue, total_earnings (multi-currency), vs project median, and WoW/MoM deltas. ' +
  'GET /api/v1/projects/:projectId/incentives/:conversionId/stats. dateRange: 7d|30d|90d|MTD|QTD|custom|all (custom needs dateFrom+dateTo). ' +
  'Use with get_project_incentives_breakdown to rank incentives; use get_incentive_history for time-series. ' +
  'Example: {"project_id":"<uuid>","conversion_id":"<uuid>","dateRange":"30d"}.';

export const GET_PROJECT_INCENTIVES_BREAKDOWN_DESCRIPTION =
  'Ranks all project incentives by a metric with metric_vs_median and WoW/MoM deltas on the sorted metric. ' +
  'GET /api/v1/projects/:projectId/incentives/breakdown. sortBy: unique_users|volume|earnings|revenue; sortOrder asc|desc. ' +
  'Find bottom performers: sortBy unique_users, sortOrder asc. Compare month-over-month: dateRange MTD. ' +
  'Example: {"project_id":"<uuid>","dateRange":"30d","sortBy":"volume","sortOrder":"desc"}.';

export const GET_INCENTIVE_HISTORY_DESCRIPTION =
  'Time-series per incentive (daily|weekly|monthly buckets): unique_users, volume, earnings, revenue per bucket. ' +
  'GET /api/v1/projects/:projectId/incentives/:conversionId/history. Requires bounded range: dateFrom+dateTo or preset 7d/30d/90d/MTD/QTD/custom. ' +
  'Detect boost decay, flat activity, or near-zero impact before removing an incentive. ' +
  'Example: {"project_id":"<uuid>","conversion_id":"<uuid>","granularity":"weekly","dateFrom":"2026-04-01","dateTo":"2026-05-31"}.';

export const GET_TRIGGER_DESCRIPTION =
  'Gets one trigger row by UUID: GET /api/v1/projects/:projectId/triggers/:triggerId. Returns whichever row that UUID points to (draft or published copy). ' +
  'Does not resolve project.metadata_id. Prefer get_project or get_incentive triggers[] for draft_trigger_id vs published_trigger_id by ref. ' +
  'Example: {"project_id":"<uuid>","trigger_id":"<uuid>"}.';

export const UPDATE_PAYOUT_TERM_DESCRIPTION =
  'Updates one payout term on a draft conversion: PATCH /api/v1/projects/:projectId/conversions/:conversionId/payout_terms/:payoutTermId. ' +
  'Body is a single PayoutTermDto (use get_incentive, edit fields such as referral_amount / referrer_amount, send as payout_term). ' +
  'For variable rewards, the server expects referral_amount_percentage / referrer_amount_percentage; this tool maps GET aliases automatically (same as the dashboard). ' +
  'Per-unit rewards: edit referral_amount and referrer_amount; do not send zero percentages. dry_run shows the normalized body sent to the API. ' +
  'Example dry_run: {"project_id":"<uuid>","conversion_id":"<uuid>","payout_term_id":"<uuid>","payout_term":{...},"dry_run":true}.' +
  DRAFT_ID_RESOLUTION_BEFORE_WRITE_NOTE +
  PUBLISH_METADATA_AFTER_WRITE_NOTE;

export const UPDATE_PROJECT_TIER_DESCRIPTION =
  'Updates a project affiliate tier: PATCH /api/v1/projects/:projectId/tiers/:tierId. Optional fields: name, description, rank, audience_id (null clears audience). ' +
  'At least one field required. dry_run then confirmed. Example: {"project_id":"<uuid>","tier_id":"<uuid>","rank":2,"dry_run":true}.';

export const UPDATE_AUDIENCE_DESCRIPTION =
  'Updates an audience (user list): PATCH /api/v1/projects/:projectId/audiences/:audienceId. Body matches CreateOrUpdateAudienceDto: name (required), optional conditions[] (signature + parameters), condition_match_mode "any"|"all" (required if conditions non-empty), contractId. ' +
  'dry_run then confirmed. Example dry_run: {"project_id":"<uuid>","audience_id":"<uuid>","name":"VIP","dry_run":true}.';

export const CREATE_TRIGGER_DESCRIPTION =
  'Creates a draft trigger: POST /api/v1/projects/:projectId/triggers. Body matches CreateTriggerDto (fuul-webapp triggersService.create / encodeByTriggerType). ' +
  'REQUIRED: call list_trigger_types first; use trigger_types[].id as trigger.type and follow create_payload_layout for that id. ' +
  'Layouts: (1) flat_dto — types custom/classic: put context_json_schema fields at trigger ROOT (signature, event_type, expressions, payable, end_user_identifier_property, contract_ids), NOT nested only in context. ' +
  '(2) context_only — token-holder, liquidity-pool-v2: fields only under trigger.context. ' +
  '(3) context_and_root_fields — most presets: fields under trigger.context plus end_user_identifier_property at root when needed. ' +
  'Use create_payload_example from list_trigger_types when present. Call list_chains for chain_id. dry_run then confirmed. ' +
  'Token-holder price reference (CRITICAL): context.volume_currency_expression prices held balance. Before create_trigger for token-holder / liquidity-pool-v2 / balancer / solana-token-holder / fogo-token-holder: call list_price_references for the chain. ' +
  'If token_address is in that list → volume_currency_expression = token_address. If NOT listed → ask user stablecoin vs variable-price and decimals (6/18), then set volume_currency_expression to a listed reference with matching decimals (e.g. 18-decimal stablecoin on Ethereum → DAI 0x6b175474e89094c44da98b954eedeac495271d0f). ' +
  'Using an unlisted token address causes HTTP 201 but broken volume at runtime. ' +
  'Token-holder example (known asset): {"name":"Hold DAI","description":"...","type":"token-holder","context":{"token_address":"0x6b175474e89094c44da98b954eedeac495271d0f","chain_id":1,"volume_currency_expression":"0x6b175474e89094c44da98b954eedeac495271d0f"}}. ' +
  'Token-holder example (unknown 18d stablecoin): token 0xa3931d71877C0E7a3148CB7Eb4463524FEc27fbD → volume_currency_expression 0x6b175474e89094c44da98b954eedeac495271d0f (DAI). ' +
  'Custom off-chain: {"name":"...","description":"...","type":"custom","signature":"event_name","event_type":"off-chain-event","end_user_identifier_property":"address","payable":true,...expressions at root}.' +
  PUBLISH_METADATA_AFTER_WRITE_NOTE;

const REPLACE_TRIGGER_TOKEN_FLOW =
  'Replace-trigger flow (token/chain change; after telling the user update_trigger cannot change token_address/chain_id): ' +
  '(1) get_project or list_incentives — list every incentive/conversion whose triggers[] includes this draft_trigger_id; ' +
  '(2) delete_conversion for each draft_conversion_id (removes conversion + trigger links); ' +
  '(3) delete_trigger; ' +
  '(4) create_trigger with the new context; ' +
  '(5) create_incentive if the program must be recreated. ' +
  'Do not call delete_trigger until step 2 is done for all linked conversions.';

export const DELETE_TRIGGER_DESCRIPTION =
  'Deletes a draft trigger: DELETE /api/v1/projects/:projectId/triggers/:triggerId. Pass draft_trigger_id or a published_trigger_id (post-publish remap). ' +
  'Requires dry_run then confirmed. Never call without explicit user approval. ' +
  'Before delete: ensure no incentives still link this trigger (delete_incentive first). ' +
  REPLACE_TRIGGER_TOKEN_FLOW +
  ' If delete still returns HTTP 422, report remaining links and stop — do not retry delete_trigger blindly.' +
  DRAFT_ID_RESOLUTION_BEFORE_WRITE_NOTE +
  PUBLISH_METADATA_AFTER_WRITE_NOTE;

export const CREATE_INCENTIVE_DESCRIPTION =
  'Creates a draft incentive (conversion): POST /api/v1/projects/:projectId/incentives. Body: name, trigger_ids[] (draft or published trigger UUIDs — resolved to current draft), payout_terms[] (PayoutTermDto, min 1 each). ' +
  'REQUIRED: list_payout_schemas first — pick reward_types[].id (fixed-reward | variable-reward | proportional-pool | leaderboard) and use create_payload_example. ' +
  'Schemes on wire: pay-per-attribution (fixed/variable), pool, rank. type: point | onchain-currency. payee_type: affiliate | end-user | both. ' +
  'Fixed: calculation_strategy fixed, referrer_amount/referral_amount. Variable: calculation_strategy variable, trigger_amount_source, base_currency, *_amount_percentage. ' +
  'Pool: scheme pool, amount_source, pool_amount, pool_duration, pool_calculation_day_cron. Leaderboard: scheme rank, rank_scheme_config.ranks, pool window fields. ' +
  'MCP normalizes variable terms (referral_amount → referral_amount_percentage). dry_run then confirmed.' +
  DRAFT_ID_RESOLUTION_BEFORE_WRITE_NOTE +
  PUBLISH_METADATA_AFTER_WRITE_NOTE;

export const DELETE_CONVERSION_DESCRIPTION =
  'Deletes a draft conversion (incentive): DELETE /api/v1/projects/:projectId/incentives/:conversionId. Use draft_conversion_id from list_incentives or get_project conversions[]. ' +
  'Soft-deletes the conversion, its payout terms, and conversion_triggers links so delete_trigger can succeed. dry_run then confirmed. ' +
  'Required before delete_trigger when replacing a trigger (token/chain change). Prefer this tool over delete_incentive in that flow.';

export const DELETE_INCENTIVE_DESCRIPTION =
  'Deletes a draft incentive (conversion): DELETE /api/v1/projects/:projectId/incentives/:conversionId. Same API as delete_conversion. ' +
  'Use draft_conversion_id from list_incentives or get_project conversions[]. dry_run then confirmed. ' +
  'When replacing a trigger, use delete_conversion (step 2 of the replace flow) before delete_trigger.' +
  DRAFT_ID_RESOLUTION_BEFORE_WRITE_NOTE +
  PUBLISH_METADATA_AFTER_WRITE_NOTE;

export const UPDATE_TRIGGER_DESCRIPTION =
  'Updates a trigger: PATCH /api/v1/projects/:projectId/triggers/:triggerId. Partial body matching UpdateTriggerDto (name, description, event_type, expressions, payable, ref, contract_ids as single-element array, etc.). ' +
  'Does NOT update context fields such as token_address or chain_id — those are immutable after create. ' +
  'If the user asks to change token_address, chain_id, or the tracked token/contract: do NOT call PATCH. First inform the user clearly: "This cannot be updated in place; you must delete the trigger and create a new one with the new token/chain." ' +
  'Then, only with explicit user approval, run the replace flow: ' +
  REPLACE_TRIGGER_TOKEN_FLOW +
  ' Never skip step 1 — always list linked conversions before delete_trigger. ' +
  'At least one patch field required for allowed fields only. dry_run then confirmed. Prefer get_project for current draft_trigger_id by ref.' +
  DRAFT_ID_RESOLUTION_BEFORE_WRITE_NOTE +
  PUBLISH_METADATA_AFTER_WRITE_NOTE;

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

export const DELETE_USER_REFERRER_DESCRIPTION =
  'Remove user_referrers row: DELETE /api/v1/user-referrers?user_identifier=&user_identifier_type=. Automatically deletes orphaned referral_code_uses (stale redemptions that no longer match the current UR) and decrements actual_uses. If the user has matching referral code redemptions, API returns 422 unless force=true (deletes all uses + UR). Maps 422 "User referrer relationship not found" to {already_removed:true} for idempotent retries. Requires service_role project API key.' +
  PROJECT_API_KEY_HINT +
  ' dry_run then confirmed. Example dry_run: {"user_identifier":"0xUser...","user_identifier_type":"evm_address","force":true,"dry_run":true}.';

export const USE_REFERRAL_CODE_DESCRIPTION =
  'Redeem a referral code for a user: PATCH /api/v1/referral_codes/:code/use. Creates referral_code_uses, increments actual_uses, sets user_referrers with source=code_redemption (GET /referral_codes/status → referred:true). Referrer is the code owner (do not pass referrer_identifier). Requires user has no existing referrer unless service_role idempotent replay of the same code. No wallet signature with service_role.' +
  PROJECT_API_KEY_HINT +
  ' dry_run then confirmed. Example dry_run: {"referral_code":"PROMO2024","user_identifier":"0xUser...","user_identifier_type":"evm_address","dry_run":true}.';

export const REMOVE_USER_FROM_REFERRAL_CODE_DESCRIPTION =
  'Remove a user from a referral code: DELETE /api/v1/referral_codes/:code/referrals. Atomically deletes user_referrers + referral_code_uses and decrements actual_uses. Not idempotent on the API; this tool maps known 422 cases to {"already_removed":true,"reason":"..."} for safe retries. Requires service_role project API key (no wallet signature).' +
  PROJECT_API_KEY_HINT +
  ' dry_run then confirmed. Example dry_run: {"referral_code":"PROMO2024","user_identifier":"0xUser...","user_identifier_type":"evm_address","referrer_identifier":"0xKol...","referrer_identifier_type":"evm_address","dry_run":true}.';

export const SWAP_USER_REFERRAL_CODE_DESCRIPTION =
  'Move a user between referral codes with full redemption semantics: DELETE from from_referral_code then PATCH /api/v1/referral_codes/:to_referral_code/use (not atomic). Step 1 tolerates already-removed 422s (e.g. user never had a prior code). Step 2 assigns to the owner of to_referral_code — there are no to_referrer_* params. If PATCH /use fails after DELETE, response has partial:true with use_error; complete with use_referral_code or update_user_referrer. Legacy PUT-only users (user_referrers without referral_code_use) may block step 2 with "User already has a referrer" — clear with delete_user_referrer first when appropriate. For first assign with no prior code, use use_referral_code directly. Requires service_role project API key.' +
  PROJECT_API_KEY_HINT +
  ' dry_run then confirmed. Example dry_run: {"user_identifier":"0xUser...","user_identifier_type":"evm_address","from_referral_code":"OLD","from_referrer_identifier":"0xOldKol...","from_referrer_identifier_type":"evm_address","to_referral_code":"NEW","dry_run":true}.';
