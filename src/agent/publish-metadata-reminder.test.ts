import { describe, expect, it } from 'vitest';

import { PUBLISH_METADATA_REMINDER, stringifyToolPayload, withPublishMetadataReminder } from './publish-metadata-reminder.js';

describe('withPublishMetadataReminder', () => {
  it('skips reminder on dry_run', () => {
    const input = { id: 'abc' };
    expect(withPublishMetadataReminder(input, true)).toBe(input);
  });

  it('adds reminder to object responses', () => {
    expect(withPublishMetadataReminder({ id: 'abc' }, false)).toEqual({
      id: 'abc',
      _publish_metadata_reminder: PUBLISH_METADATA_REMINDER,
    });
  });

  it('wraps non-object responses', () => {
    expect(withPublishMetadataReminder(null, false)).toEqual({
      result: null,
      _publish_metadata_reminder: PUBLISH_METADATA_REMINDER,
    });
  });
});

describe('stringifyToolPayload', () => {
  it('includes reminder in JSON for confirmed writes', () => {
    const text = stringifyToolPayload({ ok: true }, false);
    expect(text).toContain('_publish_metadata_reminder');
    expect(text).toContain('Publish now');
  });

  it('omits reminder for dry_run previews', () => {
    const text = stringifyToolPayload({ dry_run: true }, true);
    expect(text).not.toContain('_publish_metadata_reminder');
  });
});
