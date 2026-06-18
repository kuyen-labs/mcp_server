import { POOL_PAYOUT_CAPABILITY_SUMMARY, POOL_PAYOUT_UNSUPPORTED } from './pool-payout-guide.js';

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

export function isPoolSchemeTerm(term: Record<string, unknown>): boolean {
  return String(term.scheme ?? '').toLowerCase() === 'pool';
}

function collectPayoutTermsFromIncentive(data: Record<string, unknown>): Record<string, unknown>[] {
  const terms: Record<string, unknown>[] = [];

  const rootTerms = data.payout_terms;
  if (Array.isArray(rootTerms)) {
    for (const term of rootTerms) {
      const row = asRecord(term);
      if (row) {
        terms.push(row);
      }
    }
  }

  const draft = asRecord(data.draft);
  if (draft) {
    const draftTerms = draft.payout_terms;
    if (Array.isArray(draftTerms)) {
      for (const term of draftTerms) {
        const row = asRecord(term);
        if (row) {
          terms.push(row);
        }
      }
    }
  }

  return terms;
}

export function incentiveHasPoolScheme(data: unknown): boolean {
  const record = asRecord(data);
  if (!record) {
    return false;
  }
  return collectPayoutTermsFromIncentive(record).some(isPoolSchemeTerm);
}

export function buildPoolCapabilityBoundary(): Record<string, unknown> {
  return {
    ...POOL_PAYOUT_CAPABILITY_SUMMARY,
    unsupported_capabilities: [...POOL_PAYOUT_UNSUPPORTED],
    playbook_ref: 'list_payout_schemas → create_incentive_payload_guide.pool_payout_playbook',
    agent_discipline:
      'Before proposing pool config changes as actionable, confirm the field is in editable_fields and not in unsupported_capabilities. ' +
      'If the optimization requires unsupported behavior, state it is not available in Fuul and treat as a feature request.',
  };
}

export function enrichIncentiveWithPoolCapabilities<T extends Record<string, unknown>>(
  data: T,
): T & {
  _pool_capability_boundary?: ReturnType<typeof buildPoolCapabilityBoundary>;
} {
  if (!incentiveHasPoolScheme(data)) {
    return data;
  }

  return {
    ...data,
    _pool_capability_boundary: buildPoolCapabilityBoundary(),
  };
}

export type IncentivesListWithPoolFlags<T extends Record<string, unknown>> = T[] & {
  _contains_pool_scheme?: boolean;
  _pool_analysis_hint?: string;
};

export function enrichIncentivesListWithPoolFlags<T extends Record<string, unknown>>(list: T[]): IncentivesListWithPoolFlags<T> {
  const containsPool = list.some((item) => incentiveHasPoolScheme(item));

  if (!containsPool) {
    return list as IncentivesListWithPoolFlags<T>;
  }

  return Object.assign([...list], {
    _contains_pool_scheme: true,
    _pool_analysis_hint:
      'One or more incentives use scheme pool. Call get_incentive for details; response includes _pool_capability_boundary. ' +
      'Full rules: list_payout_schemas → pool_payout_playbook. Do not suggest dynamic/volume-banded pool sizing.',
  }) as IncentivesListWithPoolFlags<T>;
}
