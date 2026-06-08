import { buildNestQueryString } from '../http/nest-query.js';
import type { GetIncentiveHistoryInput, GetIncentiveStatsInput, GetProjectIncentivesBreakdownInput } from '../tools/tool-schemas.js';
import { compactQuery } from '../util/compact-query.js';

function omitProjectAndConversionId<T extends { project_id: string; conversion_id?: string }>(input: T): Omit<T, 'project_id' | 'conversion_id'> {
  const { project_id, conversion_id, ...rest } = input;
  void project_id;
  void conversion_id;
  return rest;
}

function omitProjectId<T extends { project_id: string }>(input: T): Omit<T, 'project_id'> {
  const { project_id, ...rest } = input;
  void project_id;
  return rest;
}

function buildIncentivesGetPath(projectId: string, suffix: string, query: Record<string, unknown>): string {
  const base = `/api/v1/projects/${projectId}/incentives/${suffix}`;
  const q = buildNestQueryString(compactQuery(query));
  return q ? `${base}?${q}` : base;
}

export function incentiveStatsPath(input: GetIncentiveStatsInput): string {
  return buildIncentivesGetPath(input.project_id, `${input.conversion_id}/stats`, omitProjectAndConversionId(input));
}

export function projectIncentivesBreakdownPath(input: GetProjectIncentivesBreakdownInput): string {
  const base = `/api/v1/projects/${input.project_id}/incentives/breakdown`;
  const q = buildNestQueryString(compactQuery(omitProjectId(input)));
  return q ? `${base}?${q}` : base;
}

export function incentiveHistoryPath(input: GetIncentiveHistoryInput): string {
  return buildIncentivesGetPath(input.project_id, `${input.conversion_id}/history`, omitProjectAndConversionId(input));
}
