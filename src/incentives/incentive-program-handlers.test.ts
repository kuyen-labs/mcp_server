import { describe, expect, it, vi } from 'vitest';

import { runCreateIncentiveProgram, runUpdateIncentiveProgram } from './incentive-program-handlers.js';

const projectId = '00000000-0000-4000-8000-000000000001';
const triggerId = '00000000-0000-4000-8000-000000000002';
const conversionId = '00000000-0000-4000-8000-000000000003';

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

describe('runUpdateIncentiveProgram', () => {
  it('dry_run does not call patchJson', async () => {
    const getJson = vi.fn().mockResolvedValue({ triggerType: 'Custom' });
    const patchJson = vi.fn();
    const api = { getJson, patchJson };
    const metadata = {
      getTriggerTypes: vi.fn().mockResolvedValue({
        trigger_types: [{ id: 'Custom', schema_status: 'present' }],
      }),
    };

    const result = await runUpdateIncentiveProgram(api as never, metadata as never, {
      project_id: projectId,
      conversion_id: conversionId,
      name: 'Updated',
      trigger_ids: [triggerId],
      payout_terms: [{ type: 'onchain_currency' }],
      dry_run: true,
    });

    expect(patchJson).not.toHaveBeenCalled();
    expect(result).toMatchObject({ dry_run: true, would_patch: expect.stringContaining(conversionId) });
  });

  it('confirmed calls patchJson', async () => {
    const getJson = vi.fn().mockResolvedValue({ triggerType: 'Custom' });
    const patchJson = vi.fn().mockResolvedValue({ id: conversionId });
    const api = { getJson, patchJson };
    const metadata = {
      getTriggerTypes: vi.fn().mockResolvedValue({
        trigger_types: [{ id: 'Custom', schema_status: 'present' }],
      }),
    };

    await runUpdateIncentiveProgram(api as never, metadata as never, {
      project_id: projectId,
      conversion_id: conversionId,
      name: 'Updated',
      trigger_ids: [triggerId],
      payout_terms: [{ type: 'onchain_currency' }],
      confirmed: true,
    });

    expect(patchJson).toHaveBeenCalledWith(`/api/v1/projects/${projectId}/incentives/${conversionId}`, {
      name: 'Updated',
      trigger_ids: [triggerId],
      payout_terms: [{ type: 'onchain_currency' }],
    });
  });
});
