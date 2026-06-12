import { assertWriteConfirmedOrDryRun } from '../agent/write-confirmation.js';
import type { FuulApiClient } from '../http/fuul-api-client.js';
import { attachDraftIdResolution, resolveDraftConversionIdForWrite, resolveDraftTriggerIdsForWrite } from '../metadata-scope/resolve-draft-ids.js';
import { type AmountRoundingNotice, attachAmountRounding, preparePayoutTermBodyForWrite } from '../payouts/normalize-payout-term-body.js';
import type { CreateIncentiveInput, DeleteIncentiveInput } from '../tools/tool-schemas.js';

function buildCreateIncentiveBody(
  input: CreateIncentiveInput,
  triggerIds: string[],
): { body: Record<string, unknown>; amountRounding: AmountRoundingNotice[] } {
  const amountRounding: AmountRoundingNotice[] = [];
  const payout_terms = input.payout_terms.map((term, index) => {
    const prepared = preparePayoutTermBodyForWrite(term as Record<string, unknown>);
    for (const notice of prepared.amountRounding) {
      amountRounding.push({
        ...notice,
        field: `payout_terms[${index}].${notice.field}`,
      });
    }
    return prepared.body;
  });

  return {
    body: {
      name: input.name,
      trigger_ids: triggerIds,
      payout_terms,
    },
    amountRounding,
  };
}

export async function runCreateIncentive(api: FuulApiClient, input: CreateIncentiveInput, toolTimeoutMs: number): Promise<unknown> {
  assertWriteConfirmedOrDryRun(input);
  const triggerResolutions = await resolveDraftTriggerIdsForWrite(api, input.project_id, input.trigger_ids, toolTimeoutMs);
  const resolvedTriggerIds = triggerResolutions.map((row) => row.resolved_draft_trigger_id);
  const path = `/api/v1/projects/${input.project_id}/incentives`;
  const { body, amountRounding } = buildCreateIncentiveBody(input, resolvedTriggerIds);

  if (input.dry_run === true) {
    return attachDraftIdResolution(
      attachAmountRounding(
        {
          dry_run: true,
          would_post: path,
          body,
        },
        amountRounding,
      ),
      { triggers: triggerResolutions },
    );
  }

  const result = await api.postJson(path, body);
  const responsePayload =
    result !== null && typeof result === 'object' && !Array.isArray(result)
      ? attachAmountRounding(result as Record<string, unknown>, amountRounding)
      : attachAmountRounding({ result }, amountRounding);
  return attachDraftIdResolution(responsePayload, { triggers: triggerResolutions });
}

export async function runDeleteIncentive(api: FuulApiClient, input: DeleteIncentiveInput, toolTimeoutMs: number): Promise<unknown> {
  assertWriteConfirmedOrDryRun(input);
  const resolution = await resolveDraftConversionIdForWrite(api, input.project_id, input.conversion_id, toolTimeoutMs);
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
