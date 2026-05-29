# MCP server — maintainer reference

Single map for tools ↔ HTTP, env, and write conventions. Documentation index: [docs/README.md](./README.md). End-user setup: root [README.md](../README.md).

## Tools → HTTP

| Tool | Method / path | Auth |
| --- | --- | --- |
| `ping` | — | — |
| `whoami` | `GET /api/v1/auth/user` | Bearer |
| `list_chains` | `GET /public-api/v1/metadata/chains` | Bearer |
| `list_trigger_types` | `GET /public-api/v1/metadata/trigger-types` | Bearer |
| `list_payout_schemas` | `GET /public-api/v1/metadata/payout-schemas` | Bearer |
| `list_projects` | `GET /api/v1/projects` (`?page`, `?query`) | Bearer |
| `get_project` | `GET .../projects/:id` + `GET .../customizations` (merge triggers by `ref`) | Bearer |
| `list_incentives` | `GET .../incentives` + `GET .../customizations` (+ project for triggers) | Bearer |
| `get_incentive` | `GET .../incentives/:id` + `GET .../customizations` (+ project) | Bearer |
| `get_trigger` | `GET .../triggers/:triggerId` (single row; no scope merge) | Bearer |
| `create_trigger` | `POST .../triggers` | Bearer + dry_run / confirmed |
| `delete_trigger` | `DELETE .../triggers/:triggerId` | Bearer + dry_run / confirmed |
| `update_trigger` | `PATCH .../triggers/:triggerId` | Bearer + dry_run / confirmed |
| `create_incentive` | `POST .../incentives` | Bearer + dry_run / confirmed |
| `delete_incentive` | `DELETE .../incentives/:conversionId` | Bearer + dry_run / confirmed |
| `update_payout_term` | `PATCH .../conversions/:conversionId/payout_terms/:payoutTermId` | Bearer + dry_run / confirmed |
| `get_affiliate_portal_stats` | `GET /api/v1/projects/:projectId/affiliate-portal/stats` | Bearer |
| `get_project_affiliate_total_stats` | `GET /api/v1/projects/:projectId/affiliate-portal/total-stats` | Bearer |
| `get_project_affiliates_breakdown` | `GET /api/v1/projects/:projectId/affiliate-portal/global-breakdown` | Bearer |
| `get_project_affiliate_public` | `GET /api/v1/project-affiliates/:projectAffiliateId` | **Project API key** Bearer (not dashboard JWT; see below) |
| `create_project_affiliate_public` | `POST /api/v1/project-affiliates` | Project API key Bearer + dry_run / confirmed |
| `update_project_affiliate_public` | `PATCH /api/v1/project-affiliates/:projectAffiliateId` | Project API key Bearer + dry_run / confirmed |
| `send_event` | `POST /api/v1/events` | Project API key Bearer + dry_run / confirmed |
| `send_batch_events` | `POST /api/v1/events/batch` | Project API key Bearer + dry_run / confirmed |
| `check_event_status` | `GET /api/v1/events/status` (default) or `GET /api/v1/events/pipeline` when `verbose=true` | Project API key Bearer |
| `get_user_referrer` | `GET /api/v1/user/referrer` | Project API key Bearer |
| `update_user_referrer` | `PUT /api/v1/user-referrers` | Project API key Bearer (`service_role`) + dry_run / confirmed |
| `delete_user_referrer` | `DELETE /api/v1/user-referrers?user_identifier=&user_identifier_type=` | Project API key Bearer (`service_role`) + dry_run / confirmed |
| `use_referral_code` | `PATCH /api/v1/referral_codes/:code/use` | Project API key Bearer (`service_role`) + dry_run / confirmed |
| `remove_user_from_referral_code` | `DELETE /api/v1/referral_codes/:code/referrals` | Project API key Bearer (`service_role`) + dry_run / confirmed |
| `swap_user_referral_code` | DELETE + PATCH /use (composed) | Project API key Bearer (`service_role`) + dry_run / confirmed |
| `list_payouts_pending_approval` | `GET .../payouts/pending-approval` | Bearer |
| `list_rewards_payouts` | `GET .../payouts/rewards-payouts` | Bearer |
| `approve_payouts` | `PATCH .../payouts/approve` | Bearer + dry_run / confirmed |
| `reject_payouts` | `PATCH .../payouts/reject` | Bearer + dry_run / confirmed |

CLI (`login`, `whoami`, `logout`) shares the same API origin and token file.

## Writes

All mutation tools require **`dry_run: true`** first (validation / preview) then **`confirmed: true`** to execute. Implementation: `src/agent/write-confirmation.ts`.

**Trigger token changes:** `context.token_address` (and similar) are set only at **create** time. To change a token-holder token, use `create_trigger` and optionally `delete_trigger` after user confirmation — not `update_trigger`. If `delete_trigger` returns HTTP 422, delete linked incentives with `delete_incentive` first, or create a new trigger without deleting the old one.

## Project API key tools (public / service routes)

These tools call fuul-server routes protected by **`ApiKeyMiddleware`**: the Bearer token must be the **project API key** for the target project (same as server-side integrations). The dashboard **`fuul-mcp login` JWT is not accepted** on these paths.

Routes: `/api/v1/project-affiliates/*`, `/api/v1/events/*`, `/api/v1/user/referrer`, `/api/v1/user-referrers`, `/api/v1/referral_codes/*`.

**Referrer tools** require API key scope **`service_role`**. `remove_user_from_referral_code` and `delete_user_referrer` map known HTTP 422 “already gone” cases (`User referrer relationship not found`) to `{ already_removed: true }` for idempotent agent retries.

Resolution order: optional per-call `project_api_key` on the tool input, else env **`FUUL_MCP_PROJECT_API_KEY`**. See `src/http/project-api-key-bearer.ts`.

## Pagination / cursors

Project list uses **`page`** (1-based) and optional **`query`**, matching the dashboard API today. Cursor-based pagination is not exposed by the API yet; this server forwards supported query params only.

## Environment

| Variable | Notes |
| --- | --- |
| `FUUL_API_BASE_URL` | API **origin** only. Staging: `https://api.stg.fuul.xyz`. Production: `https://api.fuul.xyz`. |
| `FUUL_MCP_PROJECT_API_KEY` | Optional default **project** API key for project-affiliates, events, and referrer/referral-code tools. Must include `service_role` for referrer mutations. Empty string is treated as unset. |
| `FUUL_MCP_TOOL_TIMEOUT_MS` | Per-tool timeout (default `90000`). |

## Server expectations

- JWT session after `fuul-mcp login` (Agent OAuth on fuul-server + app host) for **dashboard** tools in the table marked “Bearer”.
- **Project-affiliates** tools use a **project API key** instead; configure `FUUL_MCP_PROJECT_API_KEY` or pass `project_api_key` on each call.
- Metadata routes above and project/incentive/payout routes on the same API version as the dashboard you target.

## Draft vs published

MCP merges draft and published trigger UUIDs in `get_project` / incentive reads (`draft_trigger_id`, `published_trigger_id` per `ref`). Agent-facing guide: [plugins/fuul-mcp/skills/fuul/SKILL.md](../plugins/fuul-mcp/skills/fuul/SKILL.md) § *Draft vs published*. Implementation: `src/metadata-scope/`.

## Further docs

- [mcp-phase2/tool-prompts.md](./mcp-phase2/tool-prompts.md) — sample prompts for LLM evals.
- [mcp-phase2/CONSUMER.md](./mcp-phase2/CONSUMER.md) — URLs and version notes.
