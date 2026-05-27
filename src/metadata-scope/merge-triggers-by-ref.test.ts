import { describe, expect, it } from 'vitest';

import { enrichIncentiveWithTriggerScope, enrichProjectWithMetadataScope } from './enrich-responses.js';
import { extractPublishedTriggersFromCustomizations, mergeTriggersByRef } from './merge-triggers-by-ref.js';

describe('mergeTriggersByRef', () => {
  it('merges draft and published rows with the same ref', () => {
    const merged = mergeTriggersByRef(
      [{ id: 'draft-1', ref: 'swap', signature: 'swap_event', name: 'Draft swap' }],
      [{ id: 'live-1', ref: 'swap', signature: 'swap_event', name: 'Live swap' }],
    );

    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({
      ref: 'swap',
      draft_trigger_id: 'draft-1',
      published_trigger_id: 'live-1',
      draft: { id: 'draft-1' },
      published: { id: 'live-1', ref: 'swap' },
    });
  });

  it('returns draft-only and published-only refs', () => {
    const merged = mergeTriggersByRef(
      [{ id: 'd-only', ref: 'draft-only', signature: 'a' }],
      [{ id: 'p-only', ref: 'published-only', signature: 'b', name: 'P' }],
    );

    expect(merged.map((row) => row.ref).sort()).toEqual(['draft-only', 'published-only']);
    const draftOnly = merged.find((row) => row.ref === 'draft-only');
    const publishedOnly = merged.find((row) => row.ref === 'published-only');
    expect(draftOnly?.published_trigger_id).toBeNull();
    expect(publishedOnly?.draft_trigger_id).toBeNull();
  });
});

describe('extractPublishedTriggersFromCustomizations', () => {
  it('reads project.triggers from customizations payload', () => {
    const published = extractPublishedTriggersFromCustomizations({
      project: {
        triggers: [{ id: 'live-1', ref: 'swap', signature: 'swap_event', name: 'Swap' }],
      },
    });

    expect(published).toEqual([{ id: 'live-1', ref: 'swap', signature: 'swap_event', name: 'Swap' }]);
  });
});

describe('enrichProjectWithMetadataScope', () => {
  it('replaces project triggers and enriches conversion triggers', () => {
    const enriched = enrichProjectWithMetadataScope(
      {
        id: 'project-1',
        triggers: [{ id: 'draft-1', ref: 'swap', signature: 'swap_event' }],
        conversions: [
          {
            id: 'conv-1',
            slug: 'program-a',
            triggers: [{ id: 'draft-1', ref: 'swap', signature: 'swap_event' }],
          },
        ],
      },
      {
        project: {
          triggers: [{ id: 'live-1', ref: 'swap', signature: 'swap_event', name: 'Swap' }],
        },
      },
    );

    const triggers = enriched.triggers as Array<{ published_trigger_id: string }>;
    expect(triggers[0].published_trigger_id).toBe('live-1');

    const conversions = enriched.conversions as Array<{
      draft_conversion_id: string;
      published_conversion_id: null;
      triggers: Array<{ published_trigger_id: string }>;
    }>;
    expect(conversions[0].draft_conversion_id).toBe('conv-1');
    expect(conversions[0].published_conversion_id).toBeNull();
    expect(conversions[0].triggers[0].published_trigger_id).toBe('live-1');
    expect(enriched.metadata_versions).toBeDefined();
  });
});

describe('enrichIncentiveWithTriggerScope', () => {
  it('maps nested incentive triggers through the global ref map', () => {
    const mergedByRef = new Map(
      mergeTriggersByRef(
        [{ id: 'draft-1', ref: 'swap', signature: 'swap_event' }],
        [{ id: 'live-1', ref: 'swap', signature: 'swap_event', name: 'Swap' }],
      ).map((row) => [row.ref, row]),
    );

    const scoped = enrichIncentiveWithTriggerScope(
      {
        id: 'conv-1',
        slug: 'program-a',
        triggers: [{ id: 'draft-1', ref: 'swap', signature: 'swap_event' }],
      },
      mergedByRef,
    );

    expect(scoped.draft_conversion_id).toBe('conv-1');
    expect(scoped.triggers[0].published_trigger_id).toBe('live-1');
  });
});
