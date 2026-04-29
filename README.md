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

**MCP config and `npx`:** The plugin’s `.mcp.json` must spawn the server with `--package=@fuul/mcp-server@latest` so `npx` knows which package to install and run; passing `@fuul/mcp-server@latest` as a bare positional is unreliable when the client splits `args` (Claude Code ends up treating the binary name incorrectly). Correct `args` shape:

```json
"args": ["-y", "--package=@fuul/mcp-server@latest", "fuul-mcp-server"]
```

If you installed an older cached plugin and MCP fails to start, edit the cached `.mcp.json` under `~/.claude/plugins/cache/.../fuul-mcp/.../.mcp.json` to match the line above, or reinstall after a plugin release that ships this fix.

Requires **`@fuul/mcp-server@0.2.0`** or newer on npm (for the `fuul-mcp-server` binary).

### 2. npm / npx (any MCP client)

Use the published package without cloning:

| Command | Role |
| ------- | ---- |
| `npx -y @fuul/mcp-server@latest fuul-mcp-server` | Stdio MCP server (shell one-liner) |
| `npx -y --package=@fuul/mcp-server@latest fuul-mcp-server` | Same; use this split as `args` in MCP JSON (Cursor, Claude, etc.) |
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

Or with npx (use `--package=` so MCP clients that pass argv arrays resolve the package and binary correctly):

```json
{
  "mcpServers": {
    "fuul": {
      "command": "npx",
      "args": ["-y", "--package=@fuul/mcp-server@latest", "fuul-mcp-server"],
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

Configure stdio per your Claude Code version: `node` + path to `dist/index.js`, or `npx` with `args` including `--package=@fuul/mcp-server@latest` and `fuul-mcp-server` (same as the Cursor example above).

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
├── .github/workflows/        # ci.yml, release.yml (semantic-release; name must match npm Trusted Publishing)
├── release.config.cjs        # semantic-release plugins and branches
└── dist/                     # `npm run build` (gitignored)
```

## Requirements

- **Node.js** 18+
- A running **fuul-server** (staging or production) with **Agent OAuth** configured

## CI and releases

On each push/PR to `main` / `master`, GitHub Actions runs **lint**, **test**, and **build** in parallel (see [.github/workflows/ci.yml](.github/workflows/ci.yml)). Pushes to `beta` / `alpha` also run CI on those branches.

## Publishing

**npm** releases are performed by **semantic-release** in GitHub Actions (same approach as [fuul-sdk](https://github.com/kuyen-labs/fuul-sdk)). You do not need to create a GitHub Release manually or run `npm publish` locally for the default flow.

1. **npm — [Trusted publishing](https://docs.npmjs.com/trusted-publishers) (OIDC):** [.github/workflows/release.yml](.github/workflows/release.yml) uses the same **steps and permissions** as [fuul-sdk](https://github.com/kuyen-labs/fuul-sdk)’s release job (`id-token: write`, no `NPM_TOKEN` in the workflow). The **filename** is **`release.yml`** here so it matches what you enter in npm’s trusted-publisher form (fuul-sdk uses **`versioning.yml`** instead — that name is only for that repo). On npmjs.com, **`@fuul/mcp-server`** must list workflow **`.github/workflows/release.yml`** for **`kuyen-labs` / `mcp_server`**. If npm still shows **`OIDC … 404`**, the path/org/repo in npm does not match this file.  
   **About `NPM_TOKEN` in caps:** npm docs use that name for **classic token** auth. With **Trusted Publishing** you do **not** put a token value into npm for OIDC; GitHub provides the identity. You also do **not** need a GitHub secret named `NPM_TOKEN` for this flow. (If the npm UI showed `NPM_TOKEN`, it is usually help text for the non-OIDC case.)
2. **Branches**: on **push** to `main`, `beta`, or `alpha`, that workflow runs `npm ci`, **build**, **`npm run test:ci`**, then `npx semantic-release` on push only.
3. **Config**: [release.config.cjs](release.config.cjs) matches fuul-sdk’s plugin list and order; `@semantic-release/exec` uses the same **`verifyReleaseCmd`** writing `src/release.json` (placeholder [src/release.json](src/release.json)); `@semantic-release/git` commits **`package.json`** only.
4. **Commits**: use [Conventional Commits](https://www.conventionalcommits.org/) on releasable branches (e.g. `feat:`, `fix:`, `BREAKING CHANGE:`) so the next version is computed; if nothing warrants a release, the job exits without publishing (expected).

Local dry run of the same CLI: `npm run semantic-release` (needs a clean git state, tags, and env vars; in practice CI after merge is enough).

## Scripts

| Script | Description |
| ------ | ----------- |
| `npm run build` | Compile TypeScript → `dist/` |
| `npm start` | Run MCP server (`node dist/index.js`) |
| `npm run cli` | OAuth CLI via `tsx` (`src/cli.ts`) |
| `npm run dev` | MCP via `tsx` (`src/index.ts`) |
| `npm run lint` | ESLint on `src/` |
| `npm run test` | Vitest |
| `npm run test:ci` | Vitest (same as `test`; used by `release.yml` like fuul-sdk’s `test:ci` in `versioning.yml`) |
| `npm run semantic-release` | Run semantic-release locally (CI runs `npx semantic-release` on eligible pushes) |

## License

MIT — see `package.json`.
