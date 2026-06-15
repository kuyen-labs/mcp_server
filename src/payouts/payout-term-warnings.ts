export type PayoutTermWarning = {
  property: string;
  message: string;
};

function hasTierType(body: Record<string, unknown>): boolean {
  const tierType = body.tier_type;
  return tierType !== undefined && tierType !== null && String(tierType).trim() !== '';
}

function isPresent(value: unknown): boolean {
  return value !== undefined && value !== null && value !== '';
}

export function collectPayoutTermWarnings(body: Record<string, unknown>): PayoutTermWarning[] {
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
