import { z } from 'zod';

const envSchema = z.object({
  FUUL_API_BASE_URL: z.string().url().default('https://api.fuul.xyz'),
  FUUL_OAUTH_CLIENT_ID: z.string().min(1).default('fuul-agent'),
  FUUL_OAUTH_REDIRECT_URI: z.string().url().default('http://127.0.0.1:8765/callback'),
});

export type Env = z.infer<typeof envSchema> & { debug: boolean };

export function loadEnv(processEnv: NodeJS.ProcessEnv = process.env): Env {
  const base = envSchema.parse({
    FUUL_API_BASE_URL: processEnv.FUUL_API_BASE_URL,
    FUUL_OAUTH_CLIENT_ID: processEnv.FUUL_OAUTH_CLIENT_ID,
    FUUL_OAUTH_REDIRECT_URI: processEnv.FUUL_OAUTH_REDIRECT_URI,
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
