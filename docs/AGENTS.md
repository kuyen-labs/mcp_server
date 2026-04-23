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
| `get_project` | `GET /api/v1/projects/:projectId` | Bearer |
| `list_incentives` | `GET /api/v1/projects/:projectId/incentives` | Bearer |
| `get_incentive` | `GET /api/v1/projects/:projectId/incentives/:conversionId` | Bearer |
| `get_trigger` | `GET /api/v1/projects/:projectId/triggers/:triggerId` | Bearer |
| `get_affiliate_portal_stats` | `GET /api/v1/projects/:projectId/affiliate-portal/stats` | Bearer |
| `get_project_affiliate_total_stats` | `GET /api/v1/projects/:projectId/affiliate-portal/total-stats` | Bearer |
| `get_project_affiliates_breakdown` | `GET /api/v1/projects/:projectId/affiliate-portal/global-breakdown` | Bearer |
| `create_incentive_program` | `POST /api/v1/projects/:projectId/incentives` | Bearer + dry_run / confirmed |
| `update_incentive_program` | `PATCH /api/v1/projects/:projectId/incentives/:conversionId` | Bearer + dry_run / confirmed |
| `list_payouts_pending_approval` | `GET .../payouts/pending-approval` | Bearer |
| `list_rewards_payouts` | `GET .../payouts/rewards-payouts` | Bearer |
| `approve_payouts` | `PATCH .../payouts/approve` | Bearer + dry_run / confirmed |
| `reject_payouts` | `PATCH .../payouts/reject` | Bearer + dry_run / confirmed |

CLI (`login`, `whoami`, `logout`) shares the same API origin and token file.

## Writes

All mutation tools require **`dry_run: true`** first (validation / preview) then **`confirmed: true`** to execute. Implementation: `src/agent/write-confirmation.ts`.  
`create_incentive_program` / `update_incentive_program` also enforce **trigger `schema_status === "present"`** from `list_trigger_types` (Phase 1 metadata policy).

## Pagination / cursors

Project list uses **`page`** (1-based) and optional **`query`**, matching the dashboard API today. Cursor-based pagination is not exposed by the API yet; this server forwards supported query params only.

## Environment

| Variable | Notes |
| --- | --- |
| `FUUL_API_BASE_URL` | API **origin** only. Staging: `https://api.stg.fuul.xyz`. Production: `https://api.fuul.xyz`. |
| `FUUL_MCP_TOOL_TIMEOUT_MS` | Per-tool timeout (default `90000`). |

## Server expectations

- JWT session after `fuul-mcp login` (Agent OAuth on fuul-server + app host).
- Metadata routes above and project/incentive/payout routes on the same API version as the dashboard you target.

## Further docs

- [mcp-phase2/tool-prompts.md](./mcp-phase2/tool-prompts.md) — sample prompts for LLM evals.
- [mcp-phase2/CONSUMER.md](./mcp-phase2/CONSUMER.md) — URLs and version notes.
