# Consumer notes

Index of all documentation: [docs/README.md](../README.md).

## URLs

| Environment | API | App (OAuth browser step) |
| --- | --- | --- |
| Production | `https://api.fuul.xyz` | `https://app.fuul.xyz` |
| Staging | `https://api.stg.fuul.xyz` | `https://app.stg.fuul.xyz` |

Set `FUUL_API_BASE_URL` to the **origin** only (no `/api/v1` suffix).

## Minimum fuul-server / Phase 1

- **Agent OAuth** enabled (`FUUL_AGENT_OAUTH_*`) so `fuul-mcp login` completes.
- **Authenticated metadata**: `GET /public-api/v1/metadata/*` (chains, trigger-types with `schema_status`, payout-schemas).
- **Dashboard JWT** on: `GET/POST/PATCH` routes used by the tools above (projects, incentives, triggers, payouts, affiliate-portal stats).

Pin the server **git tag / release** to the deployment that includes Phase 1 `schema_status` on trigger-types metadata (required for `create_incentive_program` / `update_incentive_program`).

## CI / OAuth smoke

Automated OAuth browser login is **not** run in CI for this package (no headless credentials). CI runs **lint, unit tests, and `tsc`**. Staging smoke tests are manual: `fuul-mcp login`, then MCP tools against staging.

## npm artifact

Package: `@fuul/mcp-server`. Publish via GitHub Actions on release tag when `NPM_TOKEN` is configured (see `.github/workflows/publish.yml`).
