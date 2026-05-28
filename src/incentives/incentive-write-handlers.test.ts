import { describe, expect, it, vi } from 'vitest';

import { runCreateIncentive, runDeleteIncentive } from './incentive-write-handlers.js';

const projectId = '00000000-0000-4000-8000-000000000001';
const conversionId = '00000000-0000-4000-8000-000000000002';
const triggerId = '00000000-0000-4000-8000-000000000003';

describe('runCreateIncentive', () => {
  it('dry_run normalizes variable payout terms', async () => {
    const postJson = vi.fn();
    const result = await runCreateIncentive({ postJson } as never, {
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
    });
    expect(postJson).not.toHaveBeenCalled();
    const body = (result as { body: Record<string, unknown> }).body;
    const terms = body.payout_terms as Record<string, unknown>[];
    expect(terms[0]).toMatchObject({
      referral_amount_percentage: 2,
      referrer_amount_percentage: 6,
    });
    expect(terms[0]).not.toHaveProperty('referral_amount');
  });

  it('confirmed posts normalized body', async () => {
    const postJson = vi.fn().mockResolvedValue(undefined);
    await runCreateIncentive({ postJson } as never, {
      project_id: projectId,
      name: 'Test',
      trigger_ids: [triggerId],
      payout_terms: [{ scheme: 'fixed', type: 'token', payee_type: 'referral' }],
      confirmed: true,
    });
    expect(postJson).toHaveBeenCalledWith(`/api/v1/projects/${projectId}/incentives`, {
      name: 'Test',
      trigger_ids: [triggerId],
      payout_terms: [{ scheme: 'fixed', type: 'token', payee_type: 'referral' }],
    });
  });
});

describe('runDeleteIncentive', () => {
  it('dry_run does not delete', async () => {
    const deleteJson = vi.fn();
    const result = await runDeleteIncentive({ deleteJson } as never, {
      project_id: projectId,
      conversion_id: conversionId,
      dry_run: true,
    });
    expect(deleteJson).not.toHaveBeenCalled();
    expect(result).toMatchObject({ dry_run: true });
  });

  it('confirmed calls deleteJson', async () => {
    const deleteJson = vi.fn().mockResolvedValue({ status: 'deleted' });
    await runDeleteIncentive({ deleteJson } as never, {
      project_id: projectId,
      conversion_id: conversionId,
      confirmed: true,
    });
    expect(deleteJson).toHaveBeenCalledWith(`/api/v1/projects/${projectId}/incentives/${conversionId}`);
  });
});
