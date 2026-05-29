import { describe, expect, it } from 'vitest';

import { enrichPayoutSchemasResponse } from './incentive-create-payload-guide.js';

describe('enrichPayoutSchemasResponse', () => {
  it('adds guide and reward type examples', () => {
    const raw = { enums: { PayoutScheme: ['pay-per-attribution', 'pool', 'rank'] } };
    const enriched = enrichPayoutSchemasResponse(raw) as {
      create_incentive_payload_guide: { endpoint: string };
      reward_types: Array<{ id: string; create_payload_example: { payout_terms: unknown[] } }>;
    };

    expect(enriched.create_incentive_payload_guide.endpoint).toContain('/incentives');
    expect(enriched.reward_types).toHaveLength(4);
    expect(enriched.reward_types[0].id).toBe('fixed-reward');
    expect(enriched.reward_types[0].create_payload_example.payout_terms).toHaveLength(1);
    expect(enriched.enums).toBeDefined();
  });

  it('returns raw when not an object', () => {
    expect(enrichPayoutSchemasResponse(null)).toBeNull();
  });
});
