/**
 * Scores an exported MCP tool trace against the tiered audience boost rubric.
 * Used for manual/nightly agent evals — not a substitute for unit tests.
 */

export type ToolCallTrace = {
  tool: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
};

export type RubricVerdict = 'pass' | 'fail' | 'manual';

export type RubricCriterionResult = {
  id: string;
  label: string;
  verdict: RubricVerdict;
  detail: string;
};

const WRITE_TOOLS = new Set(['create_incentive', 'update_payout_term']);
const TIER_TOOLS = new Set(['create_project_tier', 'update_project_tier']);
const DISCOVERY_TOOLS = new Set(['list_audiences', 'list_project_tiers']);

const CAP_FIELDS = [
  'payout_cap_enabled',
  'wallet_cap_enabled',
  'enduser_cap_enabled',
  'dynamic_referral_cap_enabled',
] as const;

function isTruthyFlag(value: unknown): boolean {
  return value === true || value === 'true';
}

function isTieredWriteInput(input: Record<string, unknown> | undefined): boolean {
  if (!input) {
    return false;
  }
  if (input.tier_type !== undefined && input.tier_type !== null && String(input.tier_type).trim() !== '') {
    return true;
  }
  const payoutTerm = input.payout_term;
  if (payoutTerm !== null && typeof payoutTerm === 'object' && !Array.isArray(payoutTerm)) {
    const tierType = (payoutTerm as Record<string, unknown>).tier_type;
    return tierType !== undefined && tierType !== null && String(tierType).trim() !== '';
  }
  const payoutTerms = input.payout_terms;
  if (Array.isArray(payoutTerms)) {
    return payoutTerms.some((term) => {
      if (term === null || typeof term !== 'object' || Array.isArray(term)) {
        return false;
      }
      const tierType = (term as Record<string, unknown>).tier_type;
      return tierType !== undefined && tierType !== null && String(tierType).trim() !== '';
    });
  }
  return false;
}

function firstTieredWriteIndex(calls: ToolCallTrace[]): number {
  return calls.findIndex((call) => WRITE_TOOLS.has(call.tool) && isTieredWriteInput(call.input));
}

function extractPayoutGroupsFromOutput(output: Record<string, unknown> | undefined): Record<string, unknown>[][] {
  if (!output) {
    return [];
  }

  const groups: Record<string, unknown>[][] = [];

  const body = output.body;
  if (body !== null && typeof body === 'object' && !Array.isArray(body)) {
    const bodyObj = body as Record<string, unknown>;
    const payoutTerms = bodyObj.payout_terms;
    if (Array.isArray(payoutTerms)) {
      for (const term of payoutTerms) {
        if (term !== null && typeof term === 'object' && !Array.isArray(term)) {
          const pg = (term as Record<string, unknown>).payout_groups;
          if (Array.isArray(pg)) {
            groups.push(pg.filter((g) => g !== null && typeof g === 'object' && !Array.isArray(g)) as Record<string, unknown>[]);
          }
        }
      }
    }
    const singleTerm = bodyObj.payout_term ?? bodyObj;
    if (singleTerm !== null && typeof singleTerm === 'object' && !Array.isArray(singleTerm)) {
      const pg = (singleTerm as Record<string, unknown>).payout_groups;
      if (Array.isArray(pg)) {
        groups.push(pg.filter((g) => g !== null && typeof g === 'object' && !Array.isArray(g)) as Record<string, unknown>[]);
      }
    }
  }

  return groups;
}

function collectGroupsFromInputs(calls: ToolCallTrace[]): Record<string, unknown>[][] {
  const groups: Record<string, unknown>[][] = [];

  for (const call of calls) {
    const input = call.input;
    if (!input) {
      continue;
    }
    const payoutTerm = input.payout_term;
    if (payoutTerm !== null && typeof payoutTerm === 'object' && !Array.isArray(payoutTerm)) {
      const pg = (payoutTerm as Record<string, unknown>).payout_groups;
      if (Array.isArray(pg)) {
        groups.push(pg.filter((g) => g !== null && typeof g === 'object' && !Array.isArray(g)) as Record<string, unknown>[]);
      }
    }
    const payoutTerms = input.payout_terms;
    if (Array.isArray(payoutTerms)) {
      for (const term of payoutTerms) {
        if (term !== null && typeof term === 'object' && !Array.isArray(term)) {
          const pg = (term as Record<string, unknown>).payout_groups;
          if (Array.isArray(pg)) {
            groups.push(pg.filter((g) => g !== null && typeof g === 'object' && !Array.isArray(g)) as Record<string, unknown>[]);
          }
        }
      }
    }
  }

  return groups;
}

