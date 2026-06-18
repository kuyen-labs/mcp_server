import { describe, expect, it } from 'vitest';

import { enrichPayoutSchemasResponse } from './incentive-create-payload-guide.js';

describe('enrichPayoutSchemasResponse', () => {
  it('adds guide and reward type examples', () => {
    const raw = { enums: { PayoutScheme: ['pay-per-attribution', 'pool', 'rank'] } };
    const enriched = enrichPayoutSchemasResponse(raw) as {
      create_incentive_payload_guide: {
        endpoint: string;
        tiered_audience_boost_playbook: { workflow_steps: unknown[] };
        pool_payout_playbook: { workflow_steps: unknown[]; unsupported_capabilities: string[] };
      };
      reward_types: Array<{ id: string; create_payload_example: { payout_terms: unknown[] } }>;
    };

    expect(enriched.create_incentive_payload_guide.endpoint).toContain('/incentives');
    expect(enriched.create_incentive_payload_guide.tiered_audience_boost_playbook.workflow_steps).toHaveLength(6);
    expect(enriched.create_incentive_payload_guide.pool_payout_playbook.workflow_steps).toHaveLength(6);
    expect(enriched.reward_types).toHaveLength(5);
    expect(enriched.reward_types.map((row) => row.id)).toEqual([
      'fixed-reward',
      'variable-reward',
      'proportional-pool',
      'tiered-audience-boost',
      'leaderboard',
    ]);
    expect(enriched.reward_types[0].create_payload_example.payout_terms).toHaveLength(1);

    const tiered = enriched.reward_types.find((row) => row.id === 'tiered-audience-boost');
    expect(tiered).toBeDefined();
    expect(tiered!.create_payload_example.payout_terms[0]).toMatchObject({
      tier_type: 'audience',
      payout_groups: expect.arrayContaining([
        expect.objectContaining({ end_user_amount_percentage: 0.3, payout_cap_enabled: false }),
        expect.objectContaining({ project_tier_id: '<TIER_UUID>', end_user_amount_percentage: 0.45, payout_cap_enabled: false }),
      ]),
    });

    expect(enriched.enums).toBeDefined();
  });

  it('returns raw when not an object', () => {
    expect(enrichPayoutSchemasResponse(null)).toBeNull();
  });
});
