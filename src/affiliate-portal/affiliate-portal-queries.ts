import { buildNestQueryString } from '../http/nest-query.js';
import type { GetAffiliatePortalStatsInput, GetProjectAffiliatesBreakdownInput, GetProjectAffiliateTotalStatsInput } from '../tools/tool-schemas.js';
import { compactQuery } from '../util/compact-query.js';

function omitProjectId<T extends { project_id: string }>(input: T): Omit<T, 'project_id'> {
  const { project_id, ...rest } = input;
  void project_id;
  return rest;
}

/** Query object for GET /api/v1/projects/:projectId/affiliate-portal/stats */
export function affiliatePortalStatsQueryFromInput(input: GetAffiliatePortalStatsInput): Record<string, unknown> {
  return omitProjectId(input);
}

/** Query object for GET .../affiliate-portal/total-stats */
export function projectAffiliateTotalStatsQueryFromInput(input: GetProjectAffiliateTotalStatsInput): Record<string, unknown> {
  return omitProjectId(input);
}

/** Query object for GET .../affiliate-portal/global-breakdown */
export function projectAffiliatesBreakdownQueryFromInput(input: GetProjectAffiliatesBreakdownInput): Record<string, unknown> {
  return omitProjectId(input);
}

type AffiliatePortalSegment = 'stats' | 'total-stats' | 'global-breakdown';

/** Relative URL path with query string for affiliate-portal GET routes. */
export function buildAffiliatePortalGetPath(projectId: string, segment: AffiliatePortalSegment, query: Record<string, unknown>): string {
  const base = `/api/v1/projects/${projectId}/affiliate-portal/${segment}`;
  const q = buildNestQueryString(compactQuery(query));
  return q ? `${base}?${q}` : base;
}

export function affiliatePortalStatsPath(input: GetAffiliatePortalStatsInput): string {
  return buildAffiliatePortalGetPath(input.project_id, 'stats', affiliatePortalStatsQueryFromInput(input));
}

export function projectAffiliateTotalStatsPath(input: GetProjectAffiliateTotalStatsInput): string {
  return buildAffiliatePortalGetPath(input.project_id, 'total-stats', projectAffiliateTotalStatsQueryFromInput(input));
}

export function projectAffiliatesBreakdownPath(input: GetProjectAffiliatesBreakdownInput): string {
  return buildAffiliatePortalGetPath(input.project_id, 'global-breakdown', projectAffiliatesBreakdownQueryFromInput(input));
}
