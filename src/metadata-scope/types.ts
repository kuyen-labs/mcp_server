export interface PublishedTriggerSummary {
  id: string;
  name: string;
  ref: string;
  signature: string;
  trigger_ui_settings?: unknown;
}

export interface ScopedTrigger {
  ref: string;
  signature: string;
  draft_trigger_id: string | null;
  published_trigger_id: string | null;
  draft: Record<string, unknown> | null;
  published: PublishedTriggerSummary | null;
}

export interface ScopedIncentive {
  slug: string;
  draft_conversion_id: string | null;
  published_conversion_id: null;
  draft: Record<string, unknown>;
  published: null;
  triggers: ScopedTrigger[];
}

export const METADATA_VERSIONS_NOTE =
  'Use published_trigger_id for live triggers (from GET customizations). published_conversion_id stays null until a published-incentives API exists; use draft_conversion_id for edits.';
