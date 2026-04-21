import { describe, expect, it } from 'vitest';

import { assertWriteConfirmedOrDryRun, WriteNotConfirmedError } from './write-confirmation.js';

describe('assertWriteConfirmedOrDryRun', () => {
  it('allows dry_run', () => {
    expect(() => assertWriteConfirmedOrDryRun({ dry_run: true })).not.toThrow();
  });

  it('allows confirmed', () => {
    expect(() => assertWriteConfirmedOrDryRun({ confirmed: true })).not.toThrow();
  });

  it('rejects missing confirmation', () => {
    expect(() => assertWriteConfirmedOrDryRun({})).toThrow(WriteNotConfirmedError);
  });
});
