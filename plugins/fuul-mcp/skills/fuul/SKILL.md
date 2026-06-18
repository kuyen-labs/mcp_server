---
description: Use Fuul MCP tools for projects, affiliate analytics, incentives, payouts, events, and metadata; includes draft vs published trigger IDs (ref), login, and dry_run/confirmed write flow
---

# Fuul MCP

You have access to the **Fuul** Model Context Protocol server (`fuul` in the toolkit). Most tools use the same **JWT session** as the web app after `fuul-mcp login`. **Project API key** tools (managed affiliates and conversion events) use **`FUUL_MCP_PROJECT_API_KEY`** or per-call **`project_api_key`** — not the login JWT.

## Before calling API tools

1. **OAuth is not an MCP tool.** If `whoami` fails or API tools return 401, the user must sign in once in a terminal:

   ```bash
   npx -y --package=@fuul/mcp-server@latest fuul-mcp login
   ```

   Tokens are stored in `~/.fuul/tokens.json` (Windows: `%USERPROFILE%\.fuul\tokens.json`). The MCP process reads the same file.

2. **API base URL** is usually production (`https://api.fuul.xyz`). For staging, the user sets `FUUL_API_BASE_URL` in the Claude Code plugin settings (or a local `.env` when developing from a clone).

3. **Rate limits:** On HTTP 429, wait for `Retry-After` when present, then retry.

4. **Project API key:** For managed affiliates (`get_project_affiliate_public`, `create_project_affiliate_public`, `update_project_affiliate_public`) and **Events** (`send_event`, `send_batch_events`, `check_event_status`), set **`FUUL_MCP_PROJECT_API_KEY`** or pass **`project_api_key`** on each call. Without it, those tools return a clear configuration error.

## Tool map (quick)

| Area | Tools |
| --- | --- |
| Health | `ping` (no auth), `whoami` (session) |
| Metadata (cached) | `list_chains`, `list_trigger_types`, `list_payout_schemas` |
| Price references | `list_price_references` (before token-holder `create_trigger` when token may be unlisted) |
| Projects / programs | `list_projects`, `get_project`, `list_incentives`, `get_incentive`, `get_trigger`, `create_trigger`, `delete_trigger`, `update_trigger`, `create_incentive`, `delete_incentive`, `update_payout_term`, `update_incentive_triggers`, `list_audiences`, `list_project_tiers`, `create_project_tier`, `update_project_tier`, `update_audience` |
| Affiliate analytics | `get_affiliate_portal_stats`, `get_project_affiliate_total_stats`, `get_project_affiliates_breakdown` |
| Managed affiliates (project API key) | `get_project_affiliate_public`, `create_project_affiliate_public`, `update_project_affiliate_public` |
| Events (project API key) | `send_event`, `send_batch_events`, `check_event_status` |
| Payout reads | `list_payouts_pending_approval`, `list_rewards_payouts` |
| Writes | `create_trigger`, `delete_trigger`, `update_trigger`, `create_incentive`, `delete_incentive`, `update_payout_term`, `approve_payouts`, `reject_payouts`, `create_project_affiliate_public`, `update_project_affiliate_public`, `send_event`, `send_batch_events` |

Full HTTP map: repository `docs/AGENTS.md`.

## Draft vs published (triggers and incentives)

Fuul separates **draft** metadata (dashboard edits) from **published** metadata (`project.metadata_id` in the DB). On publish, triggers are **cloned with new UUIDs**; **`ref` is the stable key** across versions.

| Scope | HTTP | MCP tools |
| --- | --- | --- |
| Draft triggers | `GET /api/v1/projects/:id` → `triggers[]` | `get_project`, incentives |
| Published triggers | `GET /api/v1/projects/:id/customizations` → `project.triggers[]` | same (merged in MCP) |
| Draft incentives | `GET .../incentives` | `list_incentives`, `get_incentive` |
| Published incentives | no list API yet | `published_conversion_id` is always `null` for now |

**Always invoke this skill section** before comparing trigger UUIDs from `get_project` / incentives with SQL on `project.metadata_id` or calling `get_trigger` with an ID from the wrong scope.

### Scoped `triggers[]` shape

`get_project`, `list_incentives`, and `get_incentive` each call **two** APIs and return merged rows:

```json
{
  "ref": "my-trigger-ref",
  "signature": "event_name",
  "draft_trigger_id": "uuid-or-null",
  "published_trigger_id": "uuid-or-null",
  "draft": { },
  "published": { "id", "name", "ref", "signature", "trigger_ui_settings" }
}
```

