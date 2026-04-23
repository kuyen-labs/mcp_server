# Changelog

All notable changes to `@fuul/mcp-server` are documented here. Versions follow the package version in `package.json`.

## 0.2.0

### Added

- **`fuul-mcp-server` npm binary** — same entry as `node dist/index.js`; enables `npx @fuul/mcp-server fuul-mcp-server` without a local clone.
- **Claude Code plugin layout** — `.claude-plugin/marketplace.json`, `plugins/fuul-mcp/` with MCP config and `skills/fuul/SKILL.md`.
- **Empty-string env handling** — `FUUL_API_BASE_URL` and related vars treat `""` as unset so Claude Code `userConfig` defaults apply.

### Documentation

- Root [README.md](README.md) reorganized (install paths, docs index).
- [docs/README.md](./README.md) added as a documentation index.
