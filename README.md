# @fuul/mcp-server

Fuul [Model Context Protocol](https://modelcontextprotocol.io/) server for managing affiliate programs, analytics, incentives, and payouts through MCP-compatible clients (Claude Code, Cursor, Claude Desktop).

[![npm version](https://img.shields.io/npm/v/@fuul/mcp-server.svg)](https://www.npmjs.com/package/@fuul/mcp-server)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)

---

## Table of Contents

- [Quick Start](#quick-start)
- [Installation Methods](#installation-methods)
  - [Claude Code Plugin (Recommended)](#1-claude-code-plugin-recommended)
  - [Cursor IDE](#2-cursor-ide)
  - [npx (Any MCP Client)](#3-npx-any-mcp-client)
  - [Local Development (Clone)](#4-local-development-clone)
- [Authentication](#authentication)
- [Configuration](#configuration)
- [MCP Tool Reference](#mcp-tool-reference)
- [Troubleshooting](#troubleshooting)
- [Repository Layout](#repository-layout)
- [Scripts Reference](#scripts-reference)
- [Documentation](#documentation)
- [CI and Releases](#ci-and-releases)
- [License](#license)

---

## Quick Start

```bash
# 1. Install (choose one method below)
# 2. Authenticate once:
npx -y --package=@fuul/mcp-server@latest fuul-mcp login

# 3. Verify:
npx -y --package=@fuul/mcp-server@latest fuul-mcp whoami
```

---

## Installation Methods

### 1. Claude Code Plugin (Recommended)

The easiest way to use Fuul MCP with Claude Code. Adds the MCP server plus a **skill** that documents how to use Fuul tools.

#### Step 1: Install the plugin

```text
/plugin marketplace add kuyen-labs/mcp_server
/plugin install fuul-mcp@fuul-mcp
```

#### Step 2: Verify the `.mcp.json` format

Check the plugin's `.mcp.json` at:

```
~/.claude/plugins/cache/fuul-mcp/fuul-mcp/<version>/.mcp.json
```

It must use the `--package=` format in `args`:

```json
{
  "mcpServers": {
    "fuul": {
      "command": "npx",
      "args": ["-y", "--package=@fuul/mcp-server@latest", "fuul-mcp-server"],
      "env": {
        "FUUL_API_BASE_URL": "${user_config.FUUL_API_BASE_URL}"
      }
    }
  }
}
```

If `args` shows `["-y", "@fuul/mcp-server@latest", "fuul-mcp-server"]` (without `--package=`), update it to match the format above.

#### Step 3: Reload the plugin

```text
/reload-plugins
```

#### Step 4: Authenticate (one-time)

Open a terminal and run:

```bash
npx -y --package=@fuul/mcp-server@latest fuul-mcp login
```

This opens your browser for OAuth. Tokens are saved to `~/.fuul/tokens.json`.

#### Step 5: Verify

```bash
npx -y --package=@fuul/mcp-server@latest fuul-mcp whoami
```

#### Optional: Use staging environment

Set `FUUL_API_BASE_URL` in the plugin's user settings:

| Environment | URL |
|-------------|-----|
| Production (default) | `https://api.fuul.xyz` |
| Staging | `https://api.stg.fuul.xyz` |

---

### 2. Cursor IDE

#### Option A: Using npx (no clone required)

1. **Authenticate first:**

   ```bash
   npx -y --package=@fuul/mcp-server@latest fuul-mcp login
   npx -y --package=@fuul/mcp-server@latest fuul-mcp whoami
   ```

2. **Configure MCP in Cursor:**

   Go to **Settings → MCP** or edit your `mcp.json`:

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

#### Option B: Using local clone

1. **Clone and build:**

   ```bash
   git clone https://github.com/kuyen-labs/mcp_server.git
   cd mcp_server
   npm ci
   npm run build
   ```

2. **Authenticate:**

   ```bash
   npm run cli -- login
   npm run cli -- whoami
   ```

3. **Configure MCP in Cursor:**

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

   On macOS/Linux:

   ```json
   {
     "mcpServers": {
       "fuul": {
         "command": "node",
         "args": ["/path/to/mcp_server/dist/index.js"],
         "cwd": "/path/to/mcp_server"
       }
     }
   }
   ```

---

### 3. npx (Any MCP Client)

Use the published npm package without cloning:

| Command | Purpose |
|---------|---------|
| `npx -y --package=@fuul/mcp-server@latest fuul-mcp login` | Browser OAuth; writes `~/.fuul/tokens.json` |
| `npx -y --package=@fuul/mcp-server@latest fuul-mcp whoami` | Verify session (`GET /api/v1/auth/user`) |
| `npx -y --package=@fuul/mcp-server@latest fuul-mcp logout` | Clear tokens |
| `npx -y --package=@fuul/mcp-server@latest fuul-mcp-server` | Start stdio MCP server |

For MCP client configs (JSON), use the `--package=` format:

```json
{
  "command": "npx",
  "args": ["-y", "--package=@fuul/mcp-server@latest", "fuul-mcp-server"]
}
```

---

### 4. Local Development (Clone)

```bash
git clone https://github.com/kuyen-labs/mcp_server.git
cd mcp_server
npm ci
cp .env.example .env   # Optional: edit for staging/custom settings
npm run build
```

#### Run CLI commands:

```bash
npm run cli -- login
npm run cli -- whoami
npm run cli -- logout
```

#### Run MCP server:

```bash
npm start              # Production (uses dist/)
npm run dev            # Development (uses tsx, watches src/)
```

#### Debug with MCP Inspector:

```bash
npm run build
npx @modelcontextprotocol/inspector node dist/index.js
```

---

## Authentication

Authentication uses OAuth with the Fuul dashboard. Tokens are stored locally and shared by the CLI and MCP server.

### Token location

| OS | Path |
|----|------|
| macOS/Linux | `~/.fuul/tokens.json` |
| Windows | `%USERPROFILE%\.fuul\tokens.json` |

### Login flow

```bash
npx -y --package=@fuul/mcp-server@latest fuul-mcp login
```

This opens your default browser to the Fuul OAuth page. After authorizing, tokens are saved automatically.

### Verify session

```bash
npx -y --package=@fuul/mcp-server@latest fuul-mcp whoami
```

### Clear tokens

```bash
npx -y --package=@fuul/mcp-server@latest fuul-mcp logout
```

---

## Configuration

Environment variables are read from `process.env` and, when present, a `.env` file in the current working directory.

| Variable | Default | Description |
|----------|---------|-------------|
| `FUUL_API_BASE_URL` | `https://api.fuul.xyz` | API origin (no trailing slash). Use `https://api.stg.fuul.xyz` for staging. |
| `FUUL_OAUTH_CLIENT_ID` | `fuul-agent` | OAuth client ID |
| `FUUL_OAUTH_REDIRECT_URI` | `http://127.0.0.1:8765/callback` | OAuth callback URL |
| `FUUL_MCP_TOOL_TIMEOUT_MS` | `90000` | Per-tool timeout in milliseconds |
| `FUUL_MCP_DEBUG` | `false` | Set to `1` or `true` for debug logging |

### Example `.env` file

```bash
FUUL_API_BASE_URL=https://api.stg.fuul.xyz
FUUL_MCP_DEBUG=1
```

> **Note:** The `.env` file is for local development only and is not included in the npm package. Tokens are stored in `~/.fuul/tokens.json`, not in `.env`.

---

## MCP Tool Reference

### Tool Categories

| Category | Tools |
|----------|-------|
| **Health** | `ping`, `whoami` |
| **Metadata** (cached) | `list_chains`, `list_trigger_types`, `list_payout_schemas` |
| **Projects** | `list_projects`, `get_project` |
| **Incentives** | `list_incentives`, `get_incentive`, `get_trigger` |
| **Affiliate Analytics** | `get_affiliate_portal_stats`, `get_project_affiliate_total_stats`, `get_project_affiliates_breakdown` |
| **Payouts (Read)** | `list_payouts_pending_approval`, `list_rewards_payouts` |
| **Payouts (Write)** | `approve_payouts`, `reject_payouts` |
| **Tiers** | `update_project_tier` |
| **Audiences** | `update_audience` |
| **Triggers** | `update_trigger` |
| **Payout Terms** | `update_payout_term` |

### Tool Examples

All tools receive JSON arguments. Use real UUIDs from your tenant.

#### Health checks

```json
// ping (no auth required)
{}

// whoami (requires login)
{}
```

#### Metadata queries

```json
// list_chains, list_trigger_types, list_payout_schemas
{}
```

#### Project operations

```json
// list_projects
{ "page": 1, "query": "acme" }

// get_project
{ "project_id": "550e8400-e29b-41d4-a716-446655440000" }
```

#### Incentives

```json
// list_incentives
{ "project_id": "<uuid>" }

// get_incentive
{ "project_id": "<uuid>", "conversion_id": "<uuid>" }

// get_trigger
{ "project_id": "<uuid>", "trigger_id": "<uuid>" }
```

#### Affiliate analytics

```json
// get_affiliate_portal_stats (single affiliate)
{
  "project_id": "<uuid>",
  "user_identifier": "evm:0x1234..."
}

// get_project_affiliate_total_stats (project totals)
{
  "project_id": "<uuid>",
  "dateRange": "30d"
}

// get_project_affiliates_breakdown (grouped breakdown)
{
  "project_id": "<uuid>",
  "groupBy": "region",
  "dateRange": "30d"
}
```

`groupBy` options: `audience`, `tier`, `region`, `status`

`dateRange` options: `7d`, `30d`, `90d`, `MTD`, `QTD`, `custom`, `all`

#### Payout operations

```json
// list_payouts_pending_approval
{ "project_id": "<uuid>", "page": 1, "page_size": 50 }

// list_rewards_payouts
{ "project_id": "<uuid>", "page": 1 }
```

### Write Operations (Two-Step Flow)

All mutation tools require a **two-step process**:

1. **Preview:** Call with `dry_run: true` — validates and returns a preview without making changes
2. **Confirm:** Call with `confirmed: true` — executes the mutation

#### Example: Approve payouts

```json
// Step 1: Preview
{
  "project_id": "<uuid>",
  "payout_ids": ["<uuid1>", "<uuid2>"],
  "dry_run": true
}

// Step 2: Confirm (after user approval)
{
  "project_id": "<uuid>",
  "payout_ids": ["<uuid1>", "<uuid2>"],
  "confirmed": true
}
```

Write tools: `approve_payouts`, `reject_payouts`, `update_project_tier`, `update_audience`, `update_trigger`, `update_payout_term`

---

## Troubleshooting

### MCP server fails to start

**Symptom:** Error like `Cannot find package '@fuul/mcp-server'` or binary not found.

**Solution:** Ensure you use the `--package=` format in args:

```json
{
  "args": ["-y", "--package=@fuul/mcp-server@latest", "fuul-mcp-server"]
}
```

**Wrong:**
```json
{
  "args": ["-y", "@fuul/mcp-server@latest", "fuul-mcp-server"]
}
```

### 401 Unauthorized errors

**Symptom:** API tools return 401 or `whoami` fails.

**Solution:**

1. Run login again:
   ```bash
   npx -y --package=@fuul/mcp-server@latest fuul-mcp login
   ```

2. Verify tokens exist:
   - macOS/Linux: `~/.fuul/tokens.json`
   - Windows: `%USERPROFILE%\.fuul\tokens.json`

3. Verify session:
   ```bash
   npx -y --package=@fuul/mcp-server@latest fuul-mcp whoami
   ```

### Rate limiting (HTTP 429)

**Symptom:** Tools return 429 errors.

**Solution:** Wait for the `Retry-After` header duration, then retry. The MCP server handles this automatically in most cases.

### Environment not loading

**Symptom:** Staging URL not being used despite `.env` file.

**Solution:**

1. Ensure `cwd` in your MCP config points to the directory containing `.env`
2. Or pass environment directly in the config:
   ```json
   {
     "env": {
       "FUUL_API_BASE_URL": "https://api.stg.fuul.xyz"
     }
   }
   ```

### Windows path issues

**Symptom:** Paths not resolving correctly on Windows.

**Solution:** Use double backslashes or forward slashes:

```json
{
  "args": ["C:\\Users\\me\\mcp_server\\dist\\index.js"]
}
```

Or:

```json
{
  "args": ["C:/Users/me/mcp_server/dist/index.js"]
}
```

---

## Repository Layout

```
mcp_server/
├── .claude-plugin/           # Claude Code marketplace manifest
│   └── marketplace.json
├── .github/
│   ├── workflows/            # CI and release workflows
│   │   ├── ci.yml
│   │   └── release.yml
│   └── pull_request_template.md
├── docs/                     # Documentation
│   ├── README.md             # Docs index
│   ├── AGENTS.md             # Tool ↔ HTTP mapping
│   └── mcp-phase2/
│       ├── CONSUMER.md       # API expectations
│       └── tool-prompts.md   # Sample prompts for evals
├── plugins/
│   └── fuul-mcp/             # Claude Code plugin
│       ├── .claude-plugin/
│       │   └── plugin.json
│       ├── .mcp.json         # MCP server config
│       └── skills/
│           └── fuul/
│               └── SKILL.md  # Tool usage instructions
├── src/                      # TypeScript source
│   ├── affiliate-portal/     # Affiliate analytics
│   ├── agent/                # Write confirmation logic
│   ├── auth/                 # OAuth and tokens
│   ├── config/               # Environment config
│   ├── http/                 # HTTP client
│   ├── metadata/             # Chains, triggers, schemas
│   ├── payouts/              # Payout operations
│   ├── tools/                # MCP tool definitions
│   ├── triggers/             # Trigger operations
│   ├── util/                 # Utilities
│   ├── cli.ts                # CLI entry point
│   └── index.ts              # MCP server entry point
├── dist/                     # Compiled output (gitignored)
├── .env.example              # Environment template
├── CHANGELOG.md              # Release notes
├── package.json
├── release.config.cjs        # semantic-release config
├── tsconfig.json
└── vitest.config.ts
```

---

## Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run build` | Compile TypeScript → `dist/` |
| `npm start` | Run MCP server (`node dist/index.js`) |
| `npm run dev` | Run MCP server with hot reload (`tsx src/index.ts`) |
| `npm run cli` | Run OAuth CLI (`tsx src/cli.ts`) |
| `npm run lint` | ESLint on `src/` |
| `npm run lint:fix` | Auto-fix lint issues |
| `npm run test` | Run tests with Vitest |
| `npm run test:ci` | Run tests in CI mode |
| `npm run format` | Format code with Prettier |

---

## Documentation

| Resource | Description |
|----------|-------------|
| [docs/README.md](docs/README.md) | Documentation index |
| [docs/AGENTS.md](docs/AGENTS.md) | Tool ↔ HTTP endpoint mapping |
| [docs/mcp-phase2/CONSUMER.md](docs/mcp-phase2/CONSUMER.md) | Staging/production URLs, API expectations |
| [docs/mcp-phase2/tool-prompts.md](docs/mcp-phase2/tool-prompts.md) | Sample prompts for testing and evals |
| [CHANGELOG.md](CHANGELOG.md) | Release notes |

---

## CI and Releases

### Continuous Integration

On each push/PR to `main`, `master`, `beta`, or `alpha`, GitHub Actions runs:
- **lint** — ESLint checks
- **test** — Vitest test suite
- **build** — TypeScript compilation

### Publishing

Releases are automated via **semantic-release** and **npm Trusted Publishing (OIDC)**:

1. Use [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `BREAKING CHANGE:`
2. Merge to `main` (or `beta`/`alpha` for pre-releases)
3. GitHub Actions runs `semantic-release`, which:
   - Determines the next version from commits
   - Updates `package.json` and `CHANGELOG.md`
   - Publishes to npm
   - Creates a GitHub release

No manual `npm publish` or GitHub Release creation needed.

---

## Requirements

- **Node.js** 18 or higher
- A running **fuul-server** (staging or production) with **Agent OAuth** configured

---

## License

MIT — see [package.json](package.json)
