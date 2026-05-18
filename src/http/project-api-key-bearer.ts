import type { Env } from '../config/env.js';

export class MissingProjectApiKeyError extends Error {
  readonly code = 'MISSING_PROJECT_API_KEY' as const;

  constructor() {
    super(
      'Project API key required: pass project_api_key on the tool input or set FUUL_MCP_PROJECT_API_KEY. The managed project-affiliate routes use ApiKeyMiddleware only (dashboard OAuth from fuul-mcp login is not accepted there).',
    );
    this.name = 'MissingProjectApiKeyError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function resolveProjectApiKeyBearer(env: Env, toolProjectApiKey?: string): string {
  const fromTool = toolProjectApiKey?.trim();
  if (fromTool) {
    return fromTool;
  }
  const fromEnv = env.FUUL_MCP_PROJECT_API_KEY?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  throw new MissingProjectApiKeyError();
}
