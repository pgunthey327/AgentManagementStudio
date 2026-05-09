# Changelog

All notable changes to AI Agent Management Studio are documented here.

## [1.0.0] — 2026-05-09

### Added

- **Interactive agent selection** — QuickPick dialog with 6 group options (Development, Quality Engineering, Migration, Governance, All Agents, Create Custom Agent)
- **Multi-select agent installer** — cherry-pick individual agents before copying to `.github/agents/`
- **Smart installation** — existing files are skipped automatically; install summary reports copied vs skipped counts
- **Group selection** — install an entire agent group with a single selection
- **Custom Agent Builder** — VS Code-themed webview with three-section form, multi-select dropdowns, and Add New modals
- **JSON data configuration** — `roles.json`, `responsibilities.json`, `skills.json`, `tools.json`, `instructions.json` drive all dropdown content
- **Persistent custom specs** — user-defined specs saved to `.github/agent-specs/` and merged with defaults on load
- **Markdown generation** — generates fully structured `.agent.md` files with frontmatter, roles, responsibilities, skills, tools, and instructions sections
- **CSP-protected webview** — nonce-based Content Security Policy on all webview scripts
- **Governance agent** — new `governanceAgent` for compliance, auditing, and policy enforcement
- **Rule migration agent** — new `ruleMigrationAgent` for cross-technology rule and schema migrations
