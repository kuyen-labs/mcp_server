/**
 * Serialize query params for NestJS controllers that expect repeated keys
 * (e.g. statuses=Active&statuses=Paused) instead of axios default bracket indexing.
 */
export function buildNestQueryString(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== undefined && item !== null && item !== '') {
          search.append(key, String(item));
        }
      }
    } else {
      search.append(key, String(value));
    }
  }
  return search.toString();
}
