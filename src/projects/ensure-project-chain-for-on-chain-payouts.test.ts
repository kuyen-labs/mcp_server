import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ensureProjectChainForOnChainPayouts,
  extractOnChainPayoutChainIds,
  ONCHAIN_PAYOUT_TERM_TYPE,
} from './ensure-project-chain-for-on-chain-payouts.js';

const projectId = '00000000-0000-4000-8000-000000000001';

describe('extractOnChainPayoutChainIds', () => {
  it('returns empty when no on-chain terms', () => {
    expect(extractOnChainPayoutChainIds([{ type: 'point' }])).toEqual([]);
  });

  it('collects chain ids from on-chain terms', () => {
    expect(extractOnChainPayoutChainIds([{ type: ONCHAIN_PAYOUT_TERM_TYPE, payout_currency_chain_id: 8453 }, { type: 'point' }])).toEqual(['8453']);
  });

  it('throws when on-chain term lacks payout_currency_chain_id', () => {
    expect(() => extractOnChainPayoutChainIds([{ type: ONCHAIN_PAYOUT_TERM_TYPE }])).toThrow(/payout_currency_chain_id/);
  });
});

describe('ensureProjectChainForOnChainPayouts', () => {
  const getJson = vi.fn();
  const patchJson = vi.fn();
  const api = { getJson, patchJson } as never;

  beforeEach(() => {
    getJson.mockReset();
    patchJson.mockReset();
  });

  it('skips when payout terms are not on-chain', async () => {
    const result = await ensureProjectChainForOnChainPayouts(api, projectId, [{ type: 'point' }]);
    expect(result).toEqual({ action: 'skipped', reason: 'no_onchain_payout_terms' });
    expect(getJson).not.toHaveBeenCalled();
  });

  it('dry_run reports would_patch_initialize when project has no chain', async () => {
    getJson.mockResolvedValue({ contract_chain_id: null, contract_address: null });

    const result = await ensureProjectChainForOnChainPayouts(
      api,
      projectId,
      [{ type: ONCHAIN_PAYOUT_TERM_TYPE, payout_currency_chain_id: 8453 }],
      true,
    );

    expect(patchJson).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      action: 'initialized',
      chain_id: '8453',
      dry_run: true,
      would_patch_initialize: {
        path: `/api/v1/projects/${projectId}/initialize`,
        body: { chainId: '8453' },
      },
    });
  });

  it('patches initialize before confirmed on-chain writes when chain is unset', async () => {
    getJson.mockResolvedValue({ contract_chain_id: null, contract_address: null });
    patchJson.mockResolvedValue({ contract_chain_id: '8453' });

    const result = await ensureProjectChainForOnChainPayouts(api, projectId, [{ type: ONCHAIN_PAYOUT_TERM_TYPE, payout_currency_chain_id: 8453 }]);

    expect(patchJson).toHaveBeenCalledWith(`/api/v1/projects/${projectId}/initialize`, { chainId: '8453' });
    expect(result).toEqual({ action: 'initialized', chain_id: '8453' });
  });

  it('no-ops when project chain already matches payout chain', async () => {
    getJson.mockResolvedValue({ contract_chain_id: 8453, contract_address: null });

    const result = await ensureProjectChainForOnChainPayouts(api, projectId, [{ type: ONCHAIN_PAYOUT_TERM_TYPE, payout_currency_chain_id: '8453' }]);

    expect(patchJson).not.toHaveBeenCalled();
    expect(result).toEqual({ action: 'skipped', reason: 'chain_already_set', chain_id: '8453' });
  });

  it('skips when contract is already deployed', async () => {
    getJson.mockResolvedValue({ contract_chain_id: 8453, contract_address: '0xabc' });

    const result = await ensureProjectChainForOnChainPayouts(api, projectId, [{ type: ONCHAIN_PAYOUT_TERM_TYPE, payout_currency_chain_id: 8453 }]);

    expect(patchJson).not.toHaveBeenCalled();
    expect(result).toEqual({ action: 'skipped', reason: 'project_already_deployed' });
  });

  it('throws when project chain conflicts with payout chain', async () => {
    getJson.mockResolvedValue({ contract_chain_id: 1, contract_address: null });

    await expect(
      ensureProjectChainForOnChainPayouts(api, projectId, [{ type: ONCHAIN_PAYOUT_TERM_TYPE, payout_currency_chain_id: 8453 }]),
    ).rejects.toThrow(/contract_chain_id is 1/);
  });
});
