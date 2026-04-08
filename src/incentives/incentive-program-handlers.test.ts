import { describe, expect, it, vi } from 'vitest';

import { runCreateIncentiveProgram } from './incentive-program-handlers.js';

const projectId = '00000000-0000-4000-8000-000000000001';
const triggerId = '00000000-0000-4000-8000-000000000002';

describe('runCreateIncentiveProgram', () => {
  it('dry_run does not call postJson', async () => {
    const getJson = vi.fn().mockResolvedValue({ triggerType: 'Custom' });
    const postJson = vi.fn();
    const api = { getJson, postJson };
    const metadata = {
      getTriggerTypes: vi.fn().mockResolvedValue({
        trigger_types: [{ id: 'Custom', schema_status: 'present' }],
      }),
    };

    const result = await runCreateIncentiveProgram(api as never, metadata as never, {
      project_id: projectId,
      name: 'Test',
      trigger_ids: [triggerId],
      payout_terms: [{ type: 'onchain_currency' }],
      dry_run: true,
    });

    expect(postJson).not.toHaveBeenCalled();
    expect(result).toMatchObject({ dry_run: true, would_post: expect.stringContaining('incentives') });
  });

  it('confirmed calls postJson', async () => {
    const getJson = vi.fn().mockResolvedValue({ triggerType: 'Custom' });
    const postJson = vi.fn().mockResolvedValue({ id: 'new' });
    const api = { getJson, postJson };
    const metadata = {
      getTriggerTypes: vi.fn().mockResolvedValue({
        trigger_types: [{ id: 'Custom', schema_status: 'present' }],
      }),
    };

    await runCreateIncentiveProgram(api as never, metadata as never, {
      project_id: projectId,
      name: 'Test',
      trigger_ids: [triggerId],
      payout_terms: [{ type: 'onchain_currency' }],
      confirmed: true,
    });

    expect(postJson).toHaveBeenCalledWith(`/api/v1/projects/${projectId}/incentives`, {
      name: 'Test',
      trigger_ids: [triggerId],
      payout_terms: [{ type: 'onchain_currency' }],
    });
  });
});
