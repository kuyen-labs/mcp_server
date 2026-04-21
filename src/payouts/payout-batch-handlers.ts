import { assertWriteConfirmedOrDryRun } from '../agent/write-confirmation.js';
import type { FuulApiClient } from '../http/fuul-api-client.js';
import type { PayoutBatchActionInput } from '../tools/tool-schemas.js';

function buildBody(input: PayoutBatchActionInput): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  if (input.payout_ids?.length) {
    o.payout_ids = input.payout_ids;
  }
  if (input.from_date) {
    o.from_date = input.from_date;
  }
  if (input.to_date) {
    o.to_date = input.to_date;
  }
  if (input.user_address) {
    o.user_address = input.user_address;
  }
  if (input.affiliate_address) {
    o.affiliate_address = input.affiliate_address;
  }
  return o;
}

export async function runPayoutBatchAction(api: FuulApiClient, input: PayoutBatchActionInput, action: 'approve' | 'reject'): Promise<unknown> {
  assertWriteConfirmedOrDryRun(input);
  const body = buildBody(input);
  const path = `/api/v1/projects/${input.project_id}/payouts/${action}`;

  if (input.dry_run === true) {
    return {
      dry_run: true,
      would_patch: `PATCH ${path}`,
      body,
    };
  }

  return api.patchJson(path, body);
}
