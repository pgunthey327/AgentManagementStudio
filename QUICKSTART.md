# Quickstart — Developer Setup

Get the extension running from source in under five minutes.

## Prerequisites

- Node.js 20.x
- npm 10.x or later
- VS Code 1.85.0 or later
- `@vscode/vsce` (for packaging)

## 1. Clone and Install

```bash
git clone <repo-url>
cd AgentManagementStudio
npm install
```

## 2. Compile

```bash
npm run compile
```

TypeScript output lands in `out/extension.js`.

## 3. Run in Extension Development Host

1. Open the `AgentManagementStudio` folder in VS Code
2. Press `F5` — VS Code opens a new **Extension Development Host** window
3. In that window, press `Ctrl+Shift+P` → **AI Agents: Install Agent Suite**

## 4. Watch Mode (optional)

For active development, run:

```bash
npm run watch
```

Changes recompile automatically. Reload the Extension Development Host window with `Ctrl+R`.

## 5. Package as VSIX

```bash
npm install -g @vscode/vsce   # one-time global install
vsce package
```

This produces `ai-agent-management-studio-1.0.0.vsix` in the project root.

## 6. Install the VSIX

```bash
code --install-extension ai-agent-management-studio-1.0.0.vsix
```

Or via the Extensions view: `…` menu → **Install from VSIX…**.

## Project Scripts

| Script | Purpose |
|---|---|
| `npm run compile` | One-shot TypeScript compile |
| `npm run watch` | Incremental watch compile |
| `npm run lint` | ESLint check on `src/` |

## Adding a New Agent

1. Create a `.agent.md` file in `resources/agents/<group>/`
2. The agent appears automatically in the installer — no code changes needed

## Adding New JSON Specs

Edit any of the files in `resources/`:

- `roles.json`
- `responsibilities.json`
- `skills.json`
- `tools.json`
- `instructions.json`

Each item requires: `id`, `name`, `version`, `description`. Tools also require `category`.
