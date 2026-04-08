import { config as loadDotEnv } from 'dotenv';
import { z } from 'zod';

loadDotEnv();

const envSchema = z.object({
  FUUL_API_BASE_URL: z.string().url().default('https://api.fuul.xyz'),
  FUUL_OAUTH_CLIENT_ID: z.string().min(1).default('fuul-agent'),
  FUUL_OAUTH_REDIRECT_URI: z.string().url().default('http://127.0.0.1:8765/callback'),
  /** Max wall time per MCP tool call (ms). Covers refresh + retry on 401. */
  FUUL_MCP_TOOL_TIMEOUT_MS: z.coerce.number().int().positive().default(90_000),
});

export type Env = z.infer<typeof envSchema> & { debug: boolean };

export function loadEnv(processEnv: NodeJS.ProcessEnv = process.env): Env {
  const base = envSchema.parse({
    FUUL_API_BASE_URL: processEnv.FUUL_API_BASE_URL,
    FUUL_OAUTH_CLIENT_ID: processEnv.FUUL_OAUTH_CLIENT_ID,
    FUUL_OAUTH_REDIRECT_URI: processEnv.FUUL_OAUTH_REDIRECT_URI,
    FUUL_MCP_TOOL_TIMEOUT_MS: processEnv.FUUL_MCP_TOOL_TIMEOUT_MS,
  });
  return {
    ...base,
    debug: processEnv.FUUL_MCP_DEBUG === '1' || processEnv.FUUL_MCP_DEBUG === 'true',
  };
}

/** API origin with no trailing slash (OAuth and REST live under this host). */
export function apiOriginFromEnv(env: Env): string {
  return env.FUUL_API_BASE_URL.replace(/\/+$/, '');
}
