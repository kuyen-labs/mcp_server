import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiRequestError } from '../http/fuul-api-client.js';
import { DAI_ETHEREUM, EXAMPLE_UNKNOWN_STABLECOIN_18D } from './price-reference-guide.js';
import { runCreateTrigger, runDeleteTrigger } from './trigger-write-handlers.js';

const fetchPriceReferences = vi.fn();
vi.mock('../currencies/fetch-price-references.js', () => ({
  fetchPriceReferences: (...args: unknown[]) => fetchPriceReferences(...args),
}));

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
  name: 'Hold DAI',
  description: 'Daily holding of DAI on Ethereum',
  type: 'token-holder',
  context: {
    token_address: DAI_ETHEREUM,
    chain_id: 1,
    volume_currency_expression: DAI_ETHEREUM,
  },
};

const ethereumRefs = [
  {
    id: '1',
    name: 'DAI',
    identifier: DAI_ETHEREUM,
    chain_identifier: 'ethereum',
    decimals: 18,
  },
];

describe('runCreateTrigger', () => {
  beforeEach(() => {
    fetchPriceReferences.mockReset();
    fetchPriceReferences.mockResolvedValue(ethereumRefs);
  });

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

  it('confirmed token-holder adds _price_reference_warning', async () => {
    const postJson = vi.fn().mockResolvedValue({ id: triggerId });
    const result = await runCreateTrigger({ postJson } as never, {
      project_id: projectId,
      trigger: tokenHolderBody,
      confirmed: true,
    });
    expect(result).toMatchObject({
      id: triggerId,
      _price_reference_warning: expect.stringContaining('list_price_references'),
    });
  });

  it('rejects unlisted token when volume_currency_expression equals token_address', async () => {
    const postJson = vi.fn();
    await expect(
      runCreateTrigger({ postJson, getJson: vi.fn() } as never, {
        project_id: projectId,
        trigger: {
          ...tokenHolderBody,
          context: {
            token_address: EXAMPLE_UNKNOWN_STABLECOIN_18D,
            chain_id: 1,
            volume_currency_expression: EXAMPLE_UNKNOWN_STABLECOIN_18D,
          },
        },
        confirmed: true,
      }),
    ).rejects.toThrow(/resolve_token_holder_price_reference/);
    expect(postJson).not.toHaveBeenCalled();
  });

  it('confirmed custom trigger does not add _price_reference_warning', async () => {
    const postJson = vi.fn().mockResolvedValue({ id: triggerId });
    const result = await runCreateTrigger({ postJson } as never, {
      project_id: projectId,
      trigger: {
        name: 'Event',
        description: 'Off-chain',
        type: 'custom',
        signature: 'evt',
        event_type: 'off-chain-event',
      },
      confirmed: true,
    });
    expect(result).toEqual({ id: triggerId });
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
    const result = await runDeleteTrigger(
      { deleteJson } as never,
      {
        project_id: projectId,
        trigger_id: triggerId,
        dry_run: true,
      },
      toolTimeoutMs,
    );
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
    await runDeleteTrigger(
      { deleteJson } as never,
      {
        project_id: projectId,
        trigger_id: triggerId,
        confirmed: true,
      },
      toolTimeoutMs,
    );
    expect(deleteJson).toHaveBeenCalledWith(`/api/v1/projects/${projectId}/triggers/${resolvedTriggerId}`);
  });

  it('422 adds guidance about incentives', async () => {
    const deleteJson = vi.fn().mockRejectedValue(new ApiRequestError('Trigger is used in conversions', 422));
    await expect(
      runDeleteTrigger(
        { deleteJson } as never,
        {
          project_id: projectId,
          trigger_id: triggerId,
          confirmed: true,
        },
        toolTimeoutMs,
      ),
    ).rejects.toThrow(/delete_incentive/);
  });
});
