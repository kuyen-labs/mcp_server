import { assertWriteConfirmedOrDryRun } from '../agent/write-confirmation.js';
import { ApiRequestError, type FuulApiClient } from '../http/fuul-api-client.js';
import { attachDraftIdResolution, resolveDraftTriggerIdForWrite } from '../metadata-scope/resolve-draft-ids.js';
import type { CreateTriggerInput, DeleteTriggerInput } from '../tools/tool-schemas.js';

const TRIGGER_IN_USE_HINT =
  'This trigger is linked to one or more incentives. Delete those incentives first with delete_incentive ' +
  '(use list_incentives to find draft_conversion_id), or create a replacement trigger with create_trigger ' +
  'without deleting the old one. Never delete a trigger without explicit user confirmation.';

export async function runCreateTrigger(api: FuulApiClient, input: CreateTriggerInput): Promise<unknown> {
  assertWriteConfirmedOrDryRun(input);
  const path = `/api/v1/projects/${input.project_id}/triggers`;
  const body = input.trigger;

  if (input.dry_run === true) {
    return {
      dry_run: true,
      would_post: path,
      body,
    };
  }

  return api.postJson(path, body);
}

export async function runDeleteTrigger(
  api: FuulApiClient,
  input: DeleteTriggerInput,
  toolTimeoutMs: number,
): Promise<unknown> {
  assertWriteConfirmedOrDryRun(input);
  const resolution = await resolveDraftTriggerIdForWrite(api, input.project_id, input.trigger_id, toolTimeoutMs);
  const path = `/api/v1/projects/${input.project_id}/triggers/${resolution.resolved_draft_trigger_id}`;

  if (input.dry_run === true) {
    return attachDraftIdResolution(
      {
        dry_run: true,
        would_delete: path,
      },
      resolution,
    );
  }

  try {
    const result = await api.deleteJson(path);
    return attachDraftIdResolution(result ?? { ok: true }, resolution);
  } catch (e) {
    if (e instanceof ApiRequestError && e.status === 422) {
      throw new Error(`${e.message} ${TRIGGER_IN_USE_HINT}`);
    }
    throw e;
  }
}
