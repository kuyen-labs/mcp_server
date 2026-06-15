import { describe, expect, it } from 'vitest';

import { TIERED_AUDIENCE_BOOST_PLAYBOOK, TIERED_AUDIENCE_BOOST_WORKFLOW_STEPS } from './tiered-audience-boost-guide.js';

describe('TIERED_AUDIENCE_BOOST_PLAYBOOK', () => {
  it('defines a six-step workflow ending in get_incentive readback', () => {
    expect(TIERED_AUDIENCE_BOOST_WORKFLOW_STEPS).toHaveLength(6);
    expect(TIERED_AUDIENCE_BOOST_WORKFLOW_STEPS[0]?.mcp_tool).toBe('list_audiences');
    expect(TIERED_AUDIENCE_BOOST_WORKFLOW_STEPS[3]?.action).toContain('dry_run');
    expect(TIERED_AUDIENCE_BOOST_WORKFLOW_STEPS[5]?.mcp_tool).toBe('get_incentive');
  });

  it('documents project_tier_id wire field aligned with webapp', () => {
    const group = TIERED_AUDIENCE_BOOST_PLAYBOOK.wire_format.payout_group;
    expect(group.project_tier_id).toContain('projectTierId');
    expect(group.project_tier_id).toContain('audience_id');
  });
});
