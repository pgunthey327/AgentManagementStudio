# AI Agent Management Studio

A professional VS Code extension for managing, installing, and creating AI agent markdown files across your development workspace.

## Features

- **Interactive Group Selection** — choose from Development, Quality Engineering, Migration, Governance, or All Agents in a single QuickPick dialog
- **Multi-select Agent Installer** — cherry-pick individual agents before installing; existing files are never overwritten
- **Visual Custom Agent Builder** — a VS Code-themed webview form that generates production-ready agent markdown files
- **Persistent Custom Specs** — roles, responsibilities, skills, tools, and instructions you add are saved to your workspace and merged with defaults on every launch
- **JSON-driven Configuration** — all spec data lives in plain JSON files — easy to extend or version-control
- **Smart File Handling** — idempotent installs skip files that already exist and report a clear summary

## Agent Groups

| Group | Agents |
|---|---|
| Development | devSubAgent, leadSubAgent, prSubAgent, requirementAnalysis, reviewSubAgent |
| Quality Engineering | testSubAgent, performanceAgent |
| Migration | ruleMigrationAgent |
| Governance | governanceAgent |

## Installation

### From VSIX

1. Open VS Code
2. Open the Extensions view (`Ctrl+Shift+X`)
3. Click the `…` menu → **Install from VSIX…**
4. Select `ai-agent-management-studio-1.0.0.vsix`

### From Source

```bash
git clone <repo-url>
cd AgentManagementStudio
npm install
npm run compile
# Press F5 to launch Extension Development Host
```

## Usage

1. Open a workspace folder
2. Open the Command Palette (`Ctrl+Shift+P`)
3. Run **AI Agents: Install Agent Suite**
4. Select one or more agent groups
5. Select individual agents from the list
6. Agents are installed to `.github/agents/` in your workspace

To build a custom agent, select **Create Custom Agent** from the group picker and fill in the webview form.

## Custom Agent Builder

The webview form has three sections:

- **Basic Information** — agent name, description, and model selection
- **Agent Configuration** — multi-select dropdowns for roles, responsibilities, skills, tools, and instructions with inline "Add New" modals
- **Additional Details** — free-text area for extra context or constraints

Generated agents are saved to `.github/agents/<agent-name>.agent.md`. Any new specs you define are persisted to `.github/agent-specs/` for reuse in future sessions.

## Requirements

- VS Code 1.85.0 or later
- Node.js 20.x (for development)

## Extension Settings

This extension contributes no workspace settings. All configuration is file-based.

## License

MIT
