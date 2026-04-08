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

export const CREATE_INCENTIVE_PROGRAM_DESCRIPTION =
  'Creates an incentive (conversion + payout terms): POST /api/v1/projects/:projectId/incentives with body {name, trigger_ids, payout_terms}. ' +
  'Mandatory flow: first call with dry_run:true (validates trigger types against list_trigger_types schema_status; must be "present"). ' +
  'Second call with confirmed:true executes POST. payout_terms must match server PayoutTermDto. ' +
  'Example dry_run: {"project_id":"<uuid>","name":"Summer","trigger_ids":["<trigger-uuid>"],"payout_terms":[{...}],"dry_run":true}.';

export const UPDATE_INCENTIVE_PROGRAM_DESCRIPTION =
  'Updates an incentive: PATCH /api/v1/projects/:projectId/incentives/:conversionId with same body shape as create. Use dry_run then confirmed like create_incentive_program. ' +
  'Example: add conversion_id and same fields as create.';

export const LIST_PAYOUTS_PENDING_APPROVAL_DESCRIPTION =
  'Lists payouts pending approval: GET /api/v1/projects/:projectId/payouts/pending-approval. Optional page, page_size. Example: {"project_id":"<uuid>","page":1,"page_size":50}.';

export const LIST_REWARDS_PAYOUTS_DESCRIPTION =
  'Lists rewards payouts history: GET /api/v1/projects/:projectId/payouts/rewards-payouts. Optional page, page_size, status, from_date, to_date. Example: {"project_id":"<uuid>","page":1}.';

export const APPROVE_PAYOUTS_DESCRIPTION =
  'Approves payouts: PATCH /api/v1/projects/:projectId/payouts/approve. Body: payout_ids OR date filters (server validates mutual exclusivity). dry_run then confirmed. Example dry_run: {"project_id":"<uuid>","payout_ids":["<uuid>"],"dry_run":true}.';

export const REJECT_PAYOUTS_DESCRIPTION = 'Rejects payouts: PATCH /api/v1/projects/:projectId/payouts/reject. Same body rules as approve_payouts.';
