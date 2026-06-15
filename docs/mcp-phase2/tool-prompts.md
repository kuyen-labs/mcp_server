# Sample prompts (tool descriptions)

Use in Cursor or eval harnesses to check tool selection and JSON arguments.  
Documentation index: [docs/README.md](../README.md).  
Tiered audience boost rubric: [tiered-audience-boost-eval.md](./tiered-audience-boost-eval.md).

## Metadata

- List chains supported for incentives (`list_chains`, input `{}`).
- Show trigger types and their `schema_status` (`list_trigger_types`).
- Show payout schema metadata and tiered playbook (`list_payout_schemas`).

## Projects & incentives

- List my projects page 1 (`list_projects` with `{"page":1}`).
- Load project `<uuid>` (`get_project`).
- List incentives for project `<uuid>` (`list_incentives`).
- Get incentive details for conversion `<uuid>` (`get_incentive`).
- Inspect trigger `<uuid>` under project `<uuid>` (`get_trigger`).

## Audiences & tiers (tiered boosts)

- List audiences for project `<uuid>` (`list_audiences`).
- List affiliate tiers (`list_project_tiers`; optional `include_payout_terms: true`).
- Create boost tier: `create_project_tier` with `name`, `slug`, `rank`, `audience_id`; dry_run then confirmed.
- Update tier rank or audience link (`update_project_tier`).

## Writes (two-step)

All mutations: **`dry_run: true` first**, review body / `_warnings` / `_validation_errors`, then **`confirmed: true`**.

- Create incentive: `create_incentive` with `name`, `trigger_ids[]`, `payout_terms[]`.
- Update payout term only: `update_payout_term` with `conversion_id`, `payout_term_id`, full `payout_term` body.
- Replace triggers on incentive: `update_incentive_triggers` with `trigger_ids[]` (does not change payout terms).
- Delete incentive: `delete_incentive` with `conversion_id`.
- Approve payouts: `approve_payouts` with `payout_ids` or date filters.
- Reject payouts: `reject_payouts` (same body rules as approve).

## Tiered audience boost (natural language)

See [tiered-audience-boost-eval.md](./tiered-audience-boost-eval.md) for full scenarios A–D. Short forms:

- *"On project `<uuid>`, boost audience VIP from 30% to 45% end-user on conversion `<uuid>`. MCP only; dry_run first."*
- *"Create tiered incentive: base 20%, Partners audience 30%, trigger `<uuid>`. list audiences and tiers first."*
- *"Explain tiered boosts for `<uuid>` without writing."* (read-only)

## Affiliate analytics (read)

- Affiliate stats for one `user_identifier` (`get_affiliate_portal_stats`).
- Project-wide totals (`get_project_affiliate_total_stats`; optional `dateRange`, filters).
- Global breakdown (`get_project_affiliates_breakdown`; `groupBy` required).

## Payouts (read)

- Pending approval (`list_payouts_pending_approval`).
- Rewards history (`list_rewards_payouts`).

## Rate limits

- After HTTP 429, error text should mention backing off and `Retry-After` when the API sends it.
