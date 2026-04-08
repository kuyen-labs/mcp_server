# Changelog

## [Unreleased]

### Added

- Maintainer reference: `docs/AGENTS.md` (replaces scattered `docs/mcp-phase2/*`).
- `write-confirmation` helper, `retry-after` / 429 handling, `tool-descriptions`, Vitest + CI workflow.

### Changed

- Non-401 API errors surface server message; metadata / `whoami` include rate-limit guidance when applicable.
