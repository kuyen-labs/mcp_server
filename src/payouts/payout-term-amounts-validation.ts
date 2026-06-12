/**
 * Client-side mirror of fuul-server TieredPayoutTermAmountsValidator /
 * NonTieredPayoutTermAmountsValidator for dry_run previews.
 */

export type PayoutTermValidationError = {
  property: string;
  message: string;
};

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

export function attachValidationErrors<T extends Record<string, unknown>>(
  payload: T,
  errors: PayoutTermValidationError[],
): T & { _validation_errors?: PayoutTermValidationError[] } {
  if (errors.length === 0) {
    return payload;
  }
  return { ...payload, _validation_errors: errors };
}
