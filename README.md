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

## Cursor and Claude Code (step by step)

The MCP server is a **stdio** process: the client spawns `node` with `dist/index.js`. You must **login once in a terminal** before tools that call the API will work; there is no MCP tool for OAuth.

### 1. One-time setup

1. Clone the repo, `cd mcp_server`, `npm ci`.
2. `cp .env.example .env` and set `FUUL_API_BASE_URL` (e.g. staging `https://api.stg.fuul.xyz` or production).
3. From the repo root: `npm run cli -- login` (browser opens), then `npm run cli -- whoami` to verify.
4. `npm run build` so `dist/index.js` exists. After every `git pull` that changes code, run **`npm run build`** again.

### 2. Cursor

1. Open **Cursor Settings → MCP** (wording may vary slightly by version; look for **Model Context Protocol** / **MCP**).
2. Add a new MCP server (or edit your user **`mcp.json`** if you manage config as JSON — see [Cursor MCP docs](https://docs.cursor.com/context/mcp)).
3. Set:
   - **Command:** `node`
   - **Arguments:** absolute path to this repo’s `dist/index.js` (not relative).
   - **Working directory (cwd):** absolute path to the **root of this repo** (so `dotenv` loads `.env`).
4. Enable the server and use **Refresh** if the client shows it disconnected.
5. In **Chat / Agent**, ask for Fuul operations in natural language (e.g. “list my projects with `list_projects`”). If you change `FUUL_API_BASE_URL` or tokens expire, run `npm run cli -- login` again in a terminal.

**Example MCP config fragment** (adjust paths for your machine):

```json
{
  "mcpServers": {
    "fuul": {
      "command": "node",
      "args": ["/absolute/path/to/mcp_server/dist/index.js"],
      "cwd": "/absolute/path/to/mcp_server"
    }
  }
}
```

On Windows, use backslash paths or escaped backslashes in JSON, e.g. `"C:\\Users\\you\\mcp_server\\dist\\index.js"`.

### 3. Claude Desktop

1. Complete **§1** above.
2. Open **Settings → Developer → Edit Config** and edit `claude_desktop_config.json`.
3. Under `mcpServers`, add an entry with the same idea: `command` = `node`, `args` = full path to `dist/index.js`, and set `cwd` to the repo root if your client supports it (some configs use only `command` + `args`; if `cwd` is unsupported, rely on `env` or run from a wrapper script).

Refer to [Anthropic MCP quickstart](https://docs.anthropic.com/en/docs/mcp) for the exact schema your Claude app version expects.

### 4. Claude Code (CLI)

Configure MCP in the way your **Claude Code** version documents (project or user MCP config). Point **stdio** at:

- `node` + absolute path to `dist/index.js`, with **cwd** = repo root when possible.

### 5. After updates or env changes

- Re-run **`npm run build`** after pulling code changes.
- Re-run **`npm run cli -- login`** when switching staging/production or when the API returns **401**.

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
