/**
 * Adapts payout_term bodies from get_incentive (GET aliases) to the shape fuul-server
 * validates on PATCH — mirrors fuul-webapp mapToCreatePayoutTermDTO for variable rewards.
 */

const VARIABLE_AMOUNT_ALIASES = ['referral_amount', 'referrer_amount', 'referrer2_amount', 'referrer3_amount', 'referrer4_amount'] as const;

const ALIAS_TO_PERCENTAGE: ReadonlyArray<readonly [string, string]> = [
  ['referral_amount', 'referral_amount_percentage'],
  ['referrer_amount', 'referrer_amount_percentage'],
  ['referrer2_amount', 'referrer2_amount_percentage'],
  ['referrer3_amount', 'referrer3_amount_percentage'],
  ['referrer4_amount', 'referrer4_amount_percentage'],
];

function toNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function isVariableCalculationStrategy(body: Record<string, unknown>): boolean {
  const strategy = body.calculation_strategy;
  if (strategy === undefined || strategy === null) {
    return false;
  }
  return String(strategy).toLowerCase() === 'variable';
}

/** Percentage-of-revenue mode uses base_currency "none"; per-unit uses anything else (including null for points). */
export function isVariablePercentageMode(baseCurrency: unknown): boolean {
  if (baseCurrency === undefined || baseCurrency === null) {
    return false;
  }
  return String(baseCurrency).toLowerCase() === 'none';
}

function resolvePercentageFromAlias(aliasValue: number, percentageValue: number | undefined, unitMode: boolean): number {
  if (percentageValue === undefined) {
    return aliasValue;
  }
  if (unitMode && percentageValue === 0 && aliasValue !== 0) {
    return aliasValue;
  }
  if (percentageValue === 0 && aliasValue !== 0) {
    return aliasValue;
  }
  return percentageValue;
}

export function normalizePayoutTermBodyForPatch(body: Record<string, unknown>): Record<string, unknown> {
  if (!isVariableCalculationStrategy(body)) {
    return body;
  }

  const result: Record<string, unknown> = { ...body };
  const unitMode = !isVariablePercentageMode(result.base_currency);

  for (const [aliasKey, percentageKey] of ALIAS_TO_PERCENTAGE) {
    const aliasValue = toNumber(result[aliasKey]);
    if (aliasValue === undefined) {
      continue;
    }

    const existingPercentage = toNumber(result[percentageKey]);
    result[percentageKey] = resolvePercentageFromAlias(aliasValue, existingPercentage, unitMode);
  }

  for (const aliasKey of VARIABLE_AMOUNT_ALIASES) {
    delete result[aliasKey];
  }

  return result;
}
