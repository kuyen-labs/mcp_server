# Sample prompts (tool descriptions)

Use in Cursor or eval harnesses to check tool selection and JSON arguments.  
Documentation index: [docs/README.md](../README.md).

## Metadata

- List chains supported for incentives (tool: `list_chains`, input `{}`).
- Show trigger types and their `schema_status` (`list_trigger_types`).
- Show payout schema metadata (`list_payout_schemas`).

## Projects & incentives

- List my projects page 1 (`list_projects` with `{"page":1}`).
- Load project `<uuid>` (`get_project`).
- List incentives for project `<uuid>` (`list_incentives`).
- Get incentive details for conversion `<uuid>` (`get_incentive`).
- Inspect trigger `<uuid>` under project `<uuid>` (`get_trigger`).

## Writes (two-step)

- Create incentive: first `create_incentive_program` with `dry_run:true`, full body; then same payload with `confirmed:true`.
- Update incentive: `update_incentive_program` with `conversion_id` + same pattern.
- Approve payouts: `approve_payouts` with `payout_ids` or date filters; dry_run then confirmed.
- Reject payouts: `reject_payouts` same as approve.

## Affiliate analytics (read)

- Affiliate stats for one `user_identifier` (`get_affiliate_portal_stats` with `project_id` + identifier string).
- Project-wide totals (`get_project_affiliate_total_stats`; optional `dateRange`, filters).
- Global breakdown by audience/tier/region/status (`get_project_affiliates_breakdown`; `groupBy` required).

## Payouts (read)

- Pending approval payouts for project (`list_payouts_pending_approval`).
- Rewards payout history (`list_rewards_payouts`).

## Rate limits

- After HTTP 429, error text should mention backing off and `Retry-After` when the API sends it.
