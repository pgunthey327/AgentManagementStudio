# Architecture

## Project Structure

```
AgentManagementStudio/
├── src/
│   └── extension.ts          # All extension logic (single-file architecture)
├── resources/
│   ├── agents/
│   │   ├── dev/              # Development agent markdown files
│   │   ├── qe/               # Quality Engineering agent markdown files
│   │   ├── migration/        # Migration agent markdown files
│   │   └── governance/       # Governance agent markdown files
│   ├── roles.json
│   ├── responsibilities.json
│   ├── skills.json
│   ├── tools.json
│   └── instructions.json
├── media/                    # Static assets (icons, images)
├── out/                      # Compiled JavaScript (git-ignored)
├── package.json
├── tsconfig.json
└── .vscodeignore
```

## Key Design Decisions

### Single-file Extension

All logic lives in `src/extension.ts`. This mirrors the reference DevelopAndTestAgent architecture and avoids unnecessary indirection for a focused-scope extension.

### `context.extensionPath` for Resource Access

Agent markdown files and JSON specs are loaded at runtime using `context.extensionPath` — the absolute path to the installed extension directory. This ensures resources are always found regardless of the user's workspace location.

```typescript
const agentsDir = path.join(context.extensionPath, 'resources', 'agents', groupKey);
```

### Resource Bundling

The `.vscodeignore` file explicitly **does not** exclude `resources/`. This means all JSON and markdown files inside `resources/` are packaged into the `.vsix` and available at `context.extensionPath` after installation.

```
# .vscodeignore — resources/ is intentionally absent from this list
.vscode/**
src/**
node_modules/**
out/**/*.map
```

### User Spec Persistence

Custom specs added via the webview are saved to `.github/agent-specs/<type>.json` in the user's workspace. On next load, `loadCustomAgentData` merges these user specs with the extension defaults using `mergeSpecs`, keyed by `id`. This means:

- Default specs can never be lost (they live in the extension bundle)
- User additions survive workspace reopens
- ID collisions update the existing spec rather than duplicating it

### Webview Security

The webview uses a strict Content Security Policy:

```html
<meta http-equiv="Content-Security-Policy"
  content="default-src 'none';
           style-src ${cspSource} 'unsafe-inline';
           script-src 'nonce-${nonce}';">
```

A fresh nonce is generated per webview panel open via `getNonce()`. Inline styles are permitted for VS Code theme variable compatibility.

### Agent Group Population

`AGENT_GROUPS` is seeded at activation time by `populateAgentGroups(extensionPath)`, which reads `.md` files from `resources/agents/<group>/` directories. Adding new agents requires only dropping a new `.md` file into the correct folder — no code changes needed.

## Packaging

```bash
npm install -g @vscode/vsce
vsce package
# Output: ai-agent-management-studio-1.0.0.vsix
```

The VSIX contains:
- `out/extension.js` (compiled TypeScript)
- `resources/` (all agent markdown and JSON files)
- `package.json`, `README.md`, `CHANGELOG.md`

It does **not** contain:
- `src/` (TypeScript source)
- `node_modules/`
- Source maps (`out/**/*.map`)
- `.vscode/` configuration
