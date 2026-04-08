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
