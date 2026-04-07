import { createHash, randomBytes } from 'node:crypto';

/** RFC 7636 code verifier (43–128 characters). */
export function createCodeVerifier(): string {
  return randomBytes(32).toString('base64url');
}

export function createCodeChallengeS256(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

export function createOAuthState(): string {
  return randomBytes(16).toString('base64url');
}
