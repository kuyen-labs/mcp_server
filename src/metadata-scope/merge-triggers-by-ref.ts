import type { PublishedTriggerSummary, ScopedTrigger } from './types.js';

function triggerRef(trigger: Record<string, unknown>): string {
  const ref = trigger.ref;
  return typeof ref === 'string' ? ref : '';
}

function resolveSignature(draft: Record<string, unknown> | null, published: PublishedTriggerSummary | null): string {
  if (draft && typeof draft.signature === 'string') {
    return draft.signature;
  }
  if (published?.signature) {
    return published.signature;
  }
  return '';
}

function idString(value: unknown): string | null {
  if (value == null) {
    return null;
  }
  return String(value);
}

export function extractPublishedTriggersFromCustomizations(customizations: unknown): PublishedTriggerSummary[] {
  if (!customizations || typeof customizations !== 'object') {
    return [];
  }
  const project = (customizations as Record<string, unknown>).project;
  if (!project || typeof project !== 'object') {
    return [];
  }
  const triggers = (project as Record<string, unknown>).triggers;
  if (!Array.isArray(triggers)) {
    return [];
  }
  const out: PublishedTriggerSummary[] = [];
  for (const item of triggers) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const row = item as Record<string, unknown>;
    const ref = row.ref;
    const id = row.id;
    if (typeof ref !== 'string' || typeof id !== 'string') {
      continue;
    }
    out.push({
      id,
      ref,
      name: typeof row.name === 'string' ? row.name : '',
      signature: typeof row.signature === 'string' ? row.signature : '',
      trigger_ui_settings: row.trigger_ui_settings,
    });
  }
  return out;
}

export function mergeTriggersByRef(draftTriggers: unknown[], publishedTriggers: PublishedTriggerSummary[]): ScopedTrigger[] {
  const draftByRef = new Map<string, Record<string, unknown>>();
  for (const item of draftTriggers) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const draft = item as Record<string, unknown>;
    const ref = triggerRef(draft);
    if (ref) {
      draftByRef.set(ref, draft);
    }
  }

  const publishedByRef = new Map<string, PublishedTriggerSummary>();
  for (const published of publishedTriggers) {
    publishedByRef.set(published.ref, published);
  }

  const refs = new Set([...draftByRef.keys(), ...publishedByRef.keys()]);
  const merged: ScopedTrigger[] = [];

  for (const ref of refs) {
    const draft = draftByRef.get(ref) ?? null;
    const published = publishedByRef.get(ref) ?? null;
    merged.push({
      ref,
      signature: resolveSignature(draft, published),
      draft_trigger_id: draft ? idString(draft.id) : null,
      published_trigger_id: published?.id ?? null,
      draft,
      published,
    });
  }

  merged.sort((a, b) => a.ref.localeCompare(b.ref));
  return merged;
}

export function scopeNestedTrigger(trigger: Record<string, unknown>, mergedByRef: Map<string, ScopedTrigger>): ScopedTrigger {
  const ref = triggerRef(trigger);
  const existing = ref ? mergedByRef.get(ref) : undefined;
  if (existing) {
    return existing;
  }
  return {
    ref,
    signature: typeof trigger.signature === 'string' ? trigger.signature : '',
    draft_trigger_id: idString(trigger.id),
    published_trigger_id: null,
    draft: trigger,
    published: null,
  };
}
