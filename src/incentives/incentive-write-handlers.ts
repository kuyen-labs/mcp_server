import { assertWriteConfirmedOrDryRun } from '../agent/write-confirmation.js';
import type { FuulApiClient } from '../http/fuul-api-client.js';
import {
  attachDraftIdResolution,
  resolveDraftConversionIdForWrite,
  resolveDraftTriggerIdsForWrite,
} from '../metadata-scope/resolve-draft-ids.js';
import { normalizePayoutTermBodyForPatch } from '../payouts/normalize-payout-term-body.js';
import type { CreateIncentiveInput, DeleteIncentiveInput } from '../tools/tool-schemas.js';

function buildCreateIncentiveBody(input: CreateIncentiveInput, triggerIds: string[]): Record<string, unknown> {
  return {
    name: input.name,
    trigger_ids: triggerIds,
    payout_terms: input.payout_terms.map((term) => normalizePayoutTermBodyForPatch(term as Record<string, unknown>)),
  };
}

export async function runCreateIncentive(
  api: FuulApiClient,
  input: CreateIncentiveInput,
  toolTimeoutMs: number,
): Promise<unknown> {
  assertWriteConfirmedOrDryRun(input);
  const triggerResolutions = await resolveDraftTriggerIdsForWrite(
    api,
    input.project_id,
    input.trigger_ids,
    toolTimeoutMs,
  );
  const resolvedTriggerIds = triggerResolutions.map((row) => row.resolved_draft_trigger_id);
  const path = `/api/v1/projects/${input.project_id}/incentives`;
  const body = buildCreateIncentiveBody(input, resolvedTriggerIds);

  if (input.dry_run === true) {
    return attachDraftIdResolution(
      {
        dry_run: true,
        would_post: path,
        body,
      },
      { triggers: triggerResolutions },
    );
  }

  const result = await api.postJson(path, body);
  return attachDraftIdResolution(result, { triggers: triggerResolutions });
}

export async function runDeleteIncentive(
  api: FuulApiClient,
  input: DeleteIncentiveInput,
  toolTimeoutMs: number,
): Promise<unknown> {
  assertWriteConfirmedOrDryRun(input);
  const resolution = await resolveDraftConversionIdForWrite(
    api,
    input.project_id,
    input.conversion_id,
    toolTimeoutMs,
  );
  const path = `/api/v1/projects/${input.project_id}/incentives/${resolution.resolved_draft_conversion_id}`;

  if (input.dry_run === true) {
    return attachDraftIdResolution(
      {
        dry_run: true,
        would_delete: path,
      },
      resolution,
    );
  }

  const result = await api.deleteJson(path);
  return attachDraftIdResolution(result ?? { ok: true }, resolution);
}
