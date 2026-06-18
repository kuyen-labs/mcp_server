/**
 * Client-side mirror of fuul-server TieredPayoutTermAmountsValidator /
 * NonTieredPayoutTermAmountsValidator for dry_run previews.
 */

export type PayoutTermValidationError = {
  property: string;
  message: string;
};

const MAX_POOL_DURATION_HOURS = 365 * 24;
const VALID_POOL_CRON_VALUES = new Set(['*', '0', '1', '2', '3', '4', '5', '6']);
const VALID_POOL_AMOUNT_SOURCES = new Set(['volume', 'revenue']);
const VALID_POOL_DISTRIBUTION_MODES = new Set(['linear', 'square_root']);

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

function payeeType(body: Record<string, unknown>): string {
  return String(body.payee_type ?? '').toLowerCase();
}

function isVariable(body: Record<string, unknown>): boolean {
  return String(body.calculation_strategy ?? '').toLowerCase() === 'variable';
}

function isFixed(body: Record<string, unknown>): boolean {
  return String(body.calculation_strategy ?? '').toLowerCase() === 'fixed';
}

function paysAffiliate(body: Record<string, unknown>): boolean {
  const pt = payeeType(body);
  return pt === 'affiliate' || pt === 'both';
}

function paysEndUser(body: Record<string, unknown>): boolean {
  const pt = payeeType(body);
  return pt === 'end-user' || pt === 'both';
}

function hasTierType(body: Record<string, unknown>): boolean {
  const tierType = body.tier_type;
  return tierType !== undefined && tierType !== null && String(tierType).trim() !== '';
}

function isPoolScheme(body: Record<string, unknown>): boolean {
  return String(body.scheme ?? '').toLowerCase() === 'pool';
}

function isPositiveInt(value: unknown): boolean {
  const n = Number(value);
  return Number.isInteger(n) && n > 0;
}

function validatePoolPayoutTerm(body: Record<string, unknown>, errors: PayoutTermValidationError[]): void {
  if (!isPresent(body.amount_source)) {
    pushError(errors, 'amount_source', 'amount_source is required for scheme pool');
  } else if (!VALID_POOL_AMOUNT_SOURCES.has(String(body.amount_source).toLowerCase())) {
    pushError(errors, 'amount_source', 'amount_source must be "volume" or "revenue" for scheme pool (attribution-count is not supported)');
  }

  if (!isPresent(body.pool_amount)) {
    pushError(errors, 'pool_amount', 'pool_amount is required for scheme pool');
  } else if (!isPositiveBigIntString(body.pool_amount)) {
    pushError(errors, 'pool_amount', 'pool_amount must be a positive integer string');
  }

  if (!isPresent(body.pool_duration)) {
    pushError(errors, 'pool_duration', 'pool_duration is required for scheme pool');
  } else if (!isPositiveInt(body.pool_duration)) {
    pushError(errors, 'pool_duration', 'pool_duration must be a positive integer (hours)');
  } else if (Number(body.pool_duration) > MAX_POOL_DURATION_HOURS) {
    pushError(errors, 'pool_duration', `pool_duration must be at most ${MAX_POOL_DURATION_HOURS} hours`);
  }

  if (!isPresent(body.pool_calculation_day_cron)) {
    pushError(errors, 'pool_calculation_day_cron', 'pool_calculation_day_cron is required for scheme pool');
  } else if (!VALID_POOL_CRON_VALUES.has(String(body.pool_calculation_day_cron))) {
    pushError(errors, 'pool_calculation_day_cron', 'pool_calculation_day_cron must be "*" or "0"–"6" (UTC weekday)');
  }

  const distributionMode = body.pool_distribution_mode;
  if (isPresent(distributionMode) && !VALID_POOL_DISTRIBUTION_MODES.has(String(distributionMode).toLowerCase())) {
    pushError(errors, 'pool_distribution_mode', 'pool_distribution_mode must be "linear" or "square_root"');
  }

  if (isPresent(body.calculation_strategy)) {
    pushError(errors, 'calculation_strategy', 'calculation_strategy is not used for scheme pool — remove it');
  }

  for (const field of TERM_AMOUNT_FIELDS) {
    if (isPresent(body[field])) {
      pushError(errors, field, `${field} is not used for scheme pool — use pool_amount and pool window fields`);
    }
  }

  const unsupportedPoolFields = ['pool_amount_formula', 'dynamic_pool_amount', 'volume_bands', 'pool_tiers', 'pool_amount_percentage'] as const;

  for (const field of unsupportedPoolFields) {
    if (isPresent(body[field])) {
      pushError(errors, field, `${field} is not supported — pool_amount is fixed per cycle; dynamic/volume-banded pools are not available`);
    }
  }
}

function isPresent(value: unknown): boolean {
  return value !== undefined && value !== null && value !== '';
}

function isPositiveNumber(value: unknown): boolean {
  const n = Number(value);
  return Number.isFinite(n) && n > 0;
}

function isPositiveBigIntString(value: unknown): boolean {
  if (typeof value !== 'string' || value.trim() === '') {
    return false;
  }
  try {
    return BigInt(value) > 0n;
  } catch {
    return false;
  }
}

