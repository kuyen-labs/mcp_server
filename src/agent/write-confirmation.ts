import { z } from 'zod';

/**
 * Standard input fragment for Phase 2 write tools. Extend with tool-specific fields.
 * Flow: first call with dry_run: true (or omit confirmed) to get validation / preview;
 * second call with confirmed: true to execute.
 */
export const writeConfirmationFieldsSchema = z.object({
  dry_run: z.boolean().optional().describe('If true, validate and return a preview only; no server mutation.'),
  confirmed: z.boolean().optional().describe('Must be true to perform the mutation after reviewing dry_run output.'),
});

export type WriteConfirmationFields = z.infer<typeof writeConfirmationFieldsSchema>;

export class WriteNotConfirmedError extends Error {
  readonly code = 'WRITE_NOT_CONFIRMED' as const;

  constructor(message = 'Mutation blocked: use dry_run: true first to validate, then call again with confirmed: true.') {
    super(message);
    this.name = 'WriteNotConfirmedError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Enforces the mandatory confirmation pattern for mutating tools.
 * - dry_run: true → caller should return preview only (no throw).
 * - confirmed: true → mutation allowed.
 * - Otherwise → throws WriteNotConfirmedError.
 */
export function assertWriteConfirmedOrDryRun(input: WriteConfirmationFields): void {
  if (input.dry_run === true) {
    return;
  }
  if (input.confirmed === true) {
    return;
  }
  throw new WriteNotConfirmedError();
}
