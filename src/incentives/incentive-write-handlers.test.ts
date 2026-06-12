import { beforeEach, describe, expect, it, vi } from 'vitest';

import { runCreateIncentive, runDeleteIncentive } from './incentive-write-handlers.js';

const projectId = '00000000-0000-4000-8000-000000000001';
const conversionId = '00000000-0000-4000-8000-000000000002';
const resolvedConversionId = '00000000-0000-4000-8000-000000000099';
const triggerId = '00000000-0000-4000-8000-000000000003';
const resolvedTriggerId = '00000000-0000-4000-8000-000000000098';
const toolTimeoutMs = 30_000;

const resolveDraftTriggerIdsForWrite = vi.fn();
const resolveDraftConversionIdForWrite = vi.fn();

vi.mock('../metadata-scope/resolve-draft-ids.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../metadata-scope/resolve-draft-ids.js')>();
  return {
    ...actual,
    resolveDraftTriggerIdsForWrite: (...args: unknown[]) => resolveDraftTriggerIdsForWrite(...args),
    resolveDraftConversionIdForWrite: (...args: unknown[]) => resolveDraftConversionIdForWrite(...args),
  };
});

describe('runCreateIncentive', () => {
  beforeEach(() => {
    resolveDraftTriggerIdsForWrite.mockReset();
    resolveDraftTriggerIdsForWrite.mockResolvedValue([
      {
        requested_trigger_id: triggerId,
        resolved_draft_trigger_id: resolvedTriggerId,
        ref: 'hold-crv',
        reason: 'current_draft',
      },
    ]);
  });

  it('dry_run normalizes variable payout terms and resolves trigger ids', async () => {
    const postJson = vi.fn();
    const result = await runCreateIncentive(
      { postJson } as never,
      {
        project_id: projectId,
        name: 'Fixed reward',
        trigger_ids: [triggerId],
        payout_terms: [
          {
            calculation_strategy: 'variable',
            type: 'point',
            payee_type: 'both',
            base_currency: null,
            referral_amount: '2',
            referrer_amount: '6',
          },
        ],
        dry_run: true,
      },
      toolTimeoutMs,
    );
    expect(postJson).not.toHaveBeenCalled();
    const body = (result as { body: Record<string, unknown> }).body;
    const terms = body.payout_terms as Record<string, unknown>[];
    expect(body.trigger_ids).toEqual([resolvedTriggerId]);
    expect(terms[0]).toMatchObject({
      referral_amount_percentage: 2,
      referrer_amount_percentage: 6,
    });
    expect(terms[0]).not.toHaveProperty('referral_amount');
  });

  it('dry_run rounds fixed point decimal amounts and reports _amount_rounding', async () => {
    const postJson = vi.fn();
    const result = await runCreateIncentive(
      { postJson } as never,
      {
        project_id: projectId,
        name: 'Fixed points',
        trigger_ids: [triggerId],
        payout_terms: [
          {
            calculation_strategy: 'fixed',
            type: 'point',
            payee_type: 'affiliate',
            referrer_amount: '7.5',
          },
        ],
        dry_run: true,
      },
      toolTimeoutMs,
    );

    expect(postJson).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      _amount_rounding: [{ field: 'payout_terms[0].referrer_amount', from: '7.5', to: '8' }],
    });
    const terms = (result as { body: Record<string, unknown> }).body.payout_terms as Record<string, unknown>[];
    expect(terms[0].referrer_amount).toBe('8');
  });

  it('confirmed posts normalized body with resolved trigger ids', async () => {
    const postJson = vi.fn().mockResolvedValue(undefined);
    await runCreateIncentive(
      { postJson } as never,
      {
        project_id: projectId,
        name: 'Test',
        trigger_ids: [triggerId],
        payout_terms: [{ scheme: 'fixed', type: 'token', payee_type: 'referral' }],
        confirmed: true,
      },
      toolTimeoutMs,
    );
    expect(postJson).toHaveBeenCalledWith(`/api/v1/projects/${projectId}/incentives`, {
      name: 'Test',
      trigger_ids: [resolvedTriggerId],
      payout_terms: [{ scheme: 'fixed', type: 'token', payee_type: 'referral' }],
    });
  });
});

describe('runDeleteIncentive', () => {
  beforeEach(() => {
    resolveDraftConversionIdForWrite.mockReset();
    resolveDraftConversionIdForWrite.mockResolvedValue({
      requested_conversion_id: conversionId,
      resolved_draft_conversion_id: resolvedConversionId,
      slug: 'program-a',
      reason: 'current_draft',
    });
  });

  it('dry_run does not delete', async () => {
    const deleteJson = vi.fn();
    const result = await runDeleteIncentive(
      { deleteJson } as never,
      {
        project_id: projectId,
        conversion_id: conversionId,
        dry_run: true,
      },
      toolTimeoutMs,
    );
    expect(deleteJson).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      dry_run: true,
      would_delete: `/api/v1/projects/${projectId}/incentives/${resolvedConversionId}`,
    });
  });

  it('confirmed calls deleteJson with resolved conversion id', async () => {
    const deleteJson = vi.fn().mockResolvedValue({ status: 'deleted' });
    await runDeleteIncentive(
      { deleteJson } as never,
      {
        project_id: projectId,
        conversion_id: conversionId,
        confirmed: true,
      },
      toolTimeoutMs,
    );
    expect(deleteJson).toHaveBeenCalledWith(`/api/v1/projects/${projectId}/incentives/${resolvedConversionId}`);
  });
});
