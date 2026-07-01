import type { FuulApiClient } from '../http/fuul-api-client.js';

export const ONCHAIN_PAYOUT_TERM_TYPE = 'onchain-currency';

export type EnsureProjectChainResult =
  | { action: 'skipped'; reason: 'no_onchain_payout_terms' }
  | { action: 'skipped'; reason: 'project_already_deployed' }
  | { action: 'skipped'; reason: 'chain_already_set'; chain_id: string }
  | {
      action: 'initialized';
      chain_id: string;
      dry_run?: true;
      would_patch_initialize?: { path: string; body: { chainId: string } };
    };

function normalizeChainId(value: unknown): string | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  return String(value);
}

function hasDeployedContract(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

export function extractOnChainPayoutChainIds(payoutTerms: Record<string, unknown>[]): string[] {
  const chainIds = new Set<string>();

  for (const term of payoutTerms) {
    if (term.type !== ONCHAIN_PAYOUT_TERM_TYPE) {
      continue;
    }

    const raw = term.payout_currency_chain_id;
    if (raw === null || raw === undefined || raw === '') {
      throw new Error('On-chain payout terms require payout_currency_chain_id (same field the dashboard uses when selecting a Token network).');
    }

    chainIds.add(String(raw));
  }

  return [...chainIds];
}

export async function ensureProjectChainForOnChainPayouts(
  api: FuulApiClient,
  projectId: string,
  payoutTerms: Record<string, unknown>[],
  dryRun?: boolean,
): Promise<EnsureProjectChainResult> {
  const chainIds = extractOnChainPayoutChainIds(payoutTerms);
  if (chainIds.length === 0) {
    return { action: 'skipped', reason: 'no_onchain_payout_terms' };
  }

  if (chainIds.length > 1) {
    throw new Error(`On-chain payout terms use multiple chains (${chainIds.join(', ')}). Use a single payout_currency_chain_id per write.`);
  }

  const payoutChainId = chainIds[0]!;
  const project = await api.getJson(`/api/v1/projects/${projectId}`);
  if (project === null || typeof project !== 'object' || Array.isArray(project)) {
    throw new Error(`Could not load project ${projectId}.`);
  }

  const projectRecord = project as Record<string, unknown>;
  if (hasDeployedContract(projectRecord.contract_address)) {
    return { action: 'skipped', reason: 'project_already_deployed' };
  }

  const existingChainId = normalizeChainId(projectRecord.contract_chain_id);
  if (existingChainId !== null) {
    if (existingChainId === payoutChainId) {
      return { action: 'skipped', reason: 'chain_already_set', chain_id: existingChainId };
    }

    throw new Error(
      `Project contract_chain_id is ${existingChainId} but on-chain payout uses payout_currency_chain_id ${payoutChainId}. Align chains in the dashboard or payout terms.`,
    );
  }

  const initializePath = `/api/v1/projects/${projectId}/initialize`;
  const initializeBody = { chainId: payoutChainId };

  if (dryRun === true) {
    return {
      action: 'initialized',
      chain_id: payoutChainId,
      dry_run: true,
      would_patch_initialize: { path: initializePath, body: initializeBody },
    };
  }

  await api.patchJson(initializePath, initializeBody);
  return { action: 'initialized', chain_id: payoutChainId };
}

export function attachProjectChainInit<T extends Record<string, unknown>>(
  payload: T,
  chainInit: EnsureProjectChainResult,
): T & { _project_chain_init?: EnsureProjectChainResult } {
  if (chainInit.action === 'skipped' && chainInit.reason === 'no_onchain_payout_terms') {
    return payload;
  }

  return { ...payload, _project_chain_init: chainInit };
}