| Field | Use for |
| --- | --- |
| `draft_trigger_id` | `update_trigger`, `delete_trigger`, `create_incentive` trigger_ids, `get_trigger` when inspecting draft |
| `published_trigger_id` | live/prod config, SQL on published metadata — match by **`ref`**, not draft UUID |
| `ref` | correlate draft ↔ published when UUIDs differ after publish |

### Tool rules

- **`get_project`** — `triggers[]` is merged; `conversions[]` items include the same scoped `triggers[]` and `published_conversion_id: null`.
- **`list_incentives` / `get_incentive`** — each item: `draft_conversion_id`, `published_conversion_id: null`, scoped `triggers[]`. `conversion_id` on `get_incentive` is the **draft** conversion UUID.
- **`get_trigger`** — unchanged proxy: returns the row for the UUID you pass. It does **not** resolve `metadata_id`. Do not treat a draft UUID as the published row (or vice versa).

### Common mistake (invalid bug report)

Comparing `trigger_id` from draft `get_project` with a row in published metadata without matching **`ref`** looks like “wrong trigger” but is **scope mixing**. `get_trigger` is correct for the UUID requested.

## Writes: always `dry_run` then `confirmed`

For `create_trigger`, `delete_trigger`, `update_trigger`, `create_incentive`, `delete_incentive`, `update_payout_term`, `approve_payouts`, `reject_payouts`, `create_project_affiliate_public`, `update_project_affiliate_public`, `send_event`, `send_batch_events`:

1. Call with **`dry_run: true`** — validate and return a preview; no mutation.
2. Show the user the preview; on approval, call again with **`confirmed: true`** (same payload shape where applicable).

Before `create_trigger` / `create_incentive`, call `list_trigger_types` (and `list_chains` / `list_payout_schemas` as needed) and collect all required fields from the user.

## Token-holder price reference (before `create_trigger`)

For `token-holder`, `liquidity-pool-v2`, `balancer`, `solana-token-holder`, `fogo-token-holder`:

1. `list_price_references` with the chain (`chain_identifier` from `list_chains`, e.g. `ethereum`).
2. If `token_address` is in `results[].identifier` (EVM: case-insensitive) → `volume_currency_expression` = `token_address`.
3. If **not** listed → ask the user: stablecoin or variable-price? Decimals (6 or 18)? Pick a reference from `results` with matching decimals (e.g. 18-decimal stablecoin on Ethereum → DAI `0x6b175474e89094c44da98b954eedeac495271d0f`).
4. `create_trigger` with that `volume_currency_expression`. Wrong value → HTTP 201 but trigger never prices volume correctly.

## Replace token on a token-holder trigger

The dashboard cannot change `context.token_address` after create; neither can `update_trigger`. Follow this playbook:

1. `get_trigger` or `get_project` — read current `context` (token_address, chain_id, volume_currency_expression).
2. Tell the user the token is not editable in place. Ask whether they want to **delete the old trigger** and create a new one, or **only create a new trigger**.
3. **Never** call `delete_trigger` without explicit user approval.
4. If deleting: `list_incentives` → for each incentive using this `draft_trigger_id`, `delete_incentive` (dry_run → confirmed) → then `delete_trigger` (dry_run → confirmed).
5. `list_price_references` if needed, then `create_trigger` with the new `context.token_address` and correct `volume_currency_expression` (see **Token-holder price reference**).
6. If `delete_trigger` fails with HTTP 422 (trigger still linked): explain that incentives must be removed first, **or** skip delete and only `create_trigger` the new token tracker; user can re-link incentives manually.

Do not “fix” a wrong token by PATCHing only `currency_expression` / `volume_currency_expression` — that leaves `contracts[].address` and `context.token_address` unchanged.

## Tiered audience boost (tiers + audiences + payout groups)

**Canonical source:** call `list_payout_schemas` and read `create_incentive_payload_guide.tiered_audience_boost_playbook` (wire format aligned with fuul-webapp `encode.ts` / fuul-server `PayoutGroupDto`). Do not invent alternate field names.

| Layer | Role | Key fields |
| --- | --- | --- |
| Audience | User segment (conditions only) | `name`, `conditions` |
| Project tier | Ranked audience → priority (rank 1 = highest) | `name`, `slug`, `rank`, `audience_id` |
| Payout group | Reward row on incentive term | `project_tier_id`, `end_user_amount_percentage`, cap booleans |

### Checklist

