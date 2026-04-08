export class ToolTimeoutError extends Error {
  readonly code = 'TOOL_TIMEOUT' as const;

  constructor(
    readonly operation: string,
    readonly timeoutMs: number,
  ) {
    super(`Operation "${operation}" timed out after ${timeoutMs}ms`);
    this.name = 'ToolTimeoutError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Fails fast from the caller's perspective if `promise` never settles (e.g. wedged I/O).
 * The underlying work may still run until its own abort/timeout, if any.
 */
export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new ToolTimeoutError(operation, timeoutMs));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}
