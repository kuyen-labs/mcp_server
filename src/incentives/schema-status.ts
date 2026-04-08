/**
 * Phase 1 metadata policy: incentive flows that rely on trigger context JSON Schema
 * must only proceed when metadata reports schema_status === "present".
 */

export class TriggerSchemaPolicyError extends Error {
  readonly code = 'TRIGGER_SCHEMA_POLICY' as const;

  constructor(message: string) {
    super(message);
    this.name = 'TriggerSchemaPolicyError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

function extractTriggerTypeRows(metadata: unknown): Map<string, { schema_status: string }> {
  const map = new Map<string, { schema_status: string }>();
  if (!metadata || typeof metadata !== 'object') {
    return map;
  }
  const triggerTypes = (metadata as { trigger_types?: unknown }).trigger_types;
  if (!Array.isArray(triggerTypes)) {
    return map;
  }
  for (const row of triggerTypes) {
    if (!row || typeof row !== 'object') {
      continue;
    }
    const r = row as Record<string, unknown>;
    if (typeof r.id === 'string' && typeof r.schema_status === 'string') {
      map.set(r.id, { schema_status: r.schema_status });
    }
  }
  return map;
}

/**
 * Ensures every distinct trigger type id has schema_status "present" in metadata from
 * GET /public-api/v1/metadata/trigger-types.
 */
export function assertTriggerTypesHavePresentSchema(metadata: unknown, triggerTypeIds: string[]): void {
  const rows = extractTriggerTypeRows(metadata);
  const bad: string[] = [];
  const seen = new Set<string>();
  for (const tid of triggerTypeIds) {
    if (seen.has(tid)) {
      continue;
    }
    seen.add(tid);
    const row = rows.get(tid);
    if (!row) {
      bad.push(`${tid} (not listed in trigger type metadata)`);
      continue;
    }
    if (row.schema_status !== 'present') {
      bad.push(`${tid} (schema_status=${row.schema_status}, need "present")`);
    }
  }
  if (bad.length > 0) {
    throw new TriggerSchemaPolicyError(
      `Trigger context JSON Schema policy failed for: ${bad.join('; ')}. ` +
        `Pick trigger types with schema_status "present" from list_trigger_types, or adjust triggers.`,
    );
  }
}
