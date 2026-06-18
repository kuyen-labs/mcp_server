import { describe, expect, it } from 'vitest';

import { POOL_PAYOUT_PLAYBOOK, POOL_PAYOUT_UNSUPPORTED, POOL_PAYOUT_WORKFLOW_STEPS } from './pool-payout-guide.js';

describe('POOL_PAYOUT_PLAYBOOK', () => {
  it('defines workflow steps ending in get_incentive readback', () => {
    expect(POOL_PAYOUT_WORKFLOW_STEPS).toHaveLength(6);
    expect(POOL_PAYOUT_WORKFLOW_STEPS[0]?.mcp_tool).toContain('list_payout_schemas');
    expect(POOL_PAYOUT_WORKFLOW_STEPS[5]?.mcp_tool).toBe('get_incentive');
  });

  it('documents unsupported dynamic/volume-banded pool sizing', () => {
    const joined = POOL_PAYOUT_UNSUPPORTED.join(' ');
    expect(joined).toMatch(/dynamic/i);
    expect(joined).toMatch(/volume-banded/i);
    expect(POOL_PAYOUT_PLAYBOOK.mechanics.pool_amount_semantics).toContain('Fixed');
  });

  it('lists editable pool fields with bounds', () => {
    const poolAmount = POOL_PAYOUT_PLAYBOOK.editable_fields.find((row) => row.field === 'pool_amount');
    expect(poolAmount?.required).toBe(true);
    const duration = POOL_PAYOUT_PLAYBOOK.editable_fields.find((row) => row.field === 'pool_duration');
    expect(duration?.bounds).toContain('8760');
  });
});
