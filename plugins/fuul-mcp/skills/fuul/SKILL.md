---
description: Use Fuul MCP tools for projects, affiliate analytics, incentives, payouts, and metadata; includes login and dry_run/confirmed write flow
---

# Fuul MCP

You have access to the **Fuul** Model Context Protocol server (`fuul` in the toolkit). It talks to the Fuul dashboard API with the same JWT session as the web app.

## Before calling API tools

1. **OAuth is not an MCP tool.** If `whoami` fails or API tools return 401, the user must sign in once in a terminal:

   ```bash
   npx -y @fuul/mcp-server@latest fuul-mcp login
   ```

   Tokens are stored in `~/.fuul/tokens.json` (Windows: `%USERPROFILE%\.fuul\tokens.json`). The MCP process reads the same file.

2. **API base URL** is usually production (`https://api.fuul.xyz`). For staging, the user sets `FUUL_API_BASE_URL` in the Claude Code plugin settings (or a local `.env` when developing from a clone).

3. **Rate limits:** On HTTP 429, wait for `Retry-After` when present, then retry.

## Tool map (quick)

| Area | Tools |
| --- | --- |
| Health | `ping` (no auth), `whoami` (session) |
| Metadata (cached) | `list_chains`, `list_trigger_types`, `list_payout_schemas` |
| Projects / programs | `list_projects`, `get_project`, `list_incentives`, `get_incentive`, `get_trigger` |
| Affiliate analytics | `get_affiliate_portal_stats`, `get_project_affiliate_total_stats`, `get_project_affiliates_breakdown` |
| Payout reads | `list_payouts_pending_approval`, `list_rewards_payouts` |
| Writes | `create_incentive_program`, `update_incentive_program`, `approve_payouts`, `reject_payouts` |

Full HTTP map: repository `docs/AGENTS.md`.

## Writes: always `dry_run` then `confirmed`

For `create_incentive_program`, `update_incentive_program`, `approve_payouts`, `reject_payouts`:

1. Call with **`dry_run: true`** — validate and return a preview; no mutation.
2. Show the user the preview; on approval, call again with **`confirmed: true`** (same payload shape where applicable).

`create_incentive_program` / `update_incentive_program` require triggers with `schema_status === "present"` per `list_trigger_types`.

## Affiliate analytics

- **`get_affiliate_portal_stats`**: one affiliate; needs `project_id` and encoded `user_identifier` (e.g. `evm:0x...`).
- **`get_project_affiliate_total_stats`**: project totals; optional `dateRange` (`7d`, `30d`, `90d`, `MTD`, `QTD`, `custom`, `all`) and filters.
- **`get_project_affiliates_breakdown`**: **`groupBy`** required — `audience` \| `tier` \| `region` \| `status`; optional sort and date filters.

## Example prompts

- List projects: `list_projects` with `{"page":1}`.
- List chains / trigger types / payout schemas for building programs.
- Draft a new incentive: `create_incentive_program` with `dry_run: true` first.
- Approve pending payouts for a project: `approve_payouts` with `dry_run: true`, then `confirmed: true`.

See `docs/mcp-phase2/tool-prompts.md` for more sample utterances.
