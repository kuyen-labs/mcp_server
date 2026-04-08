import { assertWriteConfirmedOrDryRun } from '../agent/write-confirmation.js';
import type { FuulApiClient } from '../http/fuul-api-client.js';
import type { MetadataService } from '../metadata/metadata-service.js';
import type { CreateIncentiveProgramInput, UpdateIncentiveProgramInput } from '../tools/tool-schemas.js';
import { assertTriggerTypesHavePresentSchema } from './schema-status.js';

async function resolveTriggerTypeIds(api: FuulApiClient, projectId: string, triggerIds: string[]): Promise<string[]> {
  const types: string[] = [];
  for (const tid of triggerIds) {
    const tr = (await api.getJson(`/api/v1/projects/${projectId}/triggers/${tid}`)) as Record<string, unknown>;
    const tt = (tr.triggerType ?? tr.type) as string | undefined;
    if (!tt || typeof tt !== 'string') {
      throw new Error(`Could not read triggerType for trigger ${tid}; cannot verify schema_status policy.`);
    }
    types.push(tt);
  }
  return types;
}

export async function runCreateIncentiveProgram(api: FuulApiClient, metadata: MetadataService, input: CreateIncentiveProgramInput): Promise<unknown> {
  assertWriteConfirmedOrDryRun(input);
  const triggerTypesMeta = await metadata.getTriggerTypes();
  const triggerTypeIds = await resolveTriggerTypeIds(api, input.project_id, input.trigger_ids);
  assertTriggerTypesHavePresentSchema(triggerTypesMeta, triggerTypeIds);

  const payload = {
    name: input.name,
    trigger_ids: input.trigger_ids,
    payout_terms: input.payout_terms,
  };

  if (input.dry_run === true) {
    return {
      dry_run: true,
      would_post: `POST /api/v1/projects/${input.project_id}/incentives`,
      body: payload,
    };
  }

  return api.postJson(`/api/v1/projects/${input.project_id}/incentives`, payload);
}

export async function runUpdateIncentiveProgram(api: FuulApiClient, metadata: MetadataService, input: UpdateIncentiveProgramInput): Promise<unknown> {
  assertWriteConfirmedOrDryRun(input);
  const triggerTypesMeta = await metadata.getTriggerTypes();
  const triggerTypeIds = await resolveTriggerTypeIds(api, input.project_id, input.trigger_ids);
  assertTriggerTypesHavePresentSchema(triggerTypesMeta, triggerTypeIds);

  const payload = {
    name: input.name,
    trigger_ids: input.trigger_ids,
    payout_terms: input.payout_terms,
  };

  if (input.dry_run === true) {
    return {
      dry_run: true,
      would_patch: `PATCH /api/v1/projects/${input.project_id}/incentives/${input.conversion_id}`,
      body: payload,
    };
  }

  return api.patchJson(`/api/v1/projects/${input.project_id}/incentives/${input.conversion_id}`, payload);
}
