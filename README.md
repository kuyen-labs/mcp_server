# @fuul/mcp-server

Fuul [Model Context Protocol](https://modelcontextprotocol.io/) server: OAuth login, authenticated API access, and tools for agents (e.g. `whoami`, metadata lists).

Maintainers: [docs/AGENTS.md](docs/AGENTS.md) (tools ↔ API, env, write-tool conventions). Changes: [CHANGELOG.md](CHANGELOG.md).

## Requirements

- **Node.js** 18+
- Access to a running **fuul-server** (e.g. staging or production) with **Agent OAuth** configured (`FUUL_AGENT_OAUTH_*` on the API).

## Install

```bash
git clone <repo-url>
cd mcp_server
npm ci
```

Copy env template and adjust:

```bash
cp .env.example .env
```

Variables are read via **dotenv** from `.env` in the current working directory (see `.env.example`). You can also export the same names in your shell.

## Run locally — CLI

From the repo root (so `.env` is found):

```bash
npm run cli -- login
npm run cli -- whoami
npm run cli -- logout
```

After `login`, tokens are stored under `~/.fuul/tokens.json` (or `%USERPROFILE%\.fuul\tokens.json` on Windows).

To use the published-style binary after a build:

```bash
npm run build
node dist/cli.js login
```

## Run locally — MCP (stdio)

Build and start the MCP process:

```bash
npm run build
npm start
```

This runs `node dist/index.js` and speaks MCP over **stdio** (for Cursor, Claude Code, or the inspector).

**Dev** without a prior build:

```bash
npm run dev
```

## Run locally — MCP Inspector

Useful to call tools from a browser UI:

```bash
npm run build
npx @modelcontextprotocol/inspector node dist/index.js
```

Or with **tsx** (no `dist`):

```bash
npx @modelcontextprotocol/inspector npx tsx src/index.ts
```

Ensure you have run **`login`** first; the MCP process uses the same token file as the CLI.

## Cursor (and similar clients)

Point the MCP server command at the built entry and set **cwd** to this repo so `.env` loads:

- **Command:** `node`
- **Arguments:** `dist/index.js` (full path to this repo’s `dist/index.js` if needed)
- **Working directory:** root of `mcp_server`

Run `npm run build` after pulling changes. Re-run **`login`** when switching `FUUL_API_BASE_URL` (e.g. staging vs production).

## Scripts

| Script        | Description                    |
| ------------- | ------------------------------ |
| `npm run build` | Compile TypeScript → `dist/` |
| `npm start`     | Run MCP server (`dist/index.js`) |
| `npm run cli`   | Run CLI via `tsx` (`src/cli.ts`) |
| `npm run dev`   | Run MCP via `tsx` (`src/index.ts`) |
| `npm run lint`  | ESLint on `src/`               |
| `npm run test`  | Vitest (unit / contract-style) |

## License

MIT — see `package.json`.
