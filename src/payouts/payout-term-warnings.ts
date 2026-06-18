export type PayoutTermWarning = {
  property: string;
  message: string;
};

function hasTierType(body: Record<string, unknown>): boolean {
  const tierType = body.tier_type;
  return tierType !== undefined && tierType !== null && String(tierType).trim() !== '';
}

function isPoolScheme(body: Record<string, unknown>): boolean {
  return String(body.scheme ?? '').toLowerCase() === 'pool';
}

function isPresent(value: unknown): boolean {
  return value !== undefined && value !== null && value !== '';
}

function collectTieredPayoutTermWarnings(body: Record<string, unknown>): PayoutTermWarning[] {
  if (!hasTierType(body)) {
    return [];
  }

  const warnings: PayoutTermWarning[] = [];
  const groups = body.payout_groups;

  if (!Array.isArray(groups)) {
    return warnings;
  }

  groups.forEach((group, index) => {
    if (group === null || typeof group !== 'object' || Array.isArray(group)) {
      return;
    }

    const groupObj = group as Record<string, unknown>;
    const prefix = `payout_groups[${index}]`;
    const hasAudienceId = isPresent(groupObj.audience_id);
    const hasProjectTierId = isPresent(groupObj.project_tier_id);

    if (hasAudienceId && !hasProjectTierId) {
      warnings.push({
        property: `${prefix}.audience_id`,
        message:
          'payout_groups should use project_tier_id (tier linked to the audience), not audience_id directly. ' +
          'Call list_project_tiers and list_audiences; create or pick a tier with audience_id, then reference project_tier_id on the group.',
      });
    }
  });

  return warnings;
}

function collectPoolPayoutTermWarnings(body: Record<string, unknown>): PayoutTermWarning[] {
  if (!isPoolScheme(body)) {
    return [];
  }

  const warnings: PayoutTermWarning[] = [];

  if (payeeType(body) === 'both') {
    warnings.push({
      property: 'payee_type',
      message: 'payee_type "both" is not supported for scheme pool — use "affiliate" or "end-user".',
    });
  }

  const amountSource = String(body.amount_source ?? '').toLowerCase();
  if (amountSource === 'attribution-count') {
    warnings.push({
      property: 'amount_source',
      message: 'amount_source "attribution-count" is not implemented for pool runtime — use "volume" or "revenue".',
    });
  }

  const unsupportedHints = [
    ['pool_amount_formula', 'Dynamic pool formulas are not supported — pool_amount must be a fixed value per cycle.'],
    ['dynamic_pool_amount', 'Dynamic pool_amount is not supported — set a fixed pool_amount string per cycle.'],
    ['volume_bands', 'Volume-banded pool sizing is not supported — see pool_payout_playbook.unsupported_capabilities.'],
    ['pool_tiers', 'Volume-banded pool tiers are not supported — use fixed pool_amount with linear or square_root distribution.'],
  ] as const;

  for (const [field, message] of unsupportedHints) {
    if (isPresent(body[field])) {
      warnings.push({ property: field, message });
    }
  }

  return warnings;
}

function payeeType(body: Record<string, unknown>): string {
  return String(body.payee_type ?? '').toLowerCase();
}

export function collectPayoutTermWarnings(body: Record<string, unknown>): PayoutTermWarning[] {
  return [...collectTieredPayoutTermWarnings(body), ...collectPoolPayoutTermWarnings(body)];
}

export function attachPayoutTermWarnings<T extends Record<string, unknown>>(
  payload: T,
  warnings: PayoutTermWarning[],
): T & { _warnings?: PayoutTermWarning[] } {
  if (warnings.length === 0) {
    return payload;
  }

  return { ...payload, _warnings: warnings };
}

export function payoutTermHasTierType(body: Record<string, unknown>): boolean {
  return hasTierType(body);
}

export function payoutTermHasPoolScheme(body: Record<string, unknown>): boolean {
  return isPoolScheme(body);
}
