import { assertWriteConfirmedOrDryRun } from '../agent/write-confirmation.js';
import type { FuulApiClient } from '../http/fuul-api-client.js';
import { attachDraftIdResolution, resolveDraftConversionIdForWrite, resolveDraftTriggerIdsForWrite } from '../metadata-scope/resolve-draft-ids.js';
import { type AmountRoundingNotice, attachAmountRounding, preparePayoutTermBodyForWrite } from '../payouts/normalize-payout-term-body.js';
import { attachValidationErrors, type PayoutTermValidationError } from '../payouts/payout-term-amounts-validation.js';
import { attachPayoutTermWarnings, type PayoutTermWarning } from '../payouts/payout-term-warnings.js';
import { attachProjectChainInit, ensureProjectChainForOnChainPayouts } from '../projects/ensure-project-chain-for-on-chain-payouts.js';
import type { CreateIncentiveInput, DeleteIncentiveInput, UpdateIncentiveTriggersInput, UpdatePayoutTermInput } from '../tools/tool-schemas.js';

function prefixField(prefix: string, field: string): string {
  return field.startsWith(prefix) ? field : `${prefix}.${field}`;
}

function preparePayoutTermsForWrite(
  payoutTerms: Record<string, unknown>[],
  fieldPrefix: string,
): {
  payout_terms: Record<string, unknown>[];
  amountRounding: AmountRoundingNotice[];
  validationErrors: PayoutTermValidationError[];
  warnings: PayoutTermWarning[];
} {
  const amountRounding: AmountRoundingNotice[] = [];
  const validationErrors: PayoutTermValidationError[] = [];
  const warnings: PayoutTermWarning[] = [];

  const preparedTerms = payoutTerms.map((term, index) => {
    const termPrefix = `${fieldPrefix}[${index}]`;
    const prepared = preparePayoutTermBodyForWrite(term);

    for (const notice of prepared.amountRounding) {
      amountRounding.push({
        ...notice,
        field: prefixField(termPrefix, notice.field),
      });
    }

    for (const error of prepared.validationErrors) {
      validationErrors.push({
        ...error,
        property: prefixField(termPrefix, error.property),
      });
    }

    for (const warning of prepared.warnings) {
      warnings.push({
        ...warning,
        property: prefixField(termPrefix, warning.property),
      });
    }

    return prepared.body;
  });

  return { payout_terms: preparedTerms, amountRounding, validationErrors, warnings };
}

function buildCreateIncentiveBody(
  input: CreateIncentiveInput,
  triggerIds: string[],
): {
  body: Record<string, unknown>;
  amountRounding: AmountRoundingNotice[];
  validationErrors: PayoutTermValidationError[];
  warnings: PayoutTermWarning[];
} {
  const { payout_terms, amountRounding, validationErrors, warnings } = preparePayoutTermsForWrite(
    input.payout_terms as Record<string, unknown>[],
    'payout_terms',
  );

  return {
    body: {
      name: input.name,
      trigger_ids: triggerIds,
      payout_terms,
    },
    amountRounding,
    validationErrors,
    warnings,
  };
}

function attachWritePreviewMetadata<T extends Record<string, unknown>>(
  payload: T,
  amountRounding: AmountRoundingNotice[],
  validationErrors: PayoutTermValidationError[],
  warnings: PayoutTermWarning[] = [],
): T & { _amount_rounding?: AmountRoundingNotice[]; _validation_errors?: PayoutTermValidationError[]; _warnings?: PayoutTermWarning[] } {
  return attachPayoutTermWarnings(attachValidationErrors(attachAmountRounding(payload, amountRounding), validationErrors), warnings);
}

