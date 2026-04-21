# @fuul/mcp-server

Fuul [Model Context Protocol](https://modelcontextprotocol.io/) server: OAuth login (`fuul-mcp`), metadata proxy tools, project and affiliate analytics, incentive/payout operations (reads + confirmed writes), and rate-limit-aware errors.

| Resource | Purpose |
| -------- | ------- |
| [docs/AGENTS.md](docs/AGENTS.md) | **Tool ↔ HTTP** map (audit, support, PR review) |
| [docs/mcp-phase2/CONSUMER.md](docs/mcp-phase2/CONSUMER.md) | Staging/production URLs, minimum API expectations |
| [docs/mcp-phase2/tool-prompts.md](docs/mcp-phase2/tool-prompts.md) | Sample prompts for LLM tooling |
| [CHANGELOG.md](CHANGELOG.md) | Release notes |

## Repository layout

```
mcp_server/
├── src/
│   ├── index.ts              # MCP stdio server + tool registration
│   ├── cli.ts                # fuul-mcp login | whoami | logout
│   ├── affiliate-portal/   # Affiliate stats URL builders + tests
│   ├── agent/                # dry_run / confirmed for writes
│   ├── auth/                 # OAuth + token store
│   ├── http/                 # FuulApiClient, Nest-style query serialization
│   ├── incentives/           # create/update program handlers
│   ├── metadata/             # chains, trigger-types, payout-schemas cache
│   ├── payouts/              # approve/reject batch handlers
│   ├── tools/                # Zod schemas + LLM-oriented descriptions
│   └── util/
├── docs/
├── .github/workflows/        # ci.yml (lint, test, build), publish.yml (npm on release)
└── dist/                     # `npm run build` output (gitignored)
```

## Requirements

- **Node.js** 18+
- A running **fuul-server** (staging or production) with **Agent OAuth** (`FUUL_AGENT_OAUTH_*` on the API).

## Install

```bash
git clone <repo-url>
cd mcp_server
npm ci
```

Copy the env template and set `FUUL_API_BASE_URL` (and OAuth fields if not using defaults):

```bash
cp .env.example .env
```

Variables load via **dotenv** from `.env` in the **current working directory** when you start the MCP or CLI.

## Authentication (CLI)

From the repo root (so `.env` is found):

```bash
npm run cli -- login
npm run cli -- whoami
npm run cli -- logout
```

Tokens are stored in `~/.fuul/tokens.json` (Windows: `%USERPROFILE%\.fuul\tokens.json`). After `login`, the MCP process uses the same file.

With a build:

```bash
npm run build
node dist/cli.js login
```

## Usage examples (MCP tools)

Tools are invoked by the MCP client (e.g. Cursor) with a JSON payload. Parameters match [docs/AGENTS.md](docs/AGENTS.md). Below: **illustrative** shapes; replace UUIDs and identifiers with real values from your project.

**Health / session**

```json
{}
```
Tool: `ping` — no API call.

```json
{}
```
Tool: `whoami` — `GET /api/v1/auth/user` (requires login).

**Metadata (cached on server)**

```json
{}
```
Tools: `list_chains`, `list_trigger_types`, `list_payout_schemas`.

**Projects and programs**

```json
{ "page": 1, "query": "acme" }
```
Tool: `list_projects`

```json
{ "project_id": "550e8400-e29b-41d4-a716-446655440000" }
```
Tools: `get_project`, `list_incentives`

**Affiliate analytics (dashboard JWT; same auth as other project routes)**

Single affiliate stats (encoded `user_identifier` string, same as dashboard affiliate management):

```json
{
  "project_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_identifier": "evm:0x0000000000000000000000000000000000000000"
}
```
Tool: `get_affiliate_portal_stats` — optional: `from`, `to`, `this_month`, `conversion_external_id`, `conversion_name`.

Project-wide totals:

```json
{
  "project_id": "550e8400-e29b-41d4-a716-446655440000",
  "dateRange": "30d"
}
```
Tool: `get_project_affiliate_total_stats` — optional filters: `statuses`, `regions`, `audiences`, `tiers`, `dateFrom`/`dateTo` with `dateRange: "custom"`.

Breakdown by dimension (e.g. region):

```json
{
  "project_id": "550e8400-e29b-41d4-a716-446655440000",
  "groupBy": "region",
  "dateRange": "30d"
}
```
Tool: `get_project_affiliates_breakdown` — `groupBy` is required (`audience` | `tier` | `region` | `status`).

**Writes (always `dry_run` first, then `confirmed: true`)**

```json
{
  "project_id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Summer",
  "trigger_ids": ["00000000-0000-4000-8000-000000000001"],
  "payout_terms": [{ "type": "onchain_currency" }],
  "dry_run": true
}
```
Tool: `create_incentive_program` — second call with `"confirmed": true` executes `POST`.

See tool descriptions in the client for payout approve/reject and `update_incentive_program` shapes.

## Run MCP (stdio)

```bash
npm run build
npm start
```

Development without compiling first:

```bash
npm run dev
```

### MCP Inspector

```bash
npm run build
npx @modelcontextprotocol/inspector node dist/index.js
```

Run **`login`** before exercising tools that call the API.

## Cursor (and similar clients)

- **Command:** `node`
- **Arguments:** `dist/index.js` (absolute path to this repo if needed)
- **Working directory:** root of `mcp_server` (so `.env` loads)

Rebuild after pulls: `npm run build`. Re-run **`login`** when changing `FUUL_API_BASE_URL` (staging vs production).

## CI

On every push/PR to `main`/`master`, GitHub Actions runs three jobs in parallel (each appears as its own check on the PR: **lint**, **test**, **build**):

1. `npm ci` + `npm run lint`
2. `npm ci` + `npm run test`
3. `npm ci` + `npm run build`

Publishing `@fuul/mcp-server` to npm is triggered by **GitHub Releases** (see [.github/workflows/publish.yml](.github/workflows/publish.yml); requires `NPM_TOKEN` secret).

## Scripts

| Script | Description |
| ------ | ----------- |
| `npm run build` | Compile TypeScript → `dist/` |
| `npm start` | MCP server (`node dist/index.js`) |
| `npm run cli` | CLI via `tsx` (`src/cli.ts`) |
| `npm run dev` | MCP via `tsx` (`src/index.ts`) |
| `npm run lint` | ESLint on `src/` |
| `npm run test` | Vitest |

## License

MIT — see `package.json`.
