import { describe, expect, it } from 'vitest';

import { loadEnv } from './env.js';

describe('loadEnv', () => {
  it('treats empty string as unset so Zod defaults apply (e.g. Claude Code userConfig)', () => {
    const env = loadEnv({
      ...process.env,
      FUUL_API_BASE_URL: '',
      FUUL_OAUTH_CLIENT_ID: '',
      FUUL_OAUTH_REDIRECT_URI: '',
    });
    expect(env.FUUL_API_BASE_URL).toBe('https://api.fuul.xyz');
    expect(env.FUUL_OAUTH_CLIENT_ID).toBe('fuul-agent');
    expect(env.FUUL_OAUTH_REDIRECT_URI).toBe('http://127.0.0.1:8765/callback');
  });
});