function hasMultiplierInGroups(groups: Record<string, unknown>[][]): boolean {
  return groups.some((row) => row.some((g) => g.multiplier !== undefined && g.multiplier !== null));
}

function groupsMissingCaps(groups: Record<string, unknown>[][]): boolean {
  return groups.some((row) =>
    row.some((g) => CAP_FIELDS.some((field) => g[field] === undefined || g[field] === null)),
  );
}

function groupsWithAudienceIdWithoutTier(groups: Record<string, unknown>[][]): boolean {
  return groups.some((row) =>
    row.some((g) => {
      const hasAudience = g.audience_id !== undefined && g.audience_id !== null && g.audience_id !== '';
      const hasTier = g.project_tier_id !== undefined && g.project_tier_id !== null && g.project_tier_id !== '';
      return hasAudience && !hasTier;
    }),
  );
}

export function scoreTieredBoostToolTrace(calls: ToolCallTrace[]): RubricCriterionResult[] {
  const tieredWriteIdx = firstTieredWriteIndex(calls);
  const prefix = tieredWriteIdx >= 0 ? calls.slice(0, tieredWriteIdx) : calls;

  const hasListAudiences = prefix.some((c) => c.tool === 'list_audiences');
  const hasListTiers = prefix.some((c) => c.tool === 'list_project_tiers');
  const hasTierMutation = calls.some((c) => TIER_TOOLS.has(c.tool));

  const dryRunOutputs = calls
    .filter((c) => WRITE_TOOLS.has(c.tool) && isTruthyFlag(c.input?.dry_run))
    .map((c) => c.output);
  const dryRunGroups = dryRunOutputs.flatMap((o) => extractPayoutGroupsFromOutput(o));
  const inputGroups = collectGroupsFromInputs(calls);

  const confirmedWrites = calls.filter((c) => WRITE_TOOLS.has(c.tool) && isTruthyFlag(c.input?.confirmed));
  const dryRunWrites = calls.filter((c) => WRITE_TOOLS.has(c.tool) && isTruthyFlag(c.input?.dry_run));

  let twoStepPass = true;
  let twoStepDetail = 'No confirmed tiered writes in trace.';
  if (confirmedWrites.length > 0) {
    twoStepPass = confirmedWrites.every((confirmed) => {
      const tool = confirmed.tool;
      const projectId = confirmed.input?.project_id;
      return dryRunWrites.some(
        (dry) =>
          dry.tool === tool &&
          dry.input?.project_id === projectId &&
          (dry.input?.conversion_id === undefined || dry.input?.conversion_id === confirmed.input?.conversion_id),
      );
    });
    twoStepDetail = twoStepPass
      ? 'Each confirmed write was preceded by dry_run on the same tool.'
      : 'At least one confirmed write lacks a matching prior dry_run.';
  }

  const lastConfirmedIdx = calls.reduce((acc, call, idx) => {
    return WRITE_TOOLS.has(call.tool) && isTruthyFlag(call.input?.confirmed) ? idx : acc;
  }, -1);
  const readbackAfterWrite =
    lastConfirmedIdx >= 0 && calls.slice(lastConfirmedIdx + 1).some((c) => c.tool === 'get_incentive');

  const publishReminder = confirmedWrites.some((c) => {
    const out = c.output;
    if (!out) {
      return false;
    }
    const reminder = out._publish_metadata_reminder;
    return typeof reminder === 'string' && reminder.length > 0;
  });

  const discoveryVerdict: RubricVerdict =
    tieredWriteIdx < 0 ? 'manual' : hasListAudiences && hasListTiers ? 'pass' : 'fail';

  return [
    {
      id: 'discovery_lists',
      label: 'list_audiences and list_project_tiers before tiered write',
      verdict: discoveryVerdict,
      detail:
        tieredWriteIdx < 0
          ? 'No tiered write detected; discovery order not scored.'
          : `list_audiences=${hasListAudiences}, list_project_tiers=${hasListTiers} before first tiered write.`,
    },
    {
      id: 'tier_creation',
      label: 'create_project_tier or list_project_tiers for boosts',
      verdict:
        tieredWriteIdx < 0 ? 'manual' : hasTierMutation || hasListTiers ? 'pass' : 'fail',
      detail:
        tieredWriteIdx < 0
          ? 'No tiered write in trace.'
          : hasTierMutation
            ? 'Tier mutation tool present.'
            : hasListTiers
              ? 'list_project_tiers used (reuse existing tier).'
              : 'No tier list or create before write.',
    },
    {
      id: 'tier_rank',
      label: 'Boost tier rank above Default Tier',
      verdict: 'manual',
      detail: 'Inspect create_project_tier rank vs Default Tier in list_project_tiers.',
    },
    {
      id: 'project_tier_id_wire',
      label: 'payout_groups use project_tier_id, not audience_id',
      verdict:
        dryRunGroups.length === 0
          ? groupsWithAudienceIdWithoutTier(inputGroups)
            ? 'fail'
            : 'manual'
          : groupsWithAudienceIdWithoutTier(dryRunGroups)
            ? 'fail'
            : 'pass',
      detail:
        dryRunGroups.length === 0
          ? 'No dry_run payout_groups in trace; check inputs manually.'
          : groupsWithAudienceIdWithoutTier(dryRunGroups)
            ? 'dry_run body still has audience_id without project_tier_id.'
            : 'dry_run groups use project_tier_id or base group only.',
    },
    {
      id: 'caps_on_groups',
      label: 'Cap booleans on each payout group',
      verdict: dryRunGroups.length === 0 ? 'manual' : groupsMissingCaps(dryRunGroups) ? 'fail' : 'pass',
      detail:
        dryRunGroups.length === 0
          ? 'No dry_run output to inspect; MCP injects caps in normalization.'
          : groupsMissingCaps(dryRunGroups)
            ? 'At least one group missing *_cap_enabled in dry_run body.'
            : 'All groups include cap booleans in dry_run body.',
    },
    {
      id: 'no_multiplier',
      label: 'No multiplier field; precomputed percentages',
      verdict:
        hasMultiplierInGroups(inputGroups) || (dryRunGroups.length > 0 && hasMultiplierInGroups(dryRunGroups))
          ? 'fail'
          : 'pass',
      detail: hasMultiplierInGroups(inputGroups)
        ? 'multiplier found in write inputs.'
        : dryRunGroups.length > 0 && hasMultiplierInGroups(dryRunGroups)
          ? 'multiplier found in dry_run body.'
          : 'No multiplier in inputs or dry_run body.',
    },
    {
      id: 'dry_run_before_confirmed',
      label: 'dry_run before confirmed on write tools',
      verdict: confirmedWrites.length === 0 ? 'manual' : twoStepPass ? 'pass' : 'fail',
      detail: twoStepDetail,
    },
    {
      id: 'get_incentive_readback',
      label: 'get_incentive after confirmed tiered write',
      verdict: lastConfirmedIdx < 0 ? 'manual' : readbackAfterWrite ? 'pass' : 'fail',
      detail:
        lastConfirmedIdx < 0
          ? 'No confirmed write in trace.'
          : readbackAfterWrite
            ? 'get_incentive called after last confirmed write.'
            : 'Missing get_incentive readback after confirmed write.',
    },
    {
      id: 'publish_reminder',
      label: 'Confirmed response includes publish metadata reminder',
      verdict: confirmedWrites.length === 0 ? 'manual' : publishReminder ? 'pass' : 'fail',
      detail:
        confirmedWrites.length === 0
          ? 'No confirmed write in trace.'
          : publishReminder
            ? '_publish_metadata_reminder present on confirmed output.'
            : 'Missing _publish_metadata_reminder on confirmed write output.',
    },
  ];
}

export function summarizeRubric(results: RubricCriterionResult[]): {
  pass: number;
  fail: number;
  manual: number;
  automatablePass: boolean;
} {
  const pass = results.filter((r) => r.verdict === 'pass').length;
  const fail = results.filter((r) => r.verdict === 'fail').length;
  const manual = results.filter((r) => r.verdict === 'manual').length;
  const automatablePass = fail === 0;
  return { pass, fail, manual, automatablePass };
}
