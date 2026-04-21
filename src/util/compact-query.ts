/** Drop undefined, null, and empty string from a query param object. */
export function compactQuery(params: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''));
}
