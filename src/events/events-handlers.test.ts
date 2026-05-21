import { describe, expect, it, vi } from 'vitest';

import { WriteNotConfirmedError } from '../agent/write-confirmation.js';
import { buildSendEventBody, runSendBatchEvents, runSendEvent } from './events-handlers.js';

describe('buildSendEventBody', () => {
  it('maps flat fields to Public API shape', () => {
    expect(
      buildSendEventBody({
        name: 'trade',
        dedup_id: 'dedup-1',
        user_identifier: '0xabc',
        user_identifier_type: 'evm_address',
        args: { volume: 100 },
        timestamp: 1_700_000_000_000,
      }),
    ).toEqual({
      name: 'trade',
      dedup_id: 'dedup-1',
      user: { identifier: '0xabc', identifier_type: 'evm_address' },
      args: { volume: 100 },
      timestamp: 1_700_000_000_000,
    });
  });

  it('omits optional args and timestamp when unset', () => {
    expect(
      buildSendEventBody({
        name: 'deposit',
        dedup_id: 'dedup-2',
        user_identifier: 'user@example.com',
        user_identifier_type: 'email',
      }),
    ).toEqual({
      name: 'deposit',
      dedup_id: 'dedup-2',
      user: { identifier: 'user@example.com', identifier_type: 'email' },
    });
  });
});

describe('runSendEvent', () => {
  it('dry_run does not post', async () => {
    const postJson = vi.fn();
    const result = await runSendEvent({ postJson } as never, 'test-key', {
      name: 'trade',
      dedup_id: 'd1',
      user_identifier: '0x1',
      user_identifier_type: 'evm_address',
      dry_run: true,
    });
    expect(postJson).not.toHaveBeenCalled();
    expect(result).toMatchObject({ dry_run: true, would_post: '/api/v1/events' });
  });

  it('confirmed posts and normalizes empty 201 body', async () => {
    const postJson = vi.fn().mockResolvedValue(undefined);
    const result = await runSendEvent({ postJson } as never, 'test-key', {
      name: 'trade',
      dedup_id: 'd1',
      user_identifier: '0x1',
      user_identifier_type: 'evm_address',
      confirmed: true,
    });
    expect(postJson).toHaveBeenCalledWith('/api/v1/events', expect.objectContaining({ name: 'trade', dedup_id: 'd1' }), { bearerToken: 'test-key' });
    expect(result).toEqual({ status: 'created' });
  });

  it('throws without dry_run or confirmed', async () => {
    await expect(
      runSendEvent({ postJson: vi.fn() } as never, 'k', {
        name: 'trade',
        dedup_id: 'd1',
        user_identifier: '0x1',
        user_identifier_type: 'evm_address',
      }),
    ).rejects.toBeInstanceOf(WriteNotConfirmedError);
  });
});

describe('runSendBatchEvents', () => {
  it('dry_run previews batch body', async () => {
    const postJson = vi.fn();
    const result = await runSendBatchEvents({ postJson } as never, 'test-key', {
      events: [
        {
          name: 'trade',
          dedup_id: 'd1',
          user_identifier: '0x1',
          user_identifier_type: 'evm_address',
        },
      ],
      dry_run: true,
    });
    expect(postJson).not.toHaveBeenCalled();
    expect(result).toMatchObject({ dry_run: true, event_count: 1, would_post: '/api/v1/events/batch' });
  });
});
