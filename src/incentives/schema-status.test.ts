import { describe, expect, it } from 'vitest';

import { assertTriggerTypesHavePresentSchema, TriggerSchemaPolicyError } from './schema-status.js';

describe('assertTriggerTypesHavePresentSchema', () => {
  it('throws when schema_status is not present', () => {
    const meta = { trigger_types: [{ id: 'GithubActivity', schema_status: 'missing' }] };
    expect(() => assertTriggerTypesHavePresentSchema(meta, ['GithubActivity'])).toThrow(TriggerSchemaPolicyError);
  });

  it('allows present', () => {
    const meta = { trigger_types: [{ id: 'Custom', schema_status: 'present' }] };
    expect(() => assertTriggerTypesHavePresentSchema(meta, ['Custom'])).not.toThrow();
  });

  it('dedupes trigger types', () => {
    const meta = { trigger_types: [{ id: 'Custom', schema_status: 'present' }] };
    expect(() => assertTriggerTypesHavePresentSchema(meta, ['Custom', 'Custom'])).not.toThrow();
  });
});
