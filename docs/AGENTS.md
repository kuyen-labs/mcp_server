# MCP server — maintainer reference

One place for tool↔API mapping, env, and conventions. User-facing setup stays in the root [README.md](../README.md).

## Tools → HTTP

| Tool | Request | Auth |
| --- | --- | --- |
| `ping` | (none) | — |
| `whoami` | `GET /api/v1/auth/user` | Bearer |
| `list_chains` | `GET /public-api/v1/metadata/chains` | Bearer |
| `list_trigger_types` | `GET /public-api/v1/metadata/trigger-types` | Bearer |
| `list_payout_schemas` | `GET /public-api/v1/metadata/payout-schemas` | Bearer |

CLI (`login`, `whoami`, `logout`) uses the same API origin and token file as the MCP tools; `login` drives browser OAuth against `FUUL_API_BASE_URL`.

## Environment

| Variable | Notes |
| --- | --- |
| `FUUL_API_BASE_URL` | API **origin** only (no `/api/v1`). Example staging: `https://api.stg.fuul.xyz`, production: `https://api.fuul.xyz`. |
| `FUUL_MCP_TOOL_TIMEOUT_MS` | Per-tool async cap (default `90000`). |

Server side needs Agent OAuth (`FUUL_AGENT_OAUTH_*` on fuul-server) and the metadata routes above. Web OAuth flow uses the app host (e.g. `app.fuul.xyz` / `app.stg.fuul.xyz`).

## Mutating tools (when added)

Two-step guard: `dry_run: true` (preview, no mutation) then `confirmed: true` (execute). Helpers: `src/agent/write-confirmation.ts`. Read-only tools do not use `confirmed`.

## What’s next

More program/operations tools, pagination when APIs support it, publish pipeline — tracked in normal PRs; this file only reflects what exists today.
