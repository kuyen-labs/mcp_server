import { describe, expect, it, vi } from 'vitest';

import { assertTriggerContextMatchesSchema } from './validate-trigger-context-schema.js';

function apiReturning(triggerTypes: unknown) {
  const getJson = vi.fn().mockResolvedValue({ trigger_types: triggerTypes });
  return { api: { getJson } as never, getJson };
}

const kaminoRow = {
  id: 'kamino-lend',
  schema_status: 'present',
  context_json_schema: {
    type: 'object',
    properties: { market: {}, reserve: {}, volumeCurrencyAddress: {} },
    required: ['market', 'reserve', 'volumeCurrencyAddress'],
  },
};

// `custom` is a flat_dto type: schema fields live at the trigger root, not under context.
const customRow = {
  id: 'custom',
  schema_status: 'present',
  context_json_schema: {
    type: 'object',
    properties: { signature: {} },
    required: ['signature'],
  },
};

describe('assertTriggerContextMatchesSchema', () => {
  it('throws listing the missing required context field (context layout)', async () => {
    const { api } = apiReturning([kaminoRow]);
    await expect(
      assertTriggerContextMatchesSchema(api, {
        type: 'kamino-lend',
        context: { market: '0xabc', reserve: '0xdef' },
      }),
    ).rejects.toThrow(/volumeCurrencyAddress/);
  });

  it('resolves when all required context fields are present', async () => {
    const { api } = apiReturning([kaminoRow]);
    await expect(
      assertTriggerContextMatchesSchema(api, {
        type: 'kamino-lend',
        context: { market: '0xabc', reserve: '0xdef', volumeCurrencyAddress: '0x123' },
      }),
    ).resolves.toBeUndefined();
  });

  it('reports every required field missing when context is absent', async () => {
    const { api } = apiReturning([kaminoRow]);
    await expect(
      assertTriggerContextMatchesSchema(api, { type: 'kamino-lend' }),
    ).rejects.toThrow(/market, reserve, volumeCurrencyAddress/);
  });

  it('checks flat_dto required fields at the trigger root', async () => {
    const { api } = apiReturning([customRow]);
    await expect(
      assertTriggerContextMatchesSchema(api, { type: 'custom', context: { signature: 'evt' } }),
    ).rejects.toThrow(/signature/);
    await expect(
      assertTriggerContextMatchesSchema(api, { type: 'custom', signature: 'evt' }),
    ).resolves.toBeUndefined();
  });

  it('treats empty string / null as missing but not 0 or false', async () => {
    const row = {
      id: 'preset',
      schema_status: 'present',
      context_json_schema: { type: 'object', properties: { a: {} }, required: ['a'] },
    };
    const emptyApi = apiReturning([row]);
    await expect(assertTriggerContextMatchesSchema(emptyApi.api, { type: 'preset', context: { a: '' } })).rejects.toThrow(/a/);
    const nullApi = apiReturning([row]);
    await expect(assertTriggerContextMatchesSchema(nullApi.api, { type: 'preset', context: { a: null } })).rejects.toThrow(/a/);
    const zeroApi = apiReturning([row]);
    await expect(assertTriggerContextMatchesSchema(zeroApi.api, { type: 'preset', context: { a: 0 } })).resolves.toBeUndefined();
    const falseApi = apiReturning([row]);
    await expect(assertTriggerContextMatchesSchema(falseApi.api, { type: 'preset', context: { a: false } })).resolves.toBeUndefined();
  });

  it('skips when the type is unknown', async () => {
    const { api } = apiReturning([kaminoRow]);
    await expect(
      assertTriggerContextMatchesSchema(api, { type: 'does-not-exist', context: {} }),
    ).resolves.toBeUndefined();
  });

  it('skips when schema_status is not present (null context_json_schema)', async () => {
    const { api } = apiReturning([{ id: 'github-activity', schema_status: 'missing', context_json_schema: null }]);
    await expect(
      assertTriggerContextMatchesSchema(api, { type: 'github-activity', context: {} }),
    ).resolves.toBeUndefined();
  });

  it('skips when the schema lists no required fields', async () => {
    const { api } = apiReturning([
      { id: 'preset', schema_status: 'present', context_json_schema: { type: 'object', properties: { a: {} } } },
    ]);
    await expect(
      assertTriggerContextMatchesSchema(api, { type: 'preset', context: {} }),
    ).resolves.toBeUndefined();
  });

  it('skips (does not throw) when fetching trigger types fails', async () => {
    const getJson = vi.fn().mockRejectedValue(new Error('network down'));
    await expect(
      assertTriggerContextMatchesSchema({ getJson } as never, { type: 'kamino-lend', context: {} }),
    ).resolves.toBeUndefined();
  });

  it('skips when trigger.type is missing', async () => {
    const { api, getJson } = apiReturning([kaminoRow]);
    await expect(assertTriggerContextMatchesSchema(api, { context: {} })).resolves.toBeUndefined();
    expect(getJson).not.toHaveBeenCalled();
  });
});