function pushError(errors: PayoutTermValidationError[], property: string, message: string): void {
  errors.push({ property, message });
}

function validateTieredGroup(
  group: Record<string, unknown>,
  body: Record<string, unknown>,
  index: number,
  errors: PayoutTermValidationError[],
): void {
  const prefix = `payout_groups[${index}]`;

  if (paysAffiliate(body)) {
    if (isVariable(body)) {
      if (!isPresent(group.affiliate_amount_percentage)) {
        pushError(errors, `${prefix}.affiliate_amount_percentage`, 'affiliate_amount_percentage is required');
      } else if (!isPositiveNumber(group.affiliate_amount_percentage)) {
        pushError(errors, `${prefix}.affiliate_amount_percentage`, 'affiliate_amount_percentage must be greater than 0');
      }
    }
    if (isFixed(body)) {
      if (!isPresent(group.affiliate_amount)) {
        pushError(errors, `${prefix}.affiliate_amount`, 'affiliate_amount is required');
      } else if (!isPositiveBigIntString(group.affiliate_amount)) {
        pushError(errors, `${prefix}.affiliate_amount`, 'affiliate_amount must be greater than 0');
      }
    }
  }

  if (paysEndUser(body)) {
    if (isVariable(body)) {
      if (!isPresent(group.end_user_amount_percentage)) {
        pushError(errors, `${prefix}.end_user_amount_percentage`, 'end_user_amount_percentage is required');
      } else if (!isPositiveNumber(group.end_user_amount_percentage)) {
        pushError(errors, `${prefix}.end_user_amount_percentage`, 'end_user_amount_percentage must be greater than 0');
      }
    }
    if (isFixed(body)) {
      if (!isPresent(group.end_user_amount)) {
        pushError(errors, `${prefix}.end_user_amount`, 'end_user_amount is required');
      } else if (!isPositiveBigIntString(group.end_user_amount)) {
        pushError(errors, `${prefix}.end_user_amount`, 'end_user_amount must be greater than 0');
      }
    }
  }
}

function validateNonTiered(body: Record<string, unknown>, errors: PayoutTermValidationError[]): void {
  if (paysAffiliate(body)) {
    if (isFixed(body)) {
      if (!isPresent(body.referrer_amount)) {
        pushError(errors, 'referrer_amount', 'referrer_amount is required');
      } else if (!isPositiveBigIntString(body.referrer_amount)) {
        pushError(errors, 'referrer_amount', 'referrer_amount must be greater than 0');
      }
    }
    if (isVariable(body)) {
      if (!isPresent(body.referrer_amount_percentage)) {
        pushError(errors, 'referrer_amount_percentage', 'referrer_amount_percentage is required');
      } else if (!isPositiveNumber(body.referrer_amount_percentage)) {
        pushError(errors, 'referrer_amount_percentage', 'referrer_amount_percentage must be greater than 0');
      }
    }
  }

  if (paysEndUser(body)) {
    if (isFixed(body)) {
      if (!isPresent(body.referral_amount)) {
        pushError(errors, 'referral_amount', 'referral_amount is required');
      } else if (!isPositiveBigIntString(body.referral_amount)) {
        pushError(errors, 'referral_amount', 'referral_amount must be greater than 0');
      }
    }
    if (isVariable(body)) {
      if (!isPresent(body.referral_amount_percentage)) {
        pushError(errors, 'referral_amount_percentage', 'referral_amount_percentage is required');
      } else if (!isPositiveNumber(body.referral_amount_percentage)) {
        pushError(errors, 'referral_amount_percentage', 'referral_amount_percentage must be greater than 0');
      }
    }
  }
}

export function validatePayoutTermAmounts(body: Record<string, unknown>): PayoutTermValidationError[] {
  const errors: PayoutTermValidationError[] = [];

  if (isPoolScheme(body)) {
    validatePoolPayoutTerm(body, errors);
    return errors;
  }

  if (hasTierType(body)) {
    for (const field of TERM_AMOUNT_FIELDS) {
      if (isPresent(body[field])) {
        pushError(errors, field, `${field} is not allowed when tier_type is set`);
      }
    }

    const groups = body.payout_groups;
    if (!Array.isArray(groups) || groups.length === 0) {
      pushError(errors, 'payout_groups', 'payout_groups must contain at least 1 entry when tier_type is set');
      return errors;
    }

    groups.forEach((group, index) => {
      if (group === null || typeof group !== 'object' || Array.isArray(group)) {
        return;
      }
      validateTieredGroup(group as Record<string, unknown>, body, index, errors);
    });

    return errors;
  }

  validateNonTiered(body, errors);
  return errors;
}

export function payoutTermHasPoolScheme(body: Record<string, unknown>): boolean {
  return isPoolScheme(body);
}

export function attachValidationErrors<T extends Record<string, unknown>>(
  payload: T,
  errors: PayoutTermValidationError[],
): T & { _validation_errors?: PayoutTermValidationError[] } {
  if (errors.length === 0) {
    return payload;
  }
  return { ...payload, _validation_errors: errors };
}
