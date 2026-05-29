export const PUBLISH_METADATA_REMINDER =
  'Changes were saved as draft. To take effect in production, publish the project metadata from the Fuul dashboard: Project → Incentives or Triggers → Publish now (bottom snackbar). This MCP cannot publish metadata for you.';

export function withPublishMetadataReminder(data: unknown, dryRun?: boolean): unknown {
  if (dryRun === true) {
    return data;
  }
  if (data !== null && typeof data === 'object' && !Array.isArray(data)) {
    return { ...(data as Record<string, unknown>), _publish_metadata_reminder: PUBLISH_METADATA_REMINDER };
  }
  return {
    result: data,
    _publish_metadata_reminder: PUBLISH_METADATA_REMINDER,
  };
}

export function stringifyToolPayload(data: unknown, dryRun?: boolean): string {
  return JSON.stringify(withPublishMetadataReminder(data, dryRun), null, 2);
}
