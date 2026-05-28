import { describe, expect, it, vi } from 'vitest';

import { WriteNotConfirmedError } from '../agent/write-confirmation.js';
import { ApiRequestError } from '../http/fuul-api-client.js';
import {
  buildDeleteReferralPath,
  buildGetUserReferrerPath,
  buildUpdateUserReferrerBody,
  buildUseReferralCodePath,
  isAlreadyRemovedMessage,
  runGetUserReferrer,
  runRemoveUserFromReferralCode,
  runSwapUserReferralCode,
  runUpdateUserReferrer,
  runUseReferralCode,
} from './referral-attribution-handlers.js';

describe('isAlreadyRemovedMessage', () => {
  it('returns true for known no-op 422 messages', () => {
    expect(isAlreadyRemovedMessage('User has not used this referral code')).toBe(true);
    expect(isAlreadyRemovedMessage('User referrer relationship not found')).toBe(true);
    expect(isAlreadyRemovedMessage('User referrer relationship does not match the referral code')).toBe(true);
  });

  it('returns false for other errors', () => {
    expect(isAlreadyRemovedMessage('Referral code not found')).toBe(false);
  });
});

describe('buildUpdateUserReferrerBody', () => {
  it('maps fields and omits referral_code when unset', () => {
    expect(
      buildUpdateUserReferrerBody({
        user_identifier: '0xuser',
        user_identifier_type: 'evm_address',
        referrer_identifier: '0xref',
        referrer_identifier_type: 'evm_address',
      }),
    ).toEqual({
      user_identifier: '0xuser',
      user_identifier_type: 'evm_address',
      referrer_identifier: '0xref',
      referrer_identifier_type: 'evm_address',
    });
  });

  it('includes referral_code when provided', () => {
    expect(
      buildUpdateUserReferrerBody({
        user_identifier: '0xuser',
        user_identifier_type: 'evm_address',
        referrer_identifier: '0xref',
        referrer_identifier_type: 'evm_address',
        referral_code: 'PROMO',
      }),
    ).toMatchObject({ referral_code: 'PROMO' });
  });
});

describe('buildDeleteReferralPath', () => {
  it('encodes code and builds query string', () => {
    const path = buildDeleteReferralPath('CODE+1', {
      user_identifier: '0xu',
      user_identifier_type: 'evm_address',
      referrer_identifier: '0xr',
      referrer_identifier_type: 'evm_address',
    });
    expect(path).toContain('/api/v1/referral_codes/CODE%2B1/referrals?');
    expect(path).toContain('user_identifier=0xu');
  });
});

describe('buildUseReferralCodePath', () => {
  it('encodes code and builds query string', () => {
    const path = buildUseReferralCodePath('CODE+1', {
      user_identifier: '0xu',
      user_identifier_type: 'evm_address',
    });
    expect(path).toContain('/api/v1/referral_codes/CODE%2B1/use?');
    expect(path).toContain('user_identifier=0xu');
  });
});

describe('buildGetUserReferrerPath', () => {
  it('builds query string for user referrer read', () => {
    const path = buildGetUserReferrerPath({
      user_identifier: '0xu',
      user_identifier_type: 'evm_address',
    });
    expect(path).toBe('/api/v1/user/referrer?user_identifier=0xu&user_identifier_type=evm_address');
  });
});

describe('runGetUserReferrer', () => {
  it('calls getJson with user referrer path', async () => {
    const getJson = vi.fn().mockResolvedValue({ referrer_identifier: '0xref' });
    await runGetUserReferrer({ getJson } as never, 'key', {
      user_identifier: '0x1',
      user_identifier_type: 'evm_address',
    });
    expect(getJson).toHaveBeenCalledWith('/api/v1/user/referrer?user_identifier=0x1&user_identifier_type=evm_address', {
      bearerToken: 'key',
    });
  });
});

describe('runUpdateUserReferrer', () => {
  it('dry_run does not call API', async () => {
    const putJson = vi.fn();
    const result = await runUpdateUserReferrer({ putJson } as never, 'key', {
      user_identifier: '0x1',
      user_identifier_type: 'evm_address',
      referrer_identifier: '0x2',
      referrer_identifier_type: 'evm_address',
      dry_run: true,
    });
    expect(putJson).not.toHaveBeenCalled();
    expect(result).toMatchObject({ dry_run: true, would_put: '/api/v1/user-referrers' });
  });

  it('confirmed calls putJson', async () => {
    const putJson = vi.fn().mockResolvedValue({ success: true });
    await runUpdateUserReferrer({ putJson } as never, 'key', {
      user_identifier: '0x1',
      user_identifier_type: 'evm_address',
      referrer_identifier: '0x2',
      referrer_identifier_type: 'evm_address',
      confirmed: true,
    });
    expect(putJson).toHaveBeenCalledWith('/api/v1/user-referrers', expect.any(Object), { bearerToken: 'key' });
  });

  it('throws without dry_run or confirmed', async () => {
    await expect(
      runUpdateUserReferrer({ putJson: vi.fn() } as never, 'k', {
        user_identifier: '0x1',
        user_identifier_type: 'evm_address',
        referrer_identifier: '0x2',
        referrer_identifier_type: 'evm_address',
      }),
    ).rejects.toBeInstanceOf(WriteNotConfirmedError);
  });
});

