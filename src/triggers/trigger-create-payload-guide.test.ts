import { describe, expect, it } from 'vitest';

import { enrichTriggerTypesResponse, getCreatePayloadLayout } from './trigger-create-payload-guide.js';

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
