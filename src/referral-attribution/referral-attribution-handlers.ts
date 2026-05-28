import { assertWriteConfirmedOrDryRun } from '../agent/write-confirmation.js';
import { ApiRequestError, type FuulApiClient } from '../http/fuul-api-client.js';
import { buildNestQueryString } from '../http/nest-query.js';
import type {
  GetUserReferrerInput,
  RemoveUserFromReferralCodeInput,
  SwapUserReferralCodeInput,
  UpdateUserReferrerInput,
  UseReferralCodeInput,
} from '../tools/tool-schemas.js';

const ALREADY_REMOVED_MESSAGES = new Set([
  'User has not used this referral code',
  'User referrer relationship not found',
  'User referrer relationship does not match the referral code',
]);

export function isAlreadyRemovedMessage(message: string): boolean {
  return ALREADY_REMOVED_MESSAGES.has(message);
}

export function buildUpdateUserReferrerBody(
  fields: Pick<
    UpdateUserReferrerInput,
    'user_identifier' | 'user_identifier_type' | 'referrer_identifier' | 'referrer_identifier_type' | 'referral_code'
  >,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    user_identifier: fields.user_identifier,
    user_identifier_type: fields.user_identifier_type,
    referrer_identifier: fields.referrer_identifier,
    referrer_identifier_type: fields.referrer_identifier_type,
  };
  if (fields.referral_code != null && fields.referral_code !== '') {
    body.referral_code = fields.referral_code;
  }
  return body;
}

export function buildDeleteReferralPath(
  code: string,
  query: {
    user_identifier: string;
    user_identifier_type: string;
    referrer_identifier: string;
    referrer_identifier_type: string;
  },
): string {
  const qs = buildNestQueryString(query);
  const encoded = encodeURIComponent(code);
  return qs ? `/api/v1/referral_codes/${encoded}/referrals?${qs}` : `/api/v1/referral_codes/${encoded}/referrals`;
}

export function buildUseReferralCodePath(
  code: string,
  query: {
    user_identifier: string;
    user_identifier_type: string;
  },
): string {
  const qs = buildNestQueryString(query);
  const encoded = encodeURIComponent(code);
  return qs ? `/api/v1/referral_codes/${encoded}/use?${qs}` : `/api/v1/referral_codes/${encoded}/use`;
}

export function buildGetUserReferrerPath(query: { user_identifier: string; user_identifier_type: string }): string {
  const qs = buildNestQueryString(query);
  return qs ? `/api/v1/user/referrer?${qs}` : '/api/v1/user/referrer';
}

function normalizePatchUseResult(data: unknown): { status: 'used' } {
  if (data === undefined || data === null || data === '') {
    return { status: 'used' };
  }
  return data as { status: 'used' };
}

export async function runGetUserReferrer(api: FuulApiClient, bearer: string, input: GetUserReferrerInput): Promise<unknown> {
  const path = buildGetUserReferrerPath({
    user_identifier: input.user_identifier,
    user_identifier_type: input.user_identifier_type,
  });
  return api.getJson(path, { bearerToken: bearer });
}

export async function runUpdateUserReferrer(api: FuulApiClient, bearer: string, input: UpdateUserReferrerInput): Promise<unknown> {
  assertWriteConfirmedOrDryRun(input);
  const body = buildUpdateUserReferrerBody(input);
  const path = '/api/v1/user-referrers';

  if (input.dry_run === true) {
    return { dry_run: true, would_put: path, body };
  }

  return api.putJson(path, body, { bearerToken: bearer });
}

export async function runUseReferralCode(api: FuulApiClient, bearer: string, input: UseReferralCodeInput): Promise<unknown> {
  assertWriteConfirmedOrDryRun(input);
  const path = buildUseReferralCodePath(input.referral_code, {
    user_identifier: input.user_identifier,
    user_identifier_type: input.user_identifier_type,
  });

  if (input.dry_run === true) {
    return { dry_run: true, would_patch: path, body: {} };
  }

  const data = await api.patchJson(path, {}, { bearerToken: bearer });
  return normalizePatchUseResult(data);
}

export async function runRemoveUserFromReferralCode(api: FuulApiClient, bearer: string, input: RemoveUserFromReferralCodeInput): Promise<unknown> {
  assertWriteConfirmedOrDryRun(input);
  const path = buildDeleteReferralPath(input.referral_code, {
    user_identifier: input.user_identifier,
    user_identifier_type: input.user_identifier_type,
    referrer_identifier: input.referrer_identifier,
    referrer_identifier_type: input.referrer_identifier_type,
  });

  if (input.dry_run === true) {
    return { dry_run: true, would_delete: path, body: {} };
  }

  try {
    return await api.deleteJson(path, { bearerToken: bearer, data: {} });
  } catch (e) {
    if (e instanceof ApiRequestError && e.status === 422 && isAlreadyRemovedMessage(e.message)) {
      return { already_removed: true, reason: e.message };
    }
    throw e;
  }
}

export async function runSwapUserReferralCode(api: FuulApiClient, bearer: string, input: SwapUserReferralCodeInput): Promise<unknown> {
  assertWriteConfirmedOrDryRun(input);

  const removePath = buildDeleteReferralPath(input.from_referral_code, {
    user_identifier: input.user_identifier,
    user_identifier_type: input.user_identifier_type,
    referrer_identifier: input.from_referrer_identifier,
    referrer_identifier_type: input.from_referrer_identifier_type,
  });

  const usePath = buildUseReferralCodePath(input.to_referral_code, {
    user_identifier: input.user_identifier,
    user_identifier_type: input.user_identifier_type,
  });

  if (input.dry_run === true) {
    return {
      dry_run: true,
      step1_remove: { would_delete: removePath, body: {} },
      step2_use: { would_patch: usePath, body: {} },
    };
  }

  let removeResult: unknown;
  try {
    removeResult = await api.deleteJson(removePath, { bearerToken: bearer, data: {} });
  } catch (e) {
    if (e instanceof ApiRequestError && e.status === 422 && isAlreadyRemovedMessage(e.message)) {
      removeResult = { already_removed: true, reason: e.message };
    } else {
      throw e;
    }
  }

  try {
    const useResult = normalizePatchUseResult(await api.patchJson(usePath, {}, { bearerToken: bearer }));
    return { remove: removeResult, use: useResult };
  } catch (e) {
    const useError =
      e instanceof ApiRequestError ? { message: e.message, status: e.status } : { message: e instanceof Error ? e.message : String(e) };
    return {
      partial: true,
      remove: removeResult,
      use_error: useError,
    };
  }
}
