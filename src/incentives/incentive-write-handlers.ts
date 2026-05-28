import { assertWriteConfirmedOrDryRun } from '../agent/write-confirmation.js';
import type { FuulApiClient } from '../http/fuul-api-client.js';
import { normalizePayoutTermBodyForPatch } from '../payouts/normalize-payout-term-body.js';
import type { CreateIncentiveInput, DeleteIncentiveInput } from '../tools/tool-schemas.js';

function buildCreateIncentiveBody(input: CreateIncentiveInput): Record<string, unknown> {
  return {
    name: input.name,
    trigger_ids: input.trigger_ids,
    payout_terms: input.payout_terms.map((term) => normalizePayoutTermBodyForPatch(term as Record<string, unknown>)),
  };
}

export async function runCreateIncentive(api: FuulApiClient, input: CreateIncentiveInput): Promise<unknown> {
  assertWriteConfirmedOrDryRun(input);
  const path = `/api/v1/projects/${input.project_id}/incentives`;
  const body = buildCreateIncentiveBody(input);

  if (input.dry_run === true) {
    return {
      dry_run: true,
      would_post: path,
      body,
    };
  }

  return api.postJson(path, body);
}

export async function runDeleteIncentive(api: FuulApiClient, input: DeleteIncentiveInput): Promise<unknown> {
  assertWriteConfirmedOrDryRun(input);
  const path = `/api/v1/projects/${input.project_id}/incentives/${input.conversion_id}`;

  if (input.dry_run === true) {
    return {
      dry_run: true,
      would_delete: path,
    };
  }

  return api.deleteJson(path);
}
