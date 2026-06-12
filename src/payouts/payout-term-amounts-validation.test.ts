import { describe, expect, it } from 'vitest';

import { validatePayoutTermAmounts } from './payout-term-amounts-validation.js';

describe('validatePayoutTermAmounts tiered', () => {
  it('returns no errors for valid tiered variable end-user groups', () => {
    const errors = validatePayoutTermAmounts({
      calculation_strategy: 'variable',
      payee_type: 'end-user',
      tier_type: 'audience',
      payout_groups: [{ end_user_amount_percentage: 0.3 }, { audience_id: 'uuid', end_user_amount_percentage: 0.45 }],
    });

    expect(errors).toEqual([]);
  });

  it('flags missing end_user_amount_percentage in a group after normalization shape', () => {
    const errors = validatePayoutTermAmounts({
      calculation_strategy: 'variable',
      payee_type: 'end-user',
      tier_type: 'audience',
      payout_groups: [{ audience_id: 'uuid' }],
    });

    expect(errors).toEqual([
      {
        property: 'payout_groups[0].end_user_amount_percentage',
        message: 'end_user_amount_percentage is required',
      },
    ]);
  });

  it('flags term-level amounts when tier_type is set', () => {
    const errors = validatePayoutTermAmounts({
      calculation_strategy: 'variable',
      payee_type: 'end-user',
      tier_type: 'audience',
      referral_amount_percentage: 0.3,
      payout_groups: [{ end_user_amount_percentage: 0.3 }],
    });

    expect(errors.some((e) => e.property === 'referral_amount_percentage')).toBe(true);
  });
});
