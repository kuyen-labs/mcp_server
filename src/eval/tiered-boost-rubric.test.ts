import { describe, expect, it } from 'vitest';

import { scoreTieredBoostToolTrace, summarizeRubric, type ToolCallTrace } from './tiered-boost-rubric.js';

const GOOD_TRACE: ToolCallTrace[] = [
  { tool: 'list_audiences', input: { project_id: 'p1' } },
  { tool: 'list_project_tiers', input: { project_id: 'p1' } },
  {
    tool: 'update_payout_term',
    input: {
      project_id: 'p1',
      payout_term: { tier_type: 'audience', payout_groups: [{ end_user_amount_percentage: 0.3 }] },
      dry_run: true,
    },
    output: {
      body: {
        payout_term: {
          payout_groups: [
            {
              end_user_amount_percentage: 0.3,
              payout_cap_enabled: false,
              wallet_cap_enabled: false,
              enduser_cap_enabled: false,
              dynamic_referral_cap_enabled: false,
            },
          ],
        },
      },
    },
  },
  {
    tool: 'update_payout_term',
    input: {
      project_id: 'p1',
      payout_term: { tier_type: 'audience', payout_groups: [{ end_user_amount_percentage: 0.3 }] },
      confirmed: true,
    },
    output: { _publish_metadata_reminder: 'publish from dashboard' },
  },
  { tool: 'get_incentive', input: { project_id: 'p1', conversion_id: 'c1' } },
];

describe('scoreTieredBoostToolTrace', () => {
  it('passes automatable criteria on a well-formed trace', () => {
    const results = scoreTieredBoostToolTrace(GOOD_TRACE);
    const summary = summarizeRubric(results);

    expect(summary.fail).toBe(0);
    expect(results.find((r) => r.id === 'discovery_lists')?.verdict).toBe('pass');
    expect(results.find((r) => r.id === 'dry_run_before_confirmed')?.verdict).toBe('pass');
    expect(results.find((r) => r.id === 'get_incentive_readback')?.verdict).toBe('pass');
    expect(results.find((r) => r.id === 'tier_rank')?.verdict).toBe('manual');
  });

  it('fails when audience_id is used without project_tier_id in dry_run body', () => {
    const bad: ToolCallTrace[] = [
      { tool: 'list_audiences', input: { project_id: 'p1' } },
      { tool: 'list_project_tiers', input: { project_id: 'p1' } },
      {
        tool: 'update_payout_term',
        input: { project_id: 'p1', payout_term: { tier_type: 'audience' }, dry_run: true },
        output: {
          body: {
            payout_term: {
              payout_groups: [{ audience_id: 'aud-1', end_user_amount_percentage: 0.45 }],
            },
          },
          _warnings: [{ property: 'payout_groups[0].audience_id' }],
        },
      },
    ];

    const results = scoreTieredBoostToolTrace(bad);
    expect(results.find((r) => r.id === 'project_tier_id_wire')?.verdict).toBe('fail');
  });

  it('fails when confirmed write has no prior dry_run', () => {
    const bad: ToolCallTrace[] = [
      { tool: 'list_audiences', input: { project_id: 'p1' } },
      { tool: 'list_project_tiers', input: { project_id: 'p1' } },
      {
        tool: 'create_incentive',
        input: {
          project_id: 'p1',
          payout_terms: [{ tier_type: 'audience', payout_groups: [] }],
          confirmed: true,
        },
        output: { _publish_metadata_reminder: 'x' },
      },
    ];

    const results = scoreTieredBoostToolTrace(bad);
    expect(results.find((r) => r.id === 'dry_run_before_confirmed')?.verdict).toBe('fail');
  });

  it('fails when multiplier appears in payout_groups input', () => {
    const bad: ToolCallTrace[] = [
      { tool: 'list_audiences', input: { project_id: 'p1' } },
      { tool: 'list_project_tiers', input: { project_id: 'p1' } },
      {
        tool: 'update_payout_term',
        input: {
          project_id: 'p1',
          payout_term: {
            tier_type: 'audience',
            payout_groups: [{ multiplier: 1.5, end_user_amount_percentage: 0.45 }],
          },
          dry_run: true,
        },
      },
    ];

    const results = scoreTieredBoostToolTrace(bad);
    expect(results.find((r) => r.id === 'no_multiplier')?.verdict).toBe('fail');
  });
});
