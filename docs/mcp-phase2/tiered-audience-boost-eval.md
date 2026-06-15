# Tiered audience boost — agent eval & regression

Phase 2 of the tiered-audience MCP work: **manual agent evals** plus **deterministic regression** in CI.  
Phase 1 shipped playbook, tools, normalization, and warnings (`list_payout_schemas` → `tiered_audience_boost_playbook`).

Related:

- [tool-prompts.md](./tool-prompts.md) — natural-language prompts
- [../AGENTS.md](../AGENTS.md) — maintainer reference
- `src/incentives/tiered-audience-boost-guide.ts` — canonical wire format

## What runs in CI vs manually

| Layer | Where | Purpose |
| ----- | ----- | ------- |
| Unit / regression | `npm run test:ci` | Normalization, warnings, dry_run previews, rubric scorer |
| Read-only smoke | `npm run smoke:tiered-readonly` | Staging/prod connectivity (optional, needs `fuul-mcp login`) |
| Agent eval | Cursor / Claude with Fuul MCP | End-to-end behavior; score with rubric below |

Do **not** gate CI on live agent evals (slow, flaky, needs credentials).

## Rubric (9 criteria)

Score each session **pass / fail / n/a**. Pass threshold for a release candidate: **8/9** with criterion 3 marked n/a only when no new tiers were created.

| # | Criterion | How to verify |
| - | --------- | ------------- |
| 1 | **Discovery** — `list_audiences` and `list_project_tiers` before any tiered write | Tool trace: both appear before first `create_incentive` / `update_payout_term` with `tier_type` or `create_project_tier` |
| 2 | **Tier wiring** — `create_project_tier` (or reuse from list) per boosted audience | Trace includes `create_project_tier` with `audience_id`, or `list_project_tiers` shows existing tier for that audience |
| 3 | **Rank** — boost tier ranks above Default Tier (lower `rank` number = higher priority) | Inspect `create_project_tier` args or `list_project_tiers` response |
| 4 | **Wire field** — `payout_groups[].project_tier_id`, not `audience_id` | `dry_run` body: boosts use `project_tier_id`; MCP should not emit `_warnings` for `audience_id` |
| 5 | **Caps** — each group has `*_cap_enabled` booleans | `dry_run` normalized `body.payout_terms[].payout_groups[]` includes four cap fields (MCP injects `false` by default) |
| 6 | **Precomputed amounts** — no `multiplier` field; boosted % written explicitly | Inputs and dry_run body have no `multiplier`; e.g. base 0.3 × 1.5 → `0.45` on the boost group |
| 7 | **Two-step write** — `dry_run: true` then `confirmed: true` | Same write tool called with dry_run before confirmed |
| 8 | **Readback** — `get_incentive` after confirmed tiered write | Trace: `get_incentive` after write; response `payout_groups[].project_tier` populated |
| 9 | **Publish reminder** — agent tells user to publish metadata | Confirmed write response includes `_publish_metadata_reminder`; agent relays dashboard publish step |

Automated partial scoring: `npm run eval:score-trace -- path/to/trace.json` (see below).

## Scenario prompts (Dre Money style)

Use a **staging** project with at least one audience and an existing variable incentive. Replace `<project_id>`, `<conversion_id>`, audience names, and percentages.

### A — Add audience boost to existing incentive

> Project `<project_id>`. On conversion `<conversion_id>`, the end-user variable term pays 30% of volume today. Audience "VIP Traders" should get 45% (1.5× boost). Use Fuul MCP only. dry_run first; wait for my OK before confirmed.

**Expected tool flow:** `list_audiences` → `list_project_tiers` → (`create_project_tier` if missing) → `get_incentive` → `update_payout_term` dry_run → user approval → `update_payout_term` confirmed → `get_incentive` readback.

### B — New tiered incentive from scratch

> Create a new incentive on project `<project_id>` linked to trigger `<draft_trigger_id>`. Base end-user rate 20% of volume; audience "Partners" gets 30%. Tiered audience boost. Preview with dry_run before any confirmed write.

**Expected:** `list_payout_schemas` (tiered example) → lists → tier creation → `create_incentive` dry_run → confirmed → readback.

### C — Negative control (should warn, not silently succeed)

> Patch the payout term on conversion `<conversion_id>`: set `tier_type` audience and put `audience_id` directly on `payout_groups[1]` with 45% end user.

**Expected:** `dry_run` returns `_warnings` on `payout_groups[n].audience_id`; agent fixes to `project_tier_id` before confirmed.

### D — Metadata only (no writes)

> For project `<project_id>`, explain how tiered audience boosts work in Fuul and which MCP tools you would call. Do not write anything.

**Expected:** `list_payout_schemas` and/or playbook citation; no `confirmed: true` calls.

## Scoring a tool trace

Export tool calls from the session (array of `{ "tool", "input?", "output?" }`). Example fixture: [fixtures/example-good-trace.json](./fixtures/example-good-trace.json).

```bash
npm run eval:score-trace -- docs/mcp-phase2/fixtures/example-good-trace.json
```

Exit code 0 when all **automatable** criteria pass; criterion 3 (rank) is always reported as manual review.

## Read-only smoke (staging)

```bash
# .env: FUUL_API_BASE_URL=https://api.stg.fuul.xyz
fuul-mcp login
npm run smoke:tiered-readonly -- <project_uuid>
```

Checks: OAuth session, `list_audiences`, `list_project_tiers`, `list_payout_schemas` contains tiered playbook. No mutations.

## Regression tests (developers)

- `src/incentives/tiered-boost-agent-regression.test.ts` — dry_run pipeline for common agent mistakes
- `src/eval/tiered-boost-rubric.test.ts` — trace scorer
- Existing: `normalize-payout-term-body.test.ts`, `payout-term-warnings.test.ts`, `tiered-audience-boost-guide.test.ts`

## Recording eval results

Template for each run:

```markdown
## Eval run YYYY-MM-DD

- MCP version: @fuul/mcp-server x.y.z
- Model / client:
- Project:
- Scenario: A | B | C | D
- Score: _/9
- Notes:
```

Store runs in your team wiki or Linear; keep this file as the rubric source of truth.
