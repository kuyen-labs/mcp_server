# Documentation

| Document | Audience | Purpose |
| -------- | -------- | ------- |
| [AGENTS.md](./AGENTS.md) | Maintainers, support, security review | Tool ↔ HTTP routes, env vars, write conventions |
| [mcp-phase2/CONSUMER.md](./mcp-phase2/CONSUMER.md) | Integrators | Staging/production URLs and API expectations |
| [mcp-phase2/tool-prompts.md](./mcp-phase2/tool-prompts.md) | Evals / QA | Sample natural-language prompts to exercise tools |

End-user install and client setup: [README.md](../README.md) at the repository root.

## Claude Code plugin

This repo doubles as a **Claude Code plugin marketplace**: `.claude-plugin/marketplace.json` at the root lists the `fuul-mcp` plugin under `plugins/fuul-mcp/` (MCP config + `skills/fuul/SKILL.md`). See the root README for `/plugin` install commands.
