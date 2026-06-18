import { describe, expect, it } from 'vitest';

import {
  enrichIncentivesListWithPoolFlags,
  enrichIncentiveWithPoolCapabilities,
  incentiveHasPoolScheme,
} from './enrich-incentive-pool-capabilities.js';

describe('enrichIncentiveWithPoolCapabilities', () => {
  it('attaches _pool_capability_boundary when draft has scheme pool', () => {
    const enriched = enrichIncentiveWithPoolCapabilities({
      slug: 'season-3',
      draft: {
        payout_terms: [{ scheme: 'pool', pool_amount: '50000' }],
      },
      triggers: [],
    });

    expect(incentiveHasPoolScheme(enriched)).toBe(true);
    expect(enriched._pool_capability_boundary).toBeDefined();
    expect(enriched._pool_capability_boundary?.key_unsupported).toMatch(/dynamic/i);
    expect(enriched._pool_capability_boundary?.unsupported_capabilities).toEqual(expect.arrayContaining([expect.stringMatching(/volume-banded/i)]));
  });

  it('does not attach boundary for non-pool incentives', () => {
    const enriched = enrichIncentiveWithPoolCapabilities({
      draft: {
        payout_terms: [{ scheme: 'pay-per-attribution', calculation_strategy: 'fixed' }],
      },
    });

    expect(enriched._pool_capability_boundary).toBeUndefined();
  });
});

describe('enrichIncentivesListWithPoolFlags', () => {
  it('adds list-level hint when any incentive is pool', () => {
    const list = enrichIncentivesListWithPoolFlags([
      { draft: { payout_terms: [{ scheme: 'pool' }] } },
      { draft: { payout_terms: [{ scheme: 'pay-per-attribution' }] } },
    ]);

    expect(list._contains_pool_scheme).toBe(true);
    expect(list._pool_analysis_hint).toMatch(/get_incentive/);
  });

  it('returns plain array when no pool incentives', () => {
    const list = enrichIncentivesListWithPoolFlags([{ draft: { payout_terms: [{ scheme: 'rank' }] } }]);

    expect(list._contains_pool_scheme).toBeUndefined();
    expect(list).toHaveLength(1);
  });
});
