# @fuul/mcp-server

Fuul [Model Context Protocol](https://modelcontextprotocol.io/) server: OAuth CLI (`fuul-mcp`), stdio MCP entry (`fuul-mcp-server`), metadata tools, project and affiliate analytics, incentive and payout operations (reads plus `dry_run` / `confirmed` writes), and rate-limit-aware errors.

## Documentation

| Resource | Purpose |
| -------- | ------- |
| [docs/README.md](docs/README.md) | Index of all docs in this repo |
| [docs/AGENTS.md](docs/AGENTS.md) | Tool ↔ HTTP map (audit, support, PR review) |
| [docs/mcp-phase2/CONSUMER.md](docs/mcp-phase2/CONSUMER.md) | Staging/production URLs, API expectations |
| [docs/mcp-phase2/tool-prompts.md](docs/mcp-phase2/tool-prompts.md) | Sample prompts for tooling and evals |
| [CHANGELOG.md](CHANGELOG.md) | Release notes |

## Install (pick one path)

### 1. Claude Code plugin (marketplace)

Adds the MCP server plus a **skill** that documents how to use Fuul tools.

In **Claude Code**:

```text
/plugin marketplace add kuyen-labs/mcp_server
/plugin install fuul-mcp@fuul-mcp
```

One-time OAuth in a terminal (same tokens the MCP uses):

```bash
npx -y @fuul/mcp-server@latest fuul-mcp login
npx -y @fuul/mcp-server@latest fuul-mcp whoami
```

Optional: set **staging** in the plugin’s user settings — `FUUL_API_BASE_URL` = `https://api.stg.fuul.xyz`. Default is production `https://api.fuul.xyz`.

Requires **`@fuul/mcp-server@0.2.0`** or newer on npm (for the `fuul-mcp-server` binary). After the first release with this version, `npx @latest` resolves correctly.

### 2. npm / npx (any MCP client)

Use the published package without cloning:

| Command | Role |
| ------- | ---- |
| `npx -y @fuul/mcp-server@latest fuul-mcp-server` | Stdio MCP server (what clients spawn) |
| `npx -y @fuul/mcp-server@latest fuul-mcp login` | Browser OAuth; writes `~/.fuul/tokens.json` |
| `npx -y @fuul/mcp-server@latest fuul-mcp whoami` | `GET /api/v1/auth/user` |

Point your client at `fuul-mcp-server` with `cwd` optional; config can be passed via `env` (see **Configuration**).

### 3. Clone (development)

```bash
git clone https://github.com/kuyen-labs/mcp_server.git
cd mcp_server
npm ci
cp .env.example .env   # optional; defaults match production Agent OAuth
npm run build
```

Run the CLI from the repo:

```bash
npm run cli -- login
npm run cli -- whoami
```

Run the MCP server:

```bash
npm start
# or: npm run dev
```

## Configuration

Environment variables are read from `process.env` and, when present, a **`.env` file in the current working directory** (`dotenv`). See [.env.example](.env.example).

| Variable | Purpose |
| -------- | ------- |
| `FUUL_API_BASE_URL` | API origin only, no trailing slash. Production: `https://api.fuul.xyz`. Staging: `https://api.stg.fuul.xyz`. |
| `FUUL_OAUTH_CLIENT_ID` | OAuth client id (default `fuul-agent`). |
| `FUUL_OAUTH_REDIRECT_URI` | Loopback callback (default `http://127.0.0.1:8765/callback`). |
| `FUUL_MCP_TOOL_TIMEOUT_MS` | Per-tool timeout in ms (default `90000`). |
| `FUUL_MCP_DEBUG` | Set to `1` or `true` for debug logging. |

**Note:** Values in `.env` are local dev convenience; they are **not** published in the npm package (`package.json` only ships `dist/`). OAuth **tokens** live in `~/.fuul/tokens.json`, not in `.env`.

## MCP tool examples

Clients send JSON arguments; shapes match [docs/AGENTS.md](docs/AGENTS.md). Illustrative only — use real UUIDs from your tenant.

**Session**

- `ping` → `{}` (no API call)
- `whoami` → `{}` (requires login)

**Metadata**

- `list_chains`, `list_trigger_types`, `list_payout_schemas` → `{}`

**Projects**

- `list_projects` → `{ "page": 1, "query": "acme" }`
- `get_project` → `{ "project_id": "<uuid>" }`
- `list_incentives` / `get_incentive` / `get_trigger` → see tool descriptions in the client

**Affiliate analytics**

- `get_affiliate_portal_stats` → `project_id`, `user_identifier` (e.g. `evm:0x...`)
- `get_project_affiliate_total_stats` → `project_id`, optional `dateRange`, filters
- `get_project_affiliates_breakdown` → `project_id`, **`groupBy`** (`audience` \| `tier` \| `region` \| `status`)

**Writes (two steps: `dry_run: true` then `confirmed: true`)**

- `create_incentive_program`, `update_incentive_program`, `approve_payouts`, `reject_payouts`

## Run and debug

```bash
npm run build && npm start
```

MCP Inspector:

```bash
npm run build
npx @modelcontextprotocol/inspector node dist/index.js
```

## Client setup

### Cursor

1. Complete **Clone** or use **npx** so `dist/index.js` or `fuul-mcp-server` exists; run **`fuul-mcp login`** once.
2. **Settings → MCP** (or user `mcp.json`): spawn stdio with `command` + `args`, and set **`cwd`** to a folder that contains `.env` if you use one.

Example:

```json
{
  "mcpServers": {
    "fuul": {
      "command": "node",
      "args": ["C:\\path\\to\\mcp_server\\dist\\index.js"],
      "cwd": "C:\\path\\to\\mcp_server"
    }
  }
}
```

Or with npx:

```json
{
  "mcpServers": {
    "fuul": {
      "command": "npx",
      "args": ["-y", "@fuul/mcp-server@latest", "fuul-mcp-server"],
      "env": {
        "FUUL_API_BASE_URL": "https://api.fuul.xyz"
      }
    }
  }
}
```

### Claude Desktop

Use the same `mcpServers` idea in the app’s developer config. See [Anthropic MCP docs](https://docs.anthropic.com/en/docs/mcp).

### Claude Code (manual MCP, without the plugin)

Configure stdio per your Claude Code version: `node` + path to `dist/index.js`, or `npx` + `fuul-mcp-server` as above.

## Repository layout

```text
mcp_server/
├── .claude-plugin/           # Claude Code marketplace manifest
│   └── marketplace.json
├── plugins/
│   └── fuul-mcp/             # Plugin: MCP config + skill
│       ├── .claude-plugin/
│       │   └── plugin.json
│       ├── .mcp.json
│       └── skills/fuul/SKILL.md
├── src/                      # TypeScript source
├── docs/                     # Maintainer and integrator docs
├── .github/workflows/        # ci.yml, publish.yml
└── dist/                     # `npm run build` (gitignored)
```

## Requirements

- **Node.js** 18+
- A running **fuul-server** (staging or production) with **Agent OAuth** configured

## CI and releases

On each push/PR to `main` / `master`, GitHub Actions runs **lint**, **test**, and **build** in parallel.

Publishing to npm is triggered by publishing a **GitHub Release** (see [.github/workflows/publish.yml](.github/workflows/publish.yml)); the repository needs an `NPM_TOKEN` secret.

## Scripts

| Script | Description |
| ------ | ----------- |
| `npm run build` | Compile TypeScript → `dist/` |
| `npm start` | Run MCP server (`node dist/index.js`) |
| `npm run cli` | OAuth CLI via `tsx` (`src/cli.ts`) |
| `npm run dev` | MCP via `tsx` (`src/index.ts`) |
| `npm run lint` | ESLint on `src/` |
| `npm run test` | Vitest |

## License

MIT — see `package.json`.
