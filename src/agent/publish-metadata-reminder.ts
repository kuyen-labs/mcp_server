export const PUBLISH_METADATA_REMINDER =
  'Changes were saved as draft. To take effect in production, publish the project metadata from the Fuul dashboard: Project → Incentives or Triggers → Publish now (bottom snackbar). This MCP cannot publish metadata for you.';

export const TIERED_PAYOUT_READBACK_REMINDER =
  'After a tiered payout write, call get_incentive and verify each payout_groups[] row has project_tier populated (not null) with the expected end_user_amount_percentage / affiliate_amount_percentage. dry_run success does not guarantee the dashboard will show tiers correctly.';

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

export function withTieredPayoutReadbackReminder(data: unknown): unknown {
  if (data !== null && typeof data === 'object' && !Array.isArray(data)) {
    return { ...(data as Record<string, unknown>), _readback_reminder: TIERED_PAYOUT_READBACK_REMINDER };
  }
  return {
    result: data,
    _readback_reminder: TIERED_PAYOUT_READBACK_REMINDER,
  };
}

export function withPayoutWriteReminders(data: unknown, dryRun?: boolean, tiered?: boolean): unknown {
  let payload = withPublishMetadataReminder(data, dryRun);
  if (tiered && dryRun !== true) {
    payload = withTieredPayoutReadbackReminder(payload);
  }
  return payload;
}

export function stringifyToolPayload(data: unknown, dryRun?: boolean): string {
  return JSON.stringify(withPublishMetadataReminder(data, dryRun), null, 2);
}

export function stringifyPayoutWritePayload(data: unknown, dryRun?: boolean, tiered?: boolean): string {
  return JSON.stringify(withPayoutWriteReminders(data, dryRun, tiered), null, 2);
}