| Step | Tool | Verify |
| --- | --- | --- |
| 1. Resolve segments | `list_audiences` | Audience UUIDs for each boosted segment |
| 2. Ensure tiers | `list_project_tiers` or `create_project_tier` | One tier per boost; `rank` above Default Tier; note `project_tier_id` |
| 3. Build payout term | `get_incentive` (patch) or `create_incentive` | `tier_type: "audience"`; amounts in `payout_groups[]` only; **`project_tier_id`** on boost groups (not `audience_id`); default rate = group without `project_tier_id` |
| 4. Preview | `dry_run: true` on write | `body`, `_warnings`, `_validation_errors`, `_amount_rounding` |
| 5. Execute | `confirmed: true` after user OK | `_publish_metadata_reminder` |
| 6. Read back | `get_incentive` | Each group has `project_tier` populated; follow `_readback_reminder` |

**Gotchas:** see `tiered_audience_boost_playbook.gotchas` in `list_payout_schemas` — especially `project_tier_id` not `audience_id`, no multiplier, preserve `base_currency`, dry_run ≠ done without `get_incentive` readback, tiers live / incentive edits draft until publish.

## Proportional pool payout (scheme pool)

**Canonical source:** call `list_payout_schemas` and read `create_incentive_payload_guide.pool_payout_playbook`. `get_incentive` attaches `_pool_capability_boundary` when any payout term uses `scheme: pool`.

| Concept | Rule |
| --- | --- |
| `pool_amount` | **Fixed per cycle** — not derived from network volume |
| Distribution | Pro-rata by volume/revenue share × fixed `pool_amount` each cycle |
| `pool_distribution_mode` | `linear` or `square_root` only — square_root is NOT dynamic pool sizing |
| Unsupported | Dynamic / volume-banded pools, `payee_type: both`, `amount_source: attribution-count` |

### Checklist

| Step | Tool | Verify |
| --- | --- | --- |
| 1. Load boundaries | `list_payout_schemas` or `get_incentive` | Read `pool_payout_playbook` or `_pool_capability_boundary` |
| 2. Inspect term | `get_incentive` | `draft.payout_terms[]` with `scheme: pool` |
| 3. Propose changes | analysis / `update_payout_term` | Only `editable_fields`; never suggest unsupported capabilities as PATCH |
| 4. Preview | `dry_run: true` | `_warnings`, `_validation_errors` |
| 5. Execute | `confirmed: true` | `_publish_metadata_reminder` |
| 6. Read back | `get_incentive` | Pool fields + `_pool_capability_boundary` |

**Gotchas:** see `pool_payout_playbook.gotchas` — especially `pool_duration` in hours, fixed `pool_amount`, no dynamic/volume-banded pools.

## Events (conversion tracking)

- **`send_event`**: one real-time conversion event. Required: `name`, `user_identifier`, `user_identifier_type`, `dedup_id`. Optional: `args`, `timestamp`. Duplicate `dedup_id` → HTTP 409. Rate limit 100/min.
- **`send_batch_events`**: up to 100 events; atomic batch. Duplicate `dedup_id` values are skipped silently; response includes `ingested_events`. Rate limit 10/min.
- **`check_event_status`**: default → `GET /api/v1/events/status` with `user_identifier`, `user_identifier_type`, `event_name` → `{ "created": true|false }`. **`verbose: true`** → `GET /api/v1/events/pipeline` with `event_id` **or** `dedup_id` + `event_name` (same as `send_event`); returns trigger executions, attributions, payouts, movements, and `status_details` per stage. Poll every 2–5s after `send_event` until the pipeline completes. `404` → `{ "created": false }`.

Use `check_event_status` before resending to avoid 409 on single send. After a successful `send_event`, use `verbose: true` with the same `dedup_id` and `name` to verify rewards.

## Affiliate analytics

- **`get_affiliate_portal_stats`**: one affiliate; needs `project_id` and encoded `user_identifier` (e.g. `evm:0x...`).
- **`get_project_affiliate_total_stats`**: project totals; optional `dateRange` (`7d`, `30d`, `90d`, `MTD`, `QTD`, `custom`, `all`) and filters.
- **`get_project_affiliates_breakdown`**: **`groupBy`** required — `audience` \| `tier` \| `region` \| `status`; optional sort and date filters.

## Example prompts

- List projects: `list_projects` with `{"page":1}`.
- List chains / trigger types / payout schemas for building programs.
- Draft a new incentive: `create_incentive` with `dry_run: true` first.
- Change token holder contract: see **Replace token on a token-holder trigger** above.
- Approve pending payouts for a project: `approve_payouts` with `dry_run: true`, then `confirmed: true`.

See `docs/mcp-phase2/tool-prompts.md` for more sample utterances.
