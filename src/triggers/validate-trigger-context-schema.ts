import type { FuulApiClient } from '../http/fuul-api-client.js';
import { PATH_TRIGGER_TYPES } from '../metadata/metadata-service.js';
import { getCreatePayloadLayout } from './trigger-create-payload-guide.js';

type TriggerBody = Record<string, unknown> & {
  type?: string;
  context?: Record<string, unknown>;
};

type TriggerTypeRow = {
  id?: unknown;
  schema_status?: unknown;
  context_json_schema?: unknown;
};

/**
 * Dry-run guard: asserts the submitted trigger carries every required field from the trigger
 * type's CURRENT context_json_schema. Trigger types are fetched uncached (direct GET, not the
 * MetadataService cache) so the check never reads a schema that lags the server — a clean dry run
 * means the real create will not fail on a missing required context field.
 *
 * Required-presence only (no type/format validation). A field counts as missing when it is absent,
 * null, undefined, or an empty string — mirroring the server's `@IsNotEmpty` cluster. Skips when the
 * type is unknown, has no usable schema, lists no required fields, or when trigger types cannot be
 * fetched, so it never turns an unrelated failure into a false validation error.
 */
export async function assertTriggerContextMatchesSchema(api: FuulApiClient, trigger: TriggerBody): Promise<void> {
  const type = trigger.type;
  if (typeof type !== 'string' || type === '') {
    return;
  }

  let rows: TriggerTypeRow[];
  try {
    const data = await api.getJson(PATH_TRIGGER_TYPES);
    const list = (data as { trigger_types?: unknown })?.trigger_types;
    if (!Array.isArray(list)) {
      return;
    }
    rows = list as TriggerTypeRow[];
  } catch {
    return;
  }

  const row = rows.find((r) => r && typeof r === 'object' && r.id === type);
  const schema = row?.context_json_schema;
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
    return;
  }

  const rawRequired = (schema as { required?: unknown }).required;
  const required = Array.isArray(rawRequired) ? rawRequired.filter((k): k is string => typeof k === 'string') : [];
  if (required.length === 0) {
    return;
  }

  const layout = getCreatePayloadLayout(type);
  const target = layout === 'flat_dto' ? trigger : isPlainObject(trigger.context) ? trigger.context : {};

  const missing = required.filter((key) => isMissing((target as Record<string, unknown>)[key]));
  if (missing.length === 0) {
    return;
  }

  const where =
    layout === 'flat_dto'
      ? 'at the trigger root (siblings of name/description/type)'
      : 'under trigger.context';
  throw new Error(
    `create_trigger dry run failed validation: trigger type "${type}" is missing required context field(s): ${missing.join(', ')}. ` +
      `Put them ${where} (create_payload_layout: ${layout}). ` +
      'Run list_trigger_types for the current context_json_schema and create_payload_example, then retry.',
  );
}

function isMissing(value: unknown): boolean {
  return value === undefined || value === null || value === '';
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
