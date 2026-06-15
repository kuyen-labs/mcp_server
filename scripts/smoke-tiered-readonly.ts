import { OAuthClient } from '../src/auth/oauth-client.js';
import { TokenStore } from '../src/auth/token-store.js';
import { loadEnv } from '../src/config/env.js';
import { TIERED_AUDIENCE_BOOST_PLAYBOOK } from '../src/incentives/tiered-audience-boost-guide.js';
import { ApiRequestError, FuulApiClient, NotLoggedInError } from '../src/http/fuul-api-client.js';

async function main(): Promise<void> {
  const projectId = process.argv[2];
  if (!projectId) {
    console.error('Usage: npm run smoke:tiered-readonly -- <project_uuid>');
    process.exit(1);
  }

  const env = loadEnv();
  const store = new TokenStore();
  const oauth = new OAuthClient(env, store);
  const api = new FuulApiClient(env, store, oauth);

  console.log(`API: ${env.FUUL_API_BASE_URL}`);
  console.log(`Project: ${projectId}`);
  console.log(`Playbook steps: ${TIERED_AUDIENCE_BOOST_PLAYBOOK.workflow_steps.length}`);

  try {
    const [audiences, tiers, schemas] = await Promise.all([
      api.getJson(`/api/v1/projects/${projectId}/audiences`),
      api.getJson(`/api/v1/projects/${projectId}/tiers`),
      api.getJson('/public-api/v1/metadata/payout-schemas'),
    ]);

    const audienceCount = Array.isArray(audiences) ? audiences.length : (audiences as { results?: unknown[] })?.results?.length ?? 0;
    const tierCount = Array.isArray(tiers) ? tiers.length : (tiers as { results?: unknown[] })?.results?.length ?? 0;
    const hasPlaybook =
      schemas !== null &&
      typeof schemas === 'object' &&
      !Array.isArray(schemas) &&
      'tiered_audience_boost_playbook' in (schemas as Record<string, unknown>);

    console.log(`list_audiences: ok (${audienceCount} rows)`);
    console.log(`list_project_tiers: ok (${tierCount} rows)`);
    console.log(`list_payout_schemas tiered playbook: ${hasPlaybook ? 'present' : 'MISSING'}`);

    if (!hasPlaybook) {
      process.exit(1);
    }

    console.log('Read-only smoke passed.');
  } catch (e) {
    if (e instanceof NotLoggedInError) {
      console.error('Not logged in. Run: npm run cli -- login');
      process.exit(1);
    }
    if (e instanceof ApiRequestError) {
      console.error(`API error HTTP ${e.status}: ${e.message}`);
      process.exit(1);
    }
    throw e;
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
