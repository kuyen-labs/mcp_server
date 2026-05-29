import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiRequestError } from '../http/fuul-api-client.js';
import { runCreateTrigger, runDeleteTrigger } from './trigger-write-handlers.js';

const projectId = '00000000-0000-4000-8000-000000000001';
const triggerId = '00000000-0000-4000-8000-000000000002';
const resolvedTriggerId = '00000000-0000-4000-8000-000000000099';
const toolTimeoutMs = 30_000;

const resolveDraftTriggerIdForWrite = vi.fn();

vi.mock('../metadata-scope/resolve-draft-ids.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../metadata-scope/resolve-draft-ids.js')>();
  return {
    ...actual,
    resolveDraftTriggerIdForWrite: (...args: unknown[]) => resolveDraftTriggerIdForWrite(...args),
  };
});

const tokenHolderBody = {
  name: 'Hold CRV',
  description: 'Daily holding of CRV on Ethereum',
  type: 'token-holder',
  context: {
    token_address: '0x1234567890123456789012345678901234567890',
    chain_id: 1,
    volume_currency_expression: '0x1234567890123456789012345678901234567890',
  },
};

describe('runCreateTrigger', () => {
  it('dry_run does not post', async () => {
    const postJson = vi.fn();
    const result = await runCreateTrigger({ postJson } as never, {
      project_id: projectId,
      trigger: tokenHolderBody,
      dry_run: true,
    });
    expect(postJson).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      dry_run: true,
      would_post: `/api/v1/projects/${projectId}/triggers`,
      body: tokenHolderBody,
    });
  });

  it('confirmed calls postJson', async () => {
    const postJson = vi.fn().mockResolvedValue({ id: triggerId });
    await runCreateTrigger({ postJson } as never, {
      project_id: projectId,
      trigger: tokenHolderBody,
      confirmed: true,
    });
    expect(postJson).toHaveBeenCalledWith(`/api/v1/projects/${projectId}/triggers`, tokenHolderBody);
  });
});

describe('runDeleteTrigger', () => {
  beforeEach(() => {
    resolveDraftTriggerIdForWrite.mockReset();
    resolveDraftTriggerIdForWrite.mockResolvedValue({
      requested_trigger_id: triggerId,
      resolved_draft_trigger_id: resolvedTriggerId,
      ref: 'hold-crv',
      reason: 'published_id_remapped_to_current_draft',
    });
  });

  it('dry_run resolves id and does not delete', async () => {
    const deleteJson = vi.fn();
    const result = await runDeleteTrigger({ deleteJson } as never, {
      project_id: projectId,
      trigger_id: triggerId,
      dry_run: true,
    }, toolTimeoutMs);
    expect(resolveDraftTriggerIdForWrite).toHaveBeenCalledWith(expect.anything(), projectId, triggerId, toolTimeoutMs);
    expect(deleteJson).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      dry_run: true,
      would_delete: `/api/v1/projects/${projectId}/triggers/${resolvedTriggerId}`,
      _draft_id_resolution: {
        resolved_draft_trigger_id: resolvedTriggerId,
        reason: 'published_id_remapped_to_current_draft',
      },
    });
  });

  it('confirmed deletes resolved draft id', async () => {
    const deleteJson = vi.fn().mockResolvedValue({ status: 'deleted' });
    await runDeleteTrigger({ deleteJson } as never, {
      project_id: projectId,
      trigger_id: triggerId,
      confirmed: true,
    }, toolTimeoutMs);
    expect(deleteJson).toHaveBeenCalledWith(`/api/v1/projects/${projectId}/triggers/${resolvedTriggerId}`);
  });

  it('422 adds guidance about incentives', async () => {
    const deleteJson = vi.fn().mockRejectedValue(new ApiRequestError('Trigger is used in conversions', 422));
    await expect(
      runDeleteTrigger({ deleteJson } as never, {
        project_id: projectId,
        trigger_id: triggerId,
        confirmed: true,
      }, toolTimeoutMs),
    ).rejects.toThrow(/delete_incentive/);
  });
});
