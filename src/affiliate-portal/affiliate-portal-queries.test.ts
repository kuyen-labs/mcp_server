import { describe, expect, it } from 'vitest';

import { affiliatePortalStatsPath, projectAffiliatesBreakdownPath, projectAffiliateTotalStatsPath } from './affiliate-portal-queries.js';

const projectId = '00000000-0000-4000-8000-000000000001';

describe('affiliate portal paths', () => {
  it('builds stats path with user_identifier', () => {
    const path = affiliatePortalStatsPath({
      project_id: projectId,
      user_identifier: 'evm:0xabc',
    });
    expect(path).toBe(`/api/v1/projects/${projectId}/affiliate-portal/stats?user_identifier=${encodeURIComponent('evm:0xabc')}`);
  });

  it('builds total-stats path with optional filters', () => {
    const path = projectAffiliateTotalStatsPath({
      project_id: projectId,
      dateRange: '30d',
      statuses: ['Active'],
    });
    expect(path).toContain(`projects/${projectId}/affiliate-portal/total-stats`);
    expect(path).toContain('dateRange=30d');
    expect(path).toContain('statuses=Active');
  });

  it('builds global-breakdown path with required groupBy', () => {
    const path = projectAffiliatesBreakdownPath({
      project_id: projectId,
      groupBy: 'region',
      dateRange: '7d',
    });
    expect(path).toContain(`projects/${projectId}/affiliate-portal/global-breakdown`);
    expect(path).toContain('groupBy=region');
    expect(path).toContain('dateRange=7d');
  });
});
