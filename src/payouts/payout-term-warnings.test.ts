import { describe, expect, it } from 'vitest';

import { collectPayoutTermWarnings } from './payout-term-warnings.js';

describe('collectPayoutTermWarnings', () => {
  it('warns when a tiered group uses audience_id without project_tier_id', () => {
    const warnings = collectPayoutTermWarnings({
      tier_type: 'audience',
      payout_groups: [{ audience_id: 'aud-uuid', end_user_amount_percentage: 0.45 }],
    });

    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.property).toBe('payout_groups[0].audience_id');
  });

  it('does not warn when project_tier_id is set', () => {
    const warnings = collectPayoutTermWarnings({
      tier_type: 'audience',
      payout_groups: [{ project_tier_id: 'tier-uuid', end_user_amount_percentage: 0.45 }],
    });

    expect(warnings).toEqual([]);
  });

  it('returns no warnings for non-tiered terms', () => {
    const warnings = collectPayoutTermWarnings({
      calculation_strategy: 'variable',
      referral_amount_percentage: 0.3,
    });

    expect(warnings).toEqual([]);
  });

  it('warns when pool term uses payee_type both', () => {
    const warnings = collectPayoutTermWarnings({
      scheme: 'pool',
      payee_type: 'both',
      amount_source: 'volume',
    });

    expect(warnings).toEqual([expect.objectContaining({ property: 'payee_type' })]);
  });

  it('warns when pool term includes volume_bands field', () => {
    const warnings = collectPayoutTermWarnings({
      scheme: 'pool',
      volume_bands: [{ min: 0, max: 1000, rate: 0.1 }],
    });

    expect(warnings.some((w) => w.property === 'volume_bands')).toBe(true);
  });
});
