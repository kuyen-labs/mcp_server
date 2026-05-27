import { describe, expect, it, vi } from 'vitest';

import { WriteNotConfirmedError } from '../agent/write-confirmation.js';
import { ApiRequestError } from '../http/fuul-api-client.js';
import { buildSendEventBody, runCheckEventStatus, runSendBatchEvents, runSendEvent } from './events-handlers.js';

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

describe('runCheckEventStatus', () => {
  it('calls status endpoint when verbose is not set', async () => {
    const getJson = vi.fn().mockResolvedValue({ created: true });
    const result = await runCheckEventStatus({ getJson } as never, 'test-key', {
      user_identifier: '0x1',
      user_identifier_type: 'evm_address',
      event_name: 'trade',
    });
    expect(getJson).toHaveBeenCalledWith('/api/v1/events/status', {
      bearerToken: 'test-key',
      query: {
        user_identifier: '0x1',
        user_identifier_type: 'evm_address',
        event_name: 'trade',
      },
    });
    expect(result).toEqual({ created: true });
  });

  it('calls pipeline endpoint when verbose is true', async () => {
    const getJson = vi.fn().mockResolvedValue({ created: true, event: { id: 'e1' } });
    await runCheckEventStatus({ getJson } as never, 'test-key', {
      verbose: true,
      dedup_id: 'dedup-1',
      event_name: 'trade',
    });
    expect(getJson).toHaveBeenCalledWith('/api/v1/events/pipeline', {
      bearerToken: 'test-key',
      query: { dedup_id: 'dedup-1', event_name: 'trade' },
    });
  });

  it('maps pipeline 404 to created false', async () => {
    const getJson = vi.fn().mockRejectedValue(new ApiRequestError('Not found', 404));
    const result = await runCheckEventStatus({ getJson } as never, 'test-key', {
      verbose: true,
      event_id: '00000000-0000-4000-8000-000000000001',
    });
    expect(result).toEqual({ created: false });
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