export async function runCreateIncentive(api: FuulApiClient, input: CreateIncentiveInput, toolTimeoutMs: number): Promise<unknown> {
  assertWriteConfirmedOrDryRun(input);
  const triggerResolutions = await resolveDraftTriggerIdsForWrite(api, input.project_id, input.trigger_ids, toolTimeoutMs);
  const resolvedTriggerIds = triggerResolutions.map((row) => row.resolved_draft_trigger_id);
  const path = `/api/v1/projects/${input.project_id}/incentives`;
  const { body, amountRounding, validationErrors, warnings } = buildCreateIncentiveBody(input, resolvedTriggerIds);
  const chainInit = await ensureProjectChainForOnChainPayouts(
    api,
    input.project_id,
    body.payout_terms as Record<string, unknown>[],
    input.dry_run === true,
  );

  if (input.dry_run === true) {
    return attachDraftIdResolution(
      attachProjectChainInit(
        attachWritePreviewMetadata(
          {
            dry_run: true,
            would_post: path,
            body,
          },
          amountRounding,
          validationErrors,
          warnings,
        ),
        chainInit,
      ),
      { triggers: triggerResolutions },
    );
  }

  const result = await api.postJson(path, body);
  const responsePayload =
    result !== null && typeof result === 'object' && !Array.isArray(result)
      ? attachProjectChainInit(attachWritePreviewMetadata(result as Record<string, unknown>, amountRounding, validationErrors, warnings), chainInit)
      : attachProjectChainInit(attachWritePreviewMetadata({ result }, amountRounding, validationErrors, warnings), chainInit);
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

export async function runUpdateIncentiveTriggers(api: FuulApiClient, input: UpdateIncentiveTriggersInput, toolTimeoutMs: number): Promise<unknown> {
  assertWriteConfirmedOrDryRun(input);
  const conversionResolution = await resolveDraftConversionIdForWrite(api, input.project_id, input.conversion_id, toolTimeoutMs);
  const triggerResolutions = await resolveDraftTriggerIdsForWrite(api, input.project_id, input.trigger_ids, toolTimeoutMs);
  const triggerRefs = triggerResolutions.map((row) => row.ref);

  let conversionName = input.name;
  if (!conversionName) {
    const incentive = await api.getJson(`/api/v1/projects/${input.project_id}/incentives/${conversionResolution.resolved_draft_conversion_id}`);
    if (incentive !== null && typeof incentive === 'object' && !Array.isArray(incentive)) {
      const name = (incentive as Record<string, unknown>).name;
      if (typeof name === 'string' && name.trim().length > 0) {
        conversionName = name;
      }
    }
  }

  if (!conversionName) {
    throw new Error('Could not resolve conversion name; pass name explicitly.');
  }

  const path = `/api/v1/projects/${input.project_id}/conversions/${conversionResolution.resolved_draft_conversion_id}`;
  const body = {
    name: conversionName,
    trigger_refs: triggerRefs,
  };

  if (input.dry_run === true) {
    return attachDraftIdResolution(
      {
        dry_run: true,
        would_patch: path,
        body,
        note: 'Replaces the conversion trigger set only; payout terms are unchanged. Do not use PATCH /incentives for this.',
      },
      { conversion: conversionResolution, triggers: triggerResolutions },
    );
  }

  const result = await api.patchJson(path, body);
  const responsePayload = result !== null && typeof result === 'object' && !Array.isArray(result) ? (result as Record<string, unknown>) : { result };
  return attachDraftIdResolution(responsePayload, { conversion: conversionResolution, triggers: triggerResolutions });
}

export async function runUpdatePayoutTerm(api: FuulApiClient, input: UpdatePayoutTermInput, toolTimeoutMs: number): Promise<unknown> {
  assertWriteConfirmedOrDryRun(input);
  const conversionResolution = await resolveDraftConversionIdForWrite(api, input.project_id, input.conversion_id, toolTimeoutMs);
  const path = `/api/v1/projects/${input.project_id}/conversions/${conversionResolution.resolved_draft_conversion_id}/payout_terms/${input.payout_term_id}`;
  const { body: patchBody, amountRounding, validationErrors, warnings } = preparePayoutTermBodyForWrite(input.payout_term as Record<string, unknown>);
  const chainInit = await ensureProjectChainForOnChainPayouts(api, input.project_id, [patchBody], input.dry_run === true);

  if (input.dry_run === true) {
    return attachDraftIdResolution(
      attachProjectChainInit(
        attachPayoutTermWarnings(
          attachValidationErrors(attachAmountRounding({ dry_run: true, would_patch: path, body: patchBody }, amountRounding), validationErrors),
          warnings,
        ),
        chainInit,
      ),
      conversionResolution,
    );
  }

  const result = await api.patchJson(path, patchBody);
  const responsePayload =
    result !== null && typeof result === 'object' && !Array.isArray(result)
      ? attachProjectChainInit(
          attachPayoutTermWarnings(
            attachValidationErrors(attachAmountRounding(result as Record<string, unknown>, amountRounding), validationErrors),
            warnings,
          ),
          chainInit,
        )
      : attachProjectChainInit(
          attachPayoutTermWarnings(attachValidationErrors(attachAmountRounding({ result }, amountRounding), validationErrors), warnings),
          chainInit,
        );
  return attachDraftIdResolution(responsePayload, conversionResolution);
}
