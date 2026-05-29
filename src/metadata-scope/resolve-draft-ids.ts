import type { FuulApiClient } from '../http/fuul-api-client.js';
import { loadProjectWithMetadataScope } from './fetch-project-config.js';
import type { ScopedIncentive, ScopedTrigger } from './types.js';

export type DraftIdResolutionReason = 'current_draft' | 'published_id_remapped_to_current_draft';

export interface DraftTriggerIdResolution {
  requested_trigger_id: string;
  resolved_draft_trigger_id: string;
  ref: string;
  reason: DraftIdResolutionReason;
}

export interface DraftConversionIdResolution {
  requested_conversion_id: string;
  resolved_draft_conversion_id: string;
  slug: string;
  reason: DraftIdResolutionReason;
}

function getScopedTriggers(project: Record<string, unknown>): ScopedTrigger[] {
  const triggers = project.triggers;
  if (!Array.isArray(triggers)) {
    return [];
  }
  return triggers as ScopedTrigger[];
}

function getScopedConversions(project: Record<string, unknown>): ScopedIncentive[] {
  const conversions = project.conversions;
  if (!Array.isArray(conversions)) {
    return [];
  }
  return conversions as ScopedIncentive[];
}

export function resolveDraftTriggerIdFromProject(project: Record<string, unknown>, triggerId: string): DraftTriggerIdResolution {
  const triggers = getScopedTriggers(project);

  const byDraft = triggers.find((row) => row.draft_trigger_id === triggerId);
  if (byDraft?.draft_trigger_id) {
    return {
      requested_trigger_id: triggerId,
      resolved_draft_trigger_id: byDraft.draft_trigger_id,
      ref: byDraft.ref,
      reason: 'current_draft',
    };
  }

  const byPublished = triggers.find((row) => row.published_trigger_id === triggerId);
  if (byPublished) {
    if (!byPublished.draft_trigger_id) {
      throw new Error(
        `trigger_id ${triggerId} matches published trigger ref "${byPublished.ref}" but there is no current draft row. ` +
          'Cannot modify via the draft triggers API.',
      );
    }
    return {
      requested_trigger_id: triggerId,
      resolved_draft_trigger_id: byPublished.draft_trigger_id,
      ref: byPublished.ref,
      reason: 'published_id_remapped_to_current_draft',
    };
  }

  throw new Error(
    `trigger_id ${triggerId} is not a current draft or published trigger on this project. ` +
      'Draft UUIDs rotate after dashboard publish; call get_project for fresh draft_trigger_id values by ref.',
  );
}

export function resolveDraftConversionIdFromProject(project: Record<string, unknown>, conversionId: string): DraftConversionIdResolution {
  const conversions = getScopedConversions(project);

  const byDraft = conversions.find((row) => row.draft_conversion_id === conversionId);
  if (byDraft?.draft_conversion_id) {
    return {
      requested_conversion_id: conversionId,
      resolved_draft_conversion_id: byDraft.draft_conversion_id,
      slug: byDraft.slug,
      reason: 'current_draft',
    };
  }

  const byPublished = conversions.find((row) => row.published_conversion_id === conversionId);
  if (byPublished) {
    if (!byPublished.draft_conversion_id) {
      throw new Error(
        `conversion_id ${conversionId} matches published incentive slug "${byPublished.slug}" but there is no current draft row. ` +
          'Cannot modify via the draft incentives API.',
      );
    }
    return {
      requested_conversion_id: conversionId,
      resolved_draft_conversion_id: byPublished.draft_conversion_id,
      slug: byPublished.slug,
      reason: 'published_id_remapped_to_current_draft',
    };
  }

  throw new Error(
    `conversion_id ${conversionId} is not a current draft conversion on this project. ` +
      'Draft UUIDs may change after dashboard publish; call get_project or list_incentives for fresh draft_conversion_id values.',
  );
}

export async function resolveDraftTriggerIdForWrite(
  api: FuulApiClient,
  projectId: string,
  triggerId: string,
  toolTimeoutMs: number,
): Promise<DraftTriggerIdResolution> {
  const project = await loadProjectWithMetadataScope(api, projectId, toolTimeoutMs);
  return resolveDraftTriggerIdFromProject(project, triggerId);
}

export async function resolveDraftConversionIdForWrite(
  api: FuulApiClient,
  projectId: string,
  conversionId: string,
  toolTimeoutMs: number,
): Promise<DraftConversionIdResolution> {
  const project = await loadProjectWithMetadataScope(api, projectId, toolTimeoutMs);
  return resolveDraftConversionIdFromProject(project, conversionId);
}

export async function resolveDraftTriggerIdsForWrite(
  api: FuulApiClient,
  projectId: string,
  triggerIds: string[],
  toolTimeoutMs: number,
): Promise<DraftTriggerIdResolution[]> {
  const project = await loadProjectWithMetadataScope(api, projectId, toolTimeoutMs);
  return triggerIds.map((triggerId) => resolveDraftTriggerIdFromProject(project, triggerId));
}

export function attachDraftIdResolution(data: unknown, resolution: unknown): unknown {
  if (data !== null && typeof data === 'object' && !Array.isArray(data)) {
    return { ...(data as Record<string, unknown>), _draft_id_resolution: resolution };
  }
  return {
    result: data,
    _draft_id_resolution: resolution,
  };
}
