import { describe, expect, it } from 'vitest';

import { loadEnv } from '../config/env.js';
import { MissingProjectApiKeyError, resolveProjectApiKeyBearer } from './project-api-key-bearer.js';

describe('resolveProjectApiKeyBearer', () => {
  it('prefers tool argument over env', () => {
    const env = loadEnv({
      ...process.env,
      FUUL_MCP_PROJECT_API_KEY: 'from-env',
    });
    expect(resolveProjectApiKeyBearer(env, '  from-tool  ')).toBe('from-tool');
  });

  it('uses env when tool key omitted', () => {
    const env = loadEnv({
      ...process.env,
      FUUL_MCP_PROJECT_API_KEY: 'env-key',
    });
    expect(resolveProjectApiKeyBearer(env)).toBe('env-key');
  });

  it('throws when neither tool nor env key is set', () => {
    const env = loadEnv({
      ...process.env,
      FUUL_MCP_PROJECT_API_KEY: '',
    });
    expect(() => resolveProjectApiKeyBearer(env)).toThrow(MissingProjectApiKeyError);
  });
});
