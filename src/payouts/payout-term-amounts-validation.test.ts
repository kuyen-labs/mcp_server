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

describe('validatePayoutTermAmounts pool', () => {
  const validPoolTerm = {
    scheme: 'pool',
    type: 'point',
    payee_type: 'affiliate',
    amount_source: 'volume',
    pool_amount: '1000',
    pool_duration: 168,
    pool_calculation_day_cron: '*',
    pool_distribution_mode: 'linear',
  };

  it('returns no errors for valid pool term', () => {
    expect(validatePayoutTermAmounts(validPoolTerm)).toEqual([]);
  });

  it('requires pool fields for scheme pool', () => {
    const errors = validatePayoutTermAmounts({ scheme: 'pool', payee_type: 'affiliate' });
    const properties = errors.map((e) => e.property);

    expect(properties).toContain('amount_source');
    expect(properties).toContain('pool_amount');
    expect(properties).toContain('pool_duration');
    expect(properties).toContain('pool_calculation_day_cron');
  });

  it('rejects unsupported dynamic pool fields', () => {
    const errors = validatePayoutTermAmounts({
      ...validPoolTerm,
      volume_bands: [{ min: 0, max: 100 }],
    });

    expect(errors.some((e) => e.property === 'volume_bands')).toBe(true);
  });

  it('rejects calculation_strategy on pool terms', () => {
    const errors = validatePayoutTermAmounts({
      ...validPoolTerm,
      calculation_strategy: 'variable',
      referrer_amount_percentage: 0.1,
    });

    expect(errors.some((e) => e.property === 'calculation_strategy')).toBe(true);
    expect(errors.some((e) => e.property === 'referrer_amount_percentage')).toBe(true);
  });
});
