import { extractPublishedTriggersFromCustomizations, mergeTriggersByRef, scopeNestedTrigger } from './merge-triggers-by-ref.js';
import { METADATA_VERSIONS_NOTE, type ScopedIncentive, type ScopedTrigger } from './types.js';

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

export function enrichIncentiveWithTriggerScope(incentive: Record<string, unknown>, mergedByRef: Map<string, ScopedTrigger>): ScopedIncentive {
  const nested = incentive.triggers;
  const triggers: ScopedTrigger[] = [];
  if (Array.isArray(nested)) {
    for (const item of nested) {
      const row = asRecord(item);
      if (row) {
        triggers.push(scopeNestedTrigger(row, mergedByRef));
      }
    }
  }

  return {
    slug: typeof incentive.slug === 'string' ? incentive.slug : '',
    draft_conversion_id: incentive.id != null ? String(incentive.id) : null,
    published_conversion_id: null,
    draft: incentive,
    published: null,
    triggers,
  };
}

export function enrichProjectWithMetadataScope(draftProject: Record<string, unknown>, customizations: unknown): Record<string, unknown> {
  const draftTriggers = draftProject.triggers;
  const merged = mergeTriggersByRef(Array.isArray(draftTriggers) ? draftTriggers : [], extractPublishedTriggersFromCustomizations(customizations));
  const mergedByRef = new Map(merged.map((row) => [row.ref, row]));

  const draftConversions = draftProject.conversions;
  const conversions = Array.isArray(draftConversions)
    ? draftConversions.map((item) => {
        const conversion = asRecord(item);
        return conversion ? enrichIncentiveWithTriggerScope(conversion, mergedByRef) : item;
      })
    : draftConversions;

  return {
    ...draftProject,
    triggers: merged,
    conversions,
    metadata_versions: {
      published_metadata_id: null,
      note: METADATA_VERSIONS_NOTE,
    },
  };
}

export function enrichIncentivesListWithTriggerScope(
  incentives: unknown[],
  customizations: unknown,
  projectDraftTriggers: unknown[] = [],
): ScopedIncentive[] {
  const published = extractPublishedTriggersFromCustomizations(customizations);
  const merged = mergeTriggersByRef(
    projectDraftTriggers.length > 0 ? projectDraftTriggers : collectDraftTriggersFromIncentives(incentives),
    published,
  );
  const mergedByRef = new Map(merged.map((row) => [row.ref, row]));

  return incentives
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => item != null)
    .map((incentive) => enrichIncentiveWithTriggerScope(incentive, mergedByRef));
}

export function enrichSingleIncentiveWithTriggerScope(
  incentive: Record<string, unknown>,
  customizations: unknown,
  projectDraftTriggers: unknown[] = [],
): ScopedIncentive {
  const nested = Array.isArray(incentive.triggers) ? incentive.triggers : [];
  const draftTriggers = projectDraftTriggers.length > 0 ? projectDraftTriggers : nested;
  const published = extractPublishedTriggersFromCustomizations(customizations);
  const merged = mergeTriggersByRef(Array.isArray(draftTriggers) ? draftTriggers : [], published);
  const mergedByRef = new Map(merged.map((row) => [row.ref, row]));
  return enrichIncentiveWithTriggerScope(incentive, mergedByRef);
}

function collectDraftTriggersFromIncentives(incentives: unknown[]): unknown[] {
  const out: unknown[] = [];
  for (const item of incentives) {
    const incentive = asRecord(item);
    if (!incentive || !Array.isArray(incentive.triggers)) {
      continue;
    }
    out.push(...incentive.triggers);
  }
  return out;
}
