import { beforeEach, describe, expect, it, vi } from 'vitest';

import { runCreateIncentive } from './incentive-write-handlers.js';

const projectId = '00000000-0000-4000-8000-000000000001';
const triggerId = '00000000-0000-4000-8000-000000000003';
const resolvedTriggerId = '00000000-0000-4000-8000-000000000098';
const tierId = '11111111-1111-4111-8111-111111111111';
const audienceId = '22222222-2222-4222-8222-222222222222';
const toolTimeoutMs = 30_000;

const resolveDraftTriggerIdsForWrite = vi.fn();

vi.mock('../metadata-scope/resolve-draft-ids.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../metadata-scope/resolve-draft-ids.js')>();
  return {
    ...actual,
    resolveDraftTriggerIdsForWrite: (...args: unknown[]) => resolveDraftTriggerIdsForWrite(...args),
  };
});

const CAP_DEFAULTS = {
  payout_cap_enabled: false,
  wallet_cap_enabled: false,
  enduser_cap_enabled: false,
  dynamic_referral_cap_enabled: false,
};

function tieredVariableTerm(overrides: { groups: Record<string, unknown>[] }) {
  return {
    scheme: 'pay-per-attribution',
    calculation_strategy: 'variable',
    type: 'point',
    payee_type: 'end-user',
    base_currency: 'none',
    tier_type: 'audience',
    payout_groups: overrides.groups,
  };
}

describe('tiered boost agent regression (create_incentive dry_run)', () => {
  beforeEach(() => {
    resolveDraftTriggerIdsForWrite.mockReset();
    resolveDraftTriggerIdsForWrite.mockResolvedValue([
      {
        requested_trigger_id: triggerId,
        resolved_draft_trigger_id: resolvedTriggerId,
        ref: 'swap',
        reason: 'current_draft',
      },
    ]);
  });

  it('anti-pattern: audience_id on group yields _warnings (Dre Money mistake)', async () => {
    const result = await runCreateIncentive(
      { postJson: vi.fn() } as never,
      {
        project_id: projectId,
        name: 'Tiered boost',
        trigger_ids: [triggerId],
        payout_terms: [
          tieredVariableTerm({
            groups: [
              { end_user_amount_percentage: 0.3 },
              { audience_id: audienceId, end_user_amount_percentage: 0.45 },
            ],
          }),
        ],
        dry_run: true,
      },
      toolTimeoutMs,
    );

    const warnings = (result as { _warnings?: { property: string }[] })._warnings ?? [];
    expect(warnings.some((w) => w.property.includes('audience_id'))).toBe(true);
  });

  it('correct pattern: project_tier_id, caps injected, no warnings', async () => {
    const result = await runCreateIncentive(
      { postJson: vi.fn() } as never,
      {
        project_id: projectId,
        name: 'Tiered boost',
        trigger_ids: [triggerId],
        payout_terms: [
          tieredVariableTerm({
            groups: [
              { end_user_amount_percentage: 0.3 },
              { project_tier_id: tierId, end_user_amount_percentage: 0.45 },
            ],
          }),
        ],
        dry_run: true,
      },
      toolTimeoutMs,
    );

    expect(result).not.toHaveProperty('_warnings');
    const terms = (result as { body: { payout_terms: Record<string, unknown>[] } }).body.payout_terms;
    expect(terms[0]?.payout_groups).toEqual([
      { end_user_amount_percentage: 0.3, ...CAP_DEFAULTS },
      { project_tier_id: tierId, end_user_amount_percentage: 0.45, ...CAP_DEFAULTS },
    ]);
    expect(terms[0]).not.toHaveProperty('referral_amount_percentage');
  });

  it('anti-pattern: term-level amounts stripped when tier_type is set', async () => {
    const result = await runCreateIncentive(
      { postJson: vi.fn() } as never,
      {
        project_id: projectId,
        name: 'Tiered boost',
        trigger_ids: [triggerId],
        payout_terms: [
          {
            ...tieredVariableTerm({
              groups: [{ end_user_amount_percentage: 0.3 }],
            }),
            referral_amount_percentage: 0.3,
            referrer_amount: '0.1',
          },
        ],
        dry_run: true,
      },
      toolTimeoutMs,
    );

    const term = (result as { body: { payout_terms: Record<string, unknown>[] } }).body.payout_terms[0];
    expect(term).not.toHaveProperty('referral_amount_percentage');
    expect(term).not.toHaveProperty('referrer_amount');
  });

  it('anti-pattern: referral_amount alias on boost group maps to end_user_amount_percentage', async () => {
    const result = await runCreateIncentive(
      { postJson: vi.fn() } as never,
      {
        project_id: projectId,
        name: 'Tiered boost',
        trigger_ids: [triggerId],
        payout_terms: [
          tieredVariableTerm({
            groups: [
              { end_user_amount_percentage: 0.3 },
              { project_tier_id: tierId, referral_amount: 0.45 },
            ],
          }),
        ],
        dry_run: true,
      },
      toolTimeoutMs,
    );

    const groups = (result as { body: { payout_terms: { payout_groups: Record<string, unknown>[] }[] } }).body
      .payout_terms[0]?.payout_groups;
    expect(groups?.[1]).toMatchObject({
      project_tier_id: tierId,
      end_user_amount_percentage: 0.45,
      ...CAP_DEFAULTS,
    });
    expect(groups?.[1]).not.toHaveProperty('referral_amount');
  });
});
