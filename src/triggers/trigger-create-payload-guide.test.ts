import { describe, expect, it } from 'vitest';

import { createTriggerInputSchema, updateTriggerInputSchema } from '../tools/tool-schemas.js';
import { CREATE_PAYLOAD_EXAMPLES, enrichTriggerTypesResponse, getCreatePayloadLayout } from './trigger-create-payload-guide.js';

describe('getCreatePayloadLayout', () => {
  it('marks custom as flat_dto', () => {
    expect(getCreatePayloadLayout('custom')).toBe('flat_dto');
  });

  it('marks token-holder as context_only', () => {
    expect(getCreatePayloadLayout('token-holder')).toBe('context_only');
  });

  it('marks hibachi-trading as context_and_root_fields', () => {
    expect(getCreatePayloadLayout('hibachi-trading')).toBe('context_and_root_fields');
  });
});

describe('enrichTriggerTypesResponse', () => {
  it('adds layout, notes, guide, and example for known types', () => {
    const raw = {
      trigger_types: [
        { id: 'custom', context_json_schema: { properties: { signature: {} } } },
        { id: 'token-holder', context_json_schema: {} },
      ],
    };

    const enriched = enrichTriggerTypesResponse(raw) as {
      create_trigger_payload_guide: { endpoint: string };
      trigger_types: Array<{
        id: string;
        create_payload_layout: string;
        create_payload_notes: string;
        create_payload_example?: Record<string, unknown>;
      }>;
    };

    expect(enriched.create_trigger_payload_guide.endpoint).toContain('/triggers');
    expect(enriched.trigger_types[0].create_payload_layout).toBe('flat_dto');
    expect(enriched.trigger_types[0].create_payload_example?.signature).toBe('my_event_name');
    expect(enriched.trigger_types[1].create_payload_layout).toBe('context_only');
    expect(enriched.trigger_types[1].create_payload_example?.context).toBeDefined();
  });

  it('returns raw when trigger_types missing', () => {
    expect(enrichTriggerTypesResponse({ foo: 1 })).toEqual({ foo: 1 });
  });
});

describe('CREATE_PAYLOAD_EXAMPLES custom volume expression', () => {
  it('advertises amount_expression and never volume_expression', () => {
    const custom = CREATE_PAYLOAD_EXAMPLES.custom as Record<string, unknown>;

    expect(custom.amount_expression).toBe('extractedValueAmount');
    expect(custom).not.toHaveProperty('volume_expression');
  });

  it('keeps every create example free of volume_expression at root and in context', () => {
    for (const [id, example] of Object.entries(CREATE_PAYLOAD_EXAMPLES)) {
      const root = example as Record<string, unknown>;
      expect(root, id).not.toHaveProperty('volume_expression');
      if (root.context && typeof root.context === 'object') {
        expect(root.context as Record<string, unknown>, id).not.toHaveProperty('volume_expression');
      }
    }
  });
});

describe('create_trigger volume_expression guard', () => {
  const base = { project_id: '11111111-1111-4111-8111-111111111111', dry_run: true };

  it('rejects trigger.volume_expression and points at amount_expression', () => {
    const result = createTriggerInputSchema.safeParse({
      ...base,
      trigger: { name: 'n', description: 'd', type: 'custom', volume_expression: 'ytSyAtomic' },
    });

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }
    const issue = result.error.issues.find((i) => i.path.join('.') === 'trigger.volume_expression');
    expect(issue?.message).toContain('use amount_expression instead');
    expect(issue?.message).toContain('trigger.volume_expression column');
  });

  it('accepts trigger.amount_expression', () => {
    const result = createTriggerInputSchema.safeParse({
      ...base,
      trigger: { name: 'n', description: 'd', type: 'custom', amount_expression: 'ytSyAtomic' },
    });

    expect(result.success).toBe(true);
  });
});

describe('update_trigger volume_expression', () => {
  const base = { project_id: '11111111-1111-4111-8111-111111111111', trigger_id: '22222222-2222-4222-8222-222222222222', dry_run: true };

  /** PATCH is not affected by the create-side bug: UpdateTriggerDto declares volume_expression. */
  it('still accepts volume_expression on PATCH', () => {
    expect(updateTriggerInputSchema.safeParse({ ...base, volume_expression: 'ytSyAtomic' }).success).toBe(true);
  });

  it('still accepts amount_expression on PATCH', () => {
    expect(updateTriggerInputSchema.safeParse({ ...base, amount_expression: 'ytSyAtomic' }).success).toBe(true);
  });
});
