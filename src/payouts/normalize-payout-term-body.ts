/**
 * Adapts payout_term bodies from get_incentive (GET aliases) to the shape fuul-server
 * validates on PATCH — mirrors fuul-webapp mapToCreatePayoutTermDTO for variable rewards.
 */

import { type PayoutTermValidationError, validatePayoutTermAmounts } from './payout-term-amounts-validation.js';
import { collectPayoutTermWarnings, type PayoutTermWarning } from './payout-term-warnings.js';

const VARIABLE_AMOUNT_ALIASES = ['referral_amount', 'referrer_amount', 'referrer2_amount', 'referrer3_amount', 'referrer4_amount'] as const;

const FIXED_AMOUNT_FIELDS = ['referral_amount', 'referrer_amount', 'referrer2_amount', 'referrer3_amount', 'referrer4_amount'] as const;

const PAYOUT_GROUP_AMOUNT_FIELDS = ['affiliate_amount', 'end_user_amount'] as const;

const TERM_AMOUNT_FIELDS = [
  'referral_amount',
  'referrer_amount',
  'referral_amount_percentage',
  'referrer_amount_percentage',
  'referrer2_amount',
  'referrer3_amount',
  'referrer4_amount',
  'referrer2_amount_percentage',
  'referrer3_amount_percentage',
  'referrer4_amount_percentage',
] as const;

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

const GROUP_VARIABLE_ALIAS_TO_PERCENTAGE: ReadonlyArray<readonly [string, string]> = [
  ['referral_amount', 'end_user_amount_percentage'],
  ['referrer_amount', 'affiliate_amount_percentage'],
  ['referrer2_amount', 'affiliate2_amount_percentage'],
  ['referrer3_amount', 'affiliate3_amount_percentage'],
  ['referrer4_amount', 'affiliate4_amount_percentage'],
];

const GROUP_FIXED_ALIAS_TO_AMOUNT: ReadonlyArray<readonly [string, string]> = [
  ['referral_amount', 'end_user_amount'],
  ['referrer_amount', 'affiliate_amount'],
  ['referrer2_amount', 'affiliate2_amount'],
  ['referrer3_amount', 'affiliate3_amount'],
  ['referrer4_amount', 'affiliate4_amount'],
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

function hasTierType(body: Record<string, unknown>): boolean {
  const tierType = body.tier_type;
  return tierType !== undefined && tierType !== null && String(tierType).trim() !== '';
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

function stripTermLevelAmountFields(result: Record<string, unknown>): void {
  for (const field of TERM_AMOUNT_FIELDS) {
    delete result[field];
  }
}

function applyPayoutGroupCapDefaults(groupObj: Record<string, unknown>): void {
  if (groupObj.payout_cap_enabled === undefined || groupObj.payout_cap_enabled === null) {
    groupObj.payout_cap_enabled = false;
  }
  if (groupObj.wallet_cap_enabled === undefined || groupObj.wallet_cap_enabled === null) {
    groupObj.wallet_cap_enabled = false;
  }
  if (groupObj.enduser_cap_enabled === undefined || groupObj.enduser_cap_enabled === null) {
    groupObj.enduser_cap_enabled = false;
  }
  if (groupObj.dynamic_referral_cap_enabled === undefined || groupObj.dynamic_referral_cap_enabled === null) {
    groupObj.dynamic_referral_cap_enabled = false;
  }
}

function normalizeTieredPayoutGroup(
  group: Record<string, unknown>,
  unitMode: boolean,
  isVariable: boolean,
  isFixed: boolean,
): Record<string, unknown> {
  const groupObj = { ...group };

  if (isVariable) {
    for (const [aliasKey, percentageKey] of GROUP_VARIABLE_ALIAS_TO_PERCENTAGE) {
      const aliasValue = toNumber(groupObj[aliasKey]);
      if (aliasValue === undefined) {
        continue;
      }
      const existingPercentage = toNumber(groupObj[percentageKey]);
      groupObj[percentageKey] = resolvePercentageFromAlias(aliasValue, existingPercentage, unitMode);
      delete groupObj[aliasKey];
    }
  }

  if (isFixed) {
    for (const [aliasKey, amountKey] of GROUP_FIXED_ALIAS_TO_AMOUNT) {
      const aliasValue = groupObj[aliasKey];
      if (aliasValue === undefined || aliasValue === null || aliasValue === '') {
        continue;
      }
      if (groupObj[amountKey] === undefined || groupObj[amountKey] === null || groupObj[amountKey] === '') {
        groupObj[amountKey] = String(aliasValue);
      }
      delete groupObj[aliasKey];
    }
  }

  applyPayoutGroupCapDefaults(groupObj);
  return groupObj;
}

function normalizeTieredPayoutTermBody(body: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...body };
  const isVariable = isVariableCalculationStrategy(result);
  const isFixed = isFixedCalculationStrategy(result);
  const unitMode = !isVariablePercentageMode(result.base_currency);

  if (Array.isArray(result.payout_groups)) {
    result.payout_groups = (result.payout_groups as unknown[]).map((group) => {
      if (group === null || typeof group !== 'object' || Array.isArray(group)) {
        return group;
      }
      return normalizeTieredPayoutGroup(group as Record<string, unknown>, unitMode, isVariable, isFixed);
    });
  }

  stripTermLevelAmountFields(result);
  return result;
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
  const isTiered = hasTierType(result);

  if (isFixed && !isVariable && !isTiered) {
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
  validationErrors: PayoutTermValidationError[];
  warnings: PayoutTermWarning[];
} {
  const warnings = collectPayoutTermWarnings(body);
  const { body: roundedBody, amountRounding } = roundPointIntegerAmounts(body);
  const normalized = normalizePayoutTermBodyForPatch(roundedBody);
  return {
    body: normalized,
    amountRounding,
    validationErrors: validatePayoutTermAmounts(normalized),
    warnings,
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
  if (hasTierType(body)) {
    return normalizeTieredPayoutTermBody(body);
  }

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
