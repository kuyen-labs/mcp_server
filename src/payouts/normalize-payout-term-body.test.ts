import { describe, expect, it } from 'vitest';

import { isVariablePercentageMode, normalizePayoutTermBodyForPatch } from './normalize-payout-term-body.js';

describe('isVariablePercentageMode', () => {
  it('returns true for none', () => {
    expect(isVariablePercentageMode('none')).toBe(true);
    expect(isVariablePercentageMode('NONE')).toBe(true);
  });

  it('returns false for per-unit base currencies', () => {
    expect(isVariablePercentageMode(null)).toBe(false);
    expect(isVariablePercentageMode('usd')).toBe(false);
    expect(isVariablePercentageMode(undefined)).toBe(false);
  });
});

describe('normalizePayoutTermBodyForPatch', () => {
  it('maps per-unit points aliases to percentages and strips aliases', () => {
    const input = {
      calculation_strategy: 'variable',
      type: 'point',
      payee_type: 'both',
      base_currency: null,
      referral_amount: '2',
      referrer_amount: '6',
      scheme: 'pay_per_conversion',
    };

    expect(normalizePayoutTermBodyForPatch(input)).toEqual({
      calculation_strategy: 'variable',
      type: 'point',
      payee_type: 'both',
      base_currency: null,
      referral_amount_percentage: 2,
      referrer_amount_percentage: 6,
      scheme: 'pay_per_conversion',
    });
  });

  it('prefers alias over zero percentage in per-unit mode', () => {
    const input = {
      calculation_strategy: 'variable',
      base_currency: null,
      referral_amount: '2',
      referrer_amount: '6',
      referrer_amount_percentage: 0,
    };

    expect(normalizePayoutTermBodyForPatch(input)).toMatchObject({
      referral_amount_percentage: 2,
      referrer_amount_percentage: 6,
    });
    expect(normalizePayoutTermBodyForPatch(input)).not.toHaveProperty('referrer_amount');
    expect(normalizePayoutTermBodyForPatch(input)).not.toHaveProperty('referral_amount');
  });

  it('maps percentage mode aliases from GET', () => {
    const input = {
      calculation_strategy: 'variable',
      base_currency: 'none',
      referral_amount: '0.2',
      referrer_amount: '0.05',
    };

    expect(normalizePayoutTermBodyForPatch(input)).toMatchObject({
      referral_amount_percentage: 0.2,
      referrer_amount_percentage: 0.05,
    });
  });

  it('leaves fixed strategy body unchanged', () => {
    const input = {
      calculation_strategy: 'fixed',
      referral_amount: '100',
      referrer_amount: '200',
    };

    expect(normalizePayoutTermBodyForPatch(input)).toEqual(input);
  });

  it('maps multilevel aliases when present', () => {
    const input = {
      calculation_strategy: 'variable',
      base_currency: 'usd',
      referrer2_amount: '1.5',
      referrer2_amount_percentage: 0,
    };

    expect(normalizePayoutTermBodyForPatch(input)).toMatchObject({
      referrer2_amount_percentage: 1.5,
    });
    expect(normalizePayoutTermBodyForPatch(input)).not.toHaveProperty('referrer2_amount');
  });
});