describe('runUseReferralCode', () => {
  const baseInput = {
    referral_code: 'PROMO',
    user_identifier: '0xu',
    user_identifier_type: 'evm_address' as const,
  };

  it('dry_run does not call API', async () => {
    const patchJson = vi.fn();
    const result = await runUseReferralCode({ patchJson } as never, 'key', { ...baseInput, dry_run: true });
    expect(patchJson).not.toHaveBeenCalled();
    expect(result).toMatchObject({ dry_run: true, would_patch: expect.stringContaining('/use?') });
  });

  it('confirmed calls patchJson and normalizes 204', async () => {
    const patchJson = vi.fn().mockResolvedValue(undefined);
    const result = await runUseReferralCode({ patchJson } as never, 'key', { ...baseInput, confirmed: true });
    expect(patchJson).toHaveBeenCalledWith(expect.stringContaining('/referral_codes/PROMO/use?'), {}, { bearerToken: 'key' });
    expect(result).toEqual({ status: 'used' });
  });
});

describe('runRemoveUserFromReferralCode', () => {
  const baseInput = {
    referral_code: 'OLD',
    user_identifier: '0xu',
    user_identifier_type: 'evm_address' as const,
    referrer_identifier: '0xr',
    referrer_identifier_type: 'evm_address' as const,
  };

  it('maps 422 already removed to structured response', async () => {
    const deleteJson = vi.fn().mockRejectedValue(new ApiRequestError('User has not used this referral code', 422));
    const result = await runRemoveUserFromReferralCode({ deleteJson } as never, 'key', {
      ...baseInput,
      confirmed: true,
    });
    expect(result).toEqual({ already_removed: true, reason: 'User has not used this referral code' });
  });

  it('rethrows other 422 errors', async () => {
    const deleteJson = vi.fn().mockRejectedValue(new ApiRequestError('Referral code not found', 422));
    await expect(runRemoveUserFromReferralCode({ deleteJson } as never, 'key', { ...baseInput, confirmed: true })).rejects.toBeInstanceOf(
      ApiRequestError,
    );
  });
});

describe('runSwapUserReferralCode', () => {
  const baseInput = {
    user_identifier: '0xu',
    user_identifier_type: 'evm_address' as const,
    from_referral_code: 'OLD',
    from_referrer_identifier: '0xold',
    from_referrer_identifier_type: 'evm_address' as const,
    to_referral_code: 'NEW',
  };

  it('dry_run returns two-step preview with patch use', async () => {
    const result = await runSwapUserReferralCode({ deleteJson: vi.fn(), patchJson: vi.fn() } as never, 'key', {
      ...baseInput,
      dry_run: true,
    });
    expect(result).toMatchObject({
      dry_run: true,
      step1_remove: expect.objectContaining({ would_delete: expect.stringContaining('OLD') }),
      step2_use: expect.objectContaining({ would_patch: expect.stringContaining('/use?') }),
    });
  });

  it('confirmed runs delete then patch use', async () => {
    const deleteJson = vi.fn().mockResolvedValue({ status: 'deleted' });
    const patchJson = vi.fn().mockResolvedValue(undefined);
    const result = await runSwapUserReferralCode({ deleteJson, patchJson } as never, 'key', {
      ...baseInput,
      confirmed: true,
    });
    expect(deleteJson).toHaveBeenCalled();
    expect(patchJson).toHaveBeenCalledWith(expect.stringContaining('/referral_codes/NEW/use?'), {}, { bearerToken: 'key' });
    expect(result).toMatchObject({ remove: { status: 'deleted' }, use: { status: 'used' } });
  });

  it('returns partial when patch use fails after delete', async () => {
    const deleteJson = vi.fn().mockResolvedValue({ status: 'deleted' });
    const patchJson = vi.fn().mockRejectedValue(new ApiRequestError('User already has a referrer', 422));
    const result = await runSwapUserReferralCode({ deleteJson, patchJson } as never, 'key', {
      ...baseInput,
      confirmed: true,
    });
    expect(result).toMatchObject({
      partial: true,
      remove: { status: 'deleted' },
      use_error: { message: 'User already has a referrer', status: 422 },
    });
  });
});
