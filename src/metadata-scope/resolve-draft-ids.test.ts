import { describe, expect, it } from 'vitest';

import { attachDraftIdResolution, resolveDraftConversionIdFromProject, resolveDraftTriggerIdFromProject } from './resolve-draft-ids.js';
import type { ScopedIncentive, ScopedTrigger } from './types.js';

function projectWithTriggers(triggers: ScopedTrigger[], conversions: ScopedIncentive[] = []): Record<string, unknown> {
  return { id: 'project-1', triggers, conversions };
}

describe('resolveDraftTriggerIdFromProject', () => {
  it('returns current draft when trigger_id matches draft_trigger_id', () => {
    const resolution = resolveDraftTriggerIdFromProject(
      projectWithTriggers([
        {
          ref: 'swap',
          signature: 'swap_event',
          draft_trigger_id: 'draft-1',
          published_trigger_id: 'live-1',
          draft: { id: 'draft-1' },
          published: { id: 'live-1', ref: 'swap', signature: 'swap_event', name: 'Swap' },
        },
      ]),
      'draft-1',
    );

    expect(resolution).toEqual({
      requested_trigger_id: 'draft-1',
      resolved_draft_trigger_id: 'draft-1',
      ref: 'swap',
      reason: 'current_draft',
    });
  });

  it('remaps published_trigger_id to current draft after publish rotation', () => {
    const resolution = resolveDraftTriggerIdFromProject(
      projectWithTriggers([
        {
          ref: 'hold-crv',
          signature: 'hold',
          draft_trigger_id: 'draft-b',
          published_trigger_id: 'draft-a',
          draft: { id: 'draft-b' },
          published: { id: 'draft-a', ref: 'hold-crv', signature: 'hold', name: 'Hold' },
        },
      ]),
      'draft-a',
    );

    expect(resolution).toEqual({
      requested_trigger_id: 'draft-a',
      resolved_draft_trigger_id: 'draft-b',
      ref: 'hold-crv',
      reason: 'published_id_remapped_to_current_draft',
    });
  });

  it('throws when id is unknown', () => {
    expect(() =>
      resolveDraftTriggerIdFromProject(
        projectWithTriggers([
          {
            ref: 'swap',
            signature: 'swap_event',
            draft_trigger_id: 'draft-1',
            published_trigger_id: null,
            draft: { id: 'draft-1' },
            published: null,
          },
        ]),
        'stale-unknown',
      ),
    ).toThrow(/rotate after dashboard publish/);
  });

  it('throws when published row has no draft', () => {
    expect(() =>
      resolveDraftTriggerIdFromProject(
        projectWithTriggers([
          {
            ref: 'published-only',
            signature: 'x',
            draft_trigger_id: null,
            published_trigger_id: 'live-only',
            draft: null,
            published: { id: 'live-only', ref: 'published-only', signature: 'x', name: 'P' },
          },
        ]),
        'live-only',
      ),
    ).toThrow(/no current draft row/);
  });
});

describe('resolveDraftConversionIdFromProject', () => {
  it('returns current draft conversion id', () => {
    const resolution = resolveDraftConversionIdFromProject(
      projectWithTriggers(
        [],
        [
          {
            slug: 'program-a',
            draft_conversion_id: 'conv-draft',
            published_conversion_id: null,
            draft: { id: 'conv-draft' },
            published: null,
            triggers: [],
          },
        ],
      ),
      'conv-draft',
    );

    expect(resolution.resolved_draft_conversion_id).toBe('conv-draft');
    expect(resolution.reason).toBe('current_draft');
  });

  it('throws when conversion id is unknown', () => {
    expect(() =>
      resolveDraftConversionIdFromProject(
        projectWithTriggers(
          [],
          [
            {
              slug: 'program-a',
              draft_conversion_id: 'conv-draft',
              published_conversion_id: null,
              draft: { id: 'conv-draft' },
              published: null,
              triggers: [],
            },
          ],
        ),
        'stale-conv',
      ),
    ).toThrow(/draft_conversion_id/);
  });
});

describe('attachDraftIdResolution', () => {
  it('merges resolution into object payloads', () => {
    const out = attachDraftIdResolution({ ok: true }, { ref: 'swap' });
    expect(out).toMatchObject({ ok: true, _draft_id_resolution: { ref: 'swap' } });
  });
});
