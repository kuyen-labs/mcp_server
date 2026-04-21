import { describe, expect, it } from 'vitest';

import { buildNestQueryString } from './nest-query.js';

describe('buildNestQueryString', () => {
  it('serializes repeated keys for arrays', () => {
    const s = buildNestQueryString({ statuses: ['Active', 'Paused'], foo: 'bar' });
    expect(s).toContain('statuses=Active');
    expect(s).toContain('statuses=Paused');
    expect(s).toContain('foo=bar');
  });

  it('omits empty values', () => {
    expect(buildNestQueryString({ a: '', b: undefined, c: null as unknown as string })).toBe('');
  });

  it('encodes special characters', () => {
    const s = buildNestQueryString({ user_identifier: 'evm:0xabc,test' });
    expect(s).toContain('user_identifier=');
  });
});
