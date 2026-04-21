import { describe, expect, it, vi } from 'vitest';

import { runPayoutBatchAction } from './payout-batch-handlers.js';

const projectId = '00000000-0000-4000-8000-000000000001';
const payoutId = '00000000-0000-4000-8000-000000000002';

describe('runPayoutBatchAction', () => {
  it('dry_run does not patch', async () => {
    const patchJson = vi.fn();
    const api = { patchJson };
    const result = await runPayoutBatchAction(
      api as never,
      {
        project_id: projectId,
        payout_ids: [payoutId],
        dry_run: true,
      },
      'approve',
    );
    expect(patchJson).not.toHaveBeenCalled();
    expect(result).toMatchObject({ dry_run: true, would_patch: expect.stringContaining('approve') });
  });

  it('confirmed calls patchJson for reject', async () => {
    const patchJson = vi.fn().mockResolvedValue(undefined);
    const api = { patchJson };
    await runPayoutBatchAction(
      api as never,
      {
        project_id: projectId,
        payout_ids: [payoutId],
        confirmed: true,
      },
      'reject',
    );
    expect(patchJson).toHaveBeenCalledWith(`/api/v1/projects/${projectId}/payouts/reject`, {
      payout_ids: [payoutId],
    });
  });
});
