import { describe, expect, it } from 'vitest';

import { incentiveHistoryPath, incentiveStatsPath, projectIncentivesBreakdownPath } from './incentive-analytics-queries.js';

describe('incentive-analytics-queries', () => {
  const projectId = '550e8400-e29b-41d4-a716-446655440000';
  const conversionId = '660e8400-e29b-41d4-a716-446655440001';

  it('incentiveStatsPath builds stats URL with dateRange', () => {
    const path = incentiveStatsPath({
      project_id: projectId,
      conversion_id: conversionId,
      dateRange: '30d',
    });
    expect(path).toBe(`/api/v1/projects/${projectId}/incentives/${conversionId}/stats?dateRange=30d`);
  });

  it('projectIncentivesBreakdownPath builds breakdown URL', () => {
    const path = projectIncentivesBreakdownPath({
      project_id: projectId,
      sortBy: 'unique_users',
      sortOrder: 'asc',
    });
    expect(path).toBe(`/api/v1/projects/${projectId}/incentives/breakdown?sortBy=unique_users&sortOrder=asc`);
  });

  it('incentiveHistoryPath builds history URL with granularity', () => {
    const path = incentiveHistoryPath({
      project_id: projectId,
      conversion_id: conversionId,
      granularity: 'weekly',
      dateFrom: '2026-04-01',
      dateTo: '2026-05-31',
    });
    expect(path).toContain(`/incentives/${conversionId}/history`);
    expect(path).toContain('granularity=weekly');
    expect(path).toContain('dateFrom=2026-04-01');
    expect(path).toContain('dateTo=2026-05-31');
  });
});
