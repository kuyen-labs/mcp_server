/**
 * Adapts payout_term bodies from get_incentive (GET aliases) to the shape fuul-server
 * validates on PATCH — mirrors fuul-webapp mapToCreatePayoutTermDTO for variable rewards.
 */

const VARIABLE_AMOUNT_ALIASES = ['referral_amount', 'referrer_amount', 'referrer2_amount', 'referrer3_amount', 'referrer4_amount'] as const;

const FIXED_AMOUNT_FIELDS = ['referral_amount', 'referrer_amount', 'referrer2_amount', 'referrer3_amount', 'referrer4_amount'] as const;

const PAYOUT_GROUP_AMOUNT_FIELDS = ['affiliate_amount', 'end_user_amount'] as const;

export type AmountRoundingNotice = {
  field: string;
  from: string | number;
  to: string;
};

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

function isFixedCalculationStrategy(body: Record<string, unknown>): boolean {
  const strategy = body.calculation_strategy;
  if (strategy === undefined || strategy === null) {
    return false;
  }
  return String(strategy).toLowerCase() === 'fixed';
}

function isPointType(body: Record<string, unknown>): boolean {
  return String(body.type ?? '').toLowerCase() === 'point';
}

function isPoolOrRankScheme(body: Record<string, unknown>): boolean {
  const scheme = String(body.scheme ?? '').toLowerCase();
  return scheme === 'pool' || scheme === 'rank';
}

function hasDecimalValue(value: unknown): boolean {
  const n = toNumber(value);
  return n !== undefined && !Number.isInteger(n);
}

function roundDecimalToIntegerString(value: unknown): string {
  return String(Math.round(toNumber(value)!));
}

function roundFieldIfDecimal(target: Record<string, unknown>, field: string, notices: AmountRoundingNotice[]): void {
  const value = target[field];
  if (!hasDecimalValue(value)) {
    return;
  }

  const rounded = roundDecimalToIntegerString(value);
  notices.push({ field, from: value as string | number, to: rounded });
  target[field] = rounded;
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

export function roundPointIntegerAmounts(body: Record<string, unknown>): {
  body: Record<string, unknown>;
  amountRounding: AmountRoundingNotice[];
} {
  const result: Record<string, unknown> = { ...body };
  const amountRounding: AmountRoundingNotice[] = [];

  if (!isPointType(result)) {
    return { body: result, amountRounding };
  }

  const isVariable = isVariableCalculationStrategy(result);
  const isFixed = isFixedCalculationStrategy(result);
  const isPoolOrRank = isPoolOrRankScheme(result);

  if (isFixed && !isVariable) {
    for (const field of FIXED_AMOUNT_FIELDS) {
      roundFieldIfDecimal(result, field, amountRounding);
    }
  }

  if (isPoolOrRank) {
    roundFieldIfDecimal(result, 'pool_amount', amountRounding);

    const rankConfig = result.rank_scheme_config;
    if (rankConfig !== null && typeof rankConfig === 'object' && !Array.isArray(rankConfig)) {
      const ranks = (rankConfig as Record<string, unknown>).ranks;
      if (ranks !== null && typeof ranks === 'object' && !Array.isArray(ranks)) {
        const newRanks: Record<string, unknown> = { ...(ranks as Record<string, unknown>) };
        for (const [position, rankEntry] of Object.entries(newRanks)) {
          if (rankEntry === null || typeof rankEntry !== 'object' || Array.isArray(rankEntry)) {
            continue;
          }

          const rankObj = { ...(rankEntry as Record<string, unknown>) };
          const prizeValue = rankObj.prizeAmount;
          if (hasDecimalValue(prizeValue)) {
            const rounded = roundDecimalToIntegerString(prizeValue);
            amountRounding.push({
              field: `rank_scheme_config.ranks[${position}].prizeAmount`,
              from: prizeValue as string | number,
              to: rounded,
            });
            rankObj.prizeAmount = rounded;
            newRanks[position] = rankObj;
          }
        }

        result.rank_scheme_config = { ...(rankConfig as Record<string, unknown>), ranks: newRanks };
      }
    }
  }

  if (isFixed && !isVariable && Array.isArray(result.payout_groups)) {
    result.payout_groups = (result.payout_groups as unknown[]).map((group, index) => {
      if (group === null || typeof group !== 'object' || Array.isArray(group)) {
        return group;
      }

      const groupObj = { ...(group as Record<string, unknown>) };
      for (const field of PAYOUT_GROUP_AMOUNT_FIELDS) {
        const value = groupObj[field];
        if (hasDecimalValue(value)) {
          const rounded = roundDecimalToIntegerString(value);
          amountRounding.push({
            field: `payout_groups[${index}].${field}`,
            from: value as string | number,
            to: rounded,
          });
          groupObj[field] = rounded;
        }
      }

      return groupObj;
    });
  }

  return { body: result, amountRounding };
}

export function preparePayoutTermBodyForWrite(body: Record<string, unknown>): {
  body: Record<string, unknown>;
  amountRounding: AmountRoundingNotice[];
} {
  const { body: roundedBody, amountRounding } = roundPointIntegerAmounts(body);
  return {
    body: normalizePayoutTermBodyForPatch(roundedBody),
    amountRounding,
  };
}

export function attachAmountRounding<T extends Record<string, unknown>>(
  payload: T,
  amountRounding: AmountRoundingNotice[],
): T & { _amount_rounding?: AmountRoundingNotice[] } {
  if (amountRounding.length === 0) {
    return payload;
  }

  return { ...payload, _amount_rounding: amountRounding };
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
