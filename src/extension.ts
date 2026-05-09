import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// ─────────────────────────────────────────────
// Interfaces
// ─────────────────────────────────────────────

interface AgentGroup {
  name: string;
  agents: string[];
  relatedDocs: string[];
}

interface SpecItem {
  id: string;
  name: string;
  version: string;
  description: string;
  category?: string;
  specificTools?: string[];
}

interface CustomAgentData {
  agentName: string;
  description: string;
  model: string;
  roles: SpecItem[];
  responsibilities: SpecItem[];
  skills: SpecItem[];
  tools: (SpecItem & { category: string; specificTools?: string[] })[];
  instructions: SpecItem[];
  additionalInfo: string;
}

interface AllSpecs {
  roles: SpecItem[];
  responsibilities: SpecItem[];
  skills: SpecItem[];
  tools: (SpecItem & { category: string; specificTools?: string[] })[];
  instructions: SpecItem[];
}

// ─────────────────────────────────────────────
// Agent group configuration
// ─────────────────────────────────────────────

const AGENT_GROUPS: { [key: string]: AgentGroup } = {
  dev: {
    name: 'Development Agents',
    agents: [],
    relatedDocs: [],
  },
  migration: {
    name: 'Migration Agents',
    agents: [],
    relatedDocs: [],
  },
  governance: {
    name: 'Governance Agents',
    agents: [],
    relatedDocs: [],
  },
};

// ─────────────────────────────────────────────
// File utilities
// ─────────────────────────────────────────────

function copyFile(source: string, destination: string): void {
  if (fs.existsSync(destination)) {
    return;
  }
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

function copyDirectory(source: string, destination: string): void {
  if (!fs.existsSync(source)) {
    return;
  }
  fs.mkdirSync(destination, { recursive: true });
  const entries = fs.readdirSync(source, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(source, entry.name);
    const destPath = path.join(destination, entry.name);
    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      copyFile(srcPath, destPath);
    }
  }
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

// ─────────────────────────────────────────────
// Dynamic agent group population
// ─────────────────────────────────────────────

function populateAgentGroups(extensionPath: string): void {
  for (const groupKey of Object.keys(AGENT_GROUPS)) {
    const groupDir = path.join(extensionPath, 'resources', 'agents', groupKey);
    if (!fs.existsSync(groupDir)) {
      continue;
    }
    const files = fs.readdirSync(groupDir).filter((f) => f.endsWith('.md'));
    AGENT_GROUPS[groupKey].agents = files;
  }
}

// ─────────────────────────────────────────────
// UI helpers
// ─────────────────────────────────────────────

async function showGroupSelection(): Promise<string | undefined> {
  const items: vscode.QuickPickItem[] = [
    {
      label: '$(code) Development Agents',
      description: 'Dev, Lead, PR, Requirement Analysis, Review agents',
      detail: 'Full SDLC development workflow agents',
    },
    {
      label: '$(arrow-right) Migration Agents',
      description: 'Rule migration and transformation agents',
      detail: 'Agents for migrating rules, schemas, and data',
    },
    {
      label: '$(shield) Governance Agents',
      description: 'Policy, compliance, and governance agents',
      detail: 'Agents for enforcing standards and compliance',
    },
    {
      label: '$(checklist) All Agents',
      description: 'Install every agent from all groups',
      detail: 'Install the complete agent suite',
    },
    {
      label: '$(add) Create Custom Agent',
      description: 'Open the visual Custom Agent Builder',
      detail: 'Build your own agent with the interactive UI',
    },
  ];

  const pick = await vscode.window.showQuickPick(items, {
    placeHolder: 'Click a group to browse its agents',
    title: 'AI Agent Management Studio',
  });

  return pick?.label;
}

async function showAgentSelection(groupLabel: string): Promise<string[] | undefined> {
  const labelToGroupKey: { [label: string]: string } = {
    '$(code) Development Agents': 'dev',
    '$(arrow-right) Migration Agents': 'migration',
    '$(shield) Governance Agents': 'governance',
  };

  const groupKeys = groupLabel.includes('All Agents')
    ? Object.keys(AGENT_GROUPS)
    : [labelToGroupKey[groupLabel]].filter(Boolean);

  const allAgentItems: vscode.QuickPickItem[] = [];

  for (const key of groupKeys) {
    const group = AGENT_GROUPS[key];
    if (!group || group.agents.length === 0) {
      continue;
    }
    if (groupKeys.length > 1) {
      allAgentItems.push({ label: group.name, kind: vscode.QuickPickItemKind.Separator });
    }
    for (const agent of group.agents) {
      allAgentItems.push({ label: agent, description: key, picked: true });
    }
  }

  if (allAgentItems.filter((i) => i.kind !== vscode.QuickPickItemKind.Separator).length === 0) {
    vscode.window.showWarningMessage('No agent files found for the selected group.');
    return undefined;
  }

  const groupName = groupKeys.length === 1 ? AGENT_GROUPS[groupKeys[0]].name : 'All Agents';

  const selected = await vscode.window.showQuickPick(allAgentItems, {
    canPickMany: true,
    placeHolder: 'Space to toggle, Enter to install',
    title: groupName,
  });

  if (!selected || selected.length === 0) {
    return undefined;
  }

  return selected
    .filter((s) => s.kind !== vscode.QuickPickItemKind.Separator)
    .map((s) => `${s.description}/${s.label}`);
}

async function copySelectedAgents(
  selectedAgents: string[],
  workspaceRoot: string,
  extensionPath: string
): Promise<number> {
  const destDir = path.join(workspaceRoot, '.github', 'agents');
  fs.mkdirSync(destDir, { recursive: true });

  let copied = 0;
  for (const agentPath of selectedAgents) {
    const src = path.join(extensionPath, 'resources', 'agents', agentPath);
    const fileName = path.basename(agentPath);
    const dest = path.join(destDir, fileName);
    if (!fs.existsSync(dest)) {
      fs.copyFileSync(src, dest);
      copied++;
    }
  }
  return copied;
}

// ─────────────────────────────────────────────
// Custom agent data & spec management
// ─────────────────────────────────────────────

function mergeSpecs<T extends SpecItem>(defaultSpecs: T[], userSpecs: T[]): T[] {
  const merged = [...defaultSpecs];
  for (const userSpec of userSpecs) {
    const idx = merged.findIndex((s) => s.id === userSpec.id);
    if (idx >= 0) {
      merged[idx] = userSpec;
    } else {
      merged.push(userSpec);
    }
  }
  return merged;
}

function loadJson<T>(filePath: string): T[] {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T[];
  } catch {
    return [];
  }
}

function loadCustomAgentData(extensionPath: string, workspaceRoot: string): AllSpecs {
  const resourcesDir = path.join(extensionPath, 'resources');
  const userDir = path.join(workspaceRoot, '.github', 'agent-specs');

  const defaultRoles = loadJson<SpecItem>(path.join(resourcesDir, 'roles.json'));
  const defaultResponsibilities = loadJson<SpecItem>(path.join(resourcesDir, 'responsibilities.json'));
  const defaultSkills = loadJson<SpecItem>(path.join(resourcesDir, 'skills.json'));
  const defaultTools = loadJson<SpecItem & { category: string }>(path.join(resourcesDir, 'tools.json'));
  const defaultInstructions = loadJson<SpecItem>(path.join(resourcesDir, 'instructions.json'));

  const userRoles = loadJson<SpecItem>(path.join(userDir, 'roles.json'));
  const userResponsibilities = loadJson<SpecItem>(path.join(userDir, 'responsibilities.json'));
  const userSkills = loadJson<SpecItem>(path.join(userDir, 'skills.json'));
  const userTools = loadJson<SpecItem & { category: string }>(path.join(userDir, 'tools.json'));
  const userInstructions = loadJson<SpecItem>(path.join(userDir, 'instructions.json'));

  return {
    roles: mergeSpecs(defaultRoles, userRoles),
    responsibilities: mergeSpecs(defaultResponsibilities, userResponsibilities),
    skills: mergeSpecs(defaultSkills, userSkills),
    tools: mergeSpecs(defaultTools, userTools),
    instructions: mergeSpecs(defaultInstructions, userInstructions),
  };
}

function saveNewSpec(
  specType: string,
  newSpec: SpecItem,
  workspaceRoot: string,
  extensionPath: string
): void {
  const userDir = path.join(workspaceRoot, '.github', 'agent-specs');
  fs.mkdirSync(userDir, { recursive: true });

  const filePath = path.join(userDir, `${specType}.json`);
  const existing = loadJson<SpecItem>(filePath);
  const idx = existing.findIndex((s) => s.id === newSpec.id);
  if (idx >= 0) {
    existing[idx] = newSpec;
  } else {
    existing.push(newSpec);
  }
  fs.writeFileSync(filePath, JSON.stringify(existing, null, 2), 'utf8');

  // Also sync extension resources so new specs appear in the default pool
  const resourcePath = path.join(extensionPath, 'resources', `${specType}.json`);
  const resourceData = loadJson<SpecItem>(resourcePath);
  const resourceIdx = resourceData.findIndex((s) => s.id === newSpec.id);
  if (resourceIdx < 0) {
    resourceData.push(newSpec);
    try {
      fs.writeFileSync(resourcePath, JSON.stringify(resourceData, null, 2), 'utf8');
    } catch {
      // Extension resources are read-only in production; user spec file is the source of truth
    }
  }
}

// ─────────────────────────────────────────────
// Markdown generation
// ─────────────────────────────────────────────

function generateCustomAgentFile(data: CustomAgentData, workspaceRoot: string, extensionPath: string): string {
  const agentsDir = path.join(workspaceRoot, '.github', 'agents');
  fs.mkdirSync(agentsDir, { recursive: true });

  const toolNames = data.tools.map((t) => {
    if (t.specificTools && t.specificTools.length > 0) {
      return t.specificTools.join(', ');
    }
    return t.name;
  });

  const allTools = toolNames.join(', ');

  const rolesList = data.roles.map((r) => `- **${r.name}** (v${r.version}): ${r.description}`).join('\n');
  const respList = data.responsibilities.map((r) => `- ${r.description}`).join('\n');
  const skillsList = data.skills.map((s) => `- ${s.name}`).join('\n');
  const instrList = data.instructions.map((i) => `- ${i.description}`).join('\n');

  const slug = data.agentName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  const content = `---
name: ${slug}
description: ${data.description}
model: ${data.model}
tools: ${allTools}
---

# ${data.agentName}

${data.description}

## Roles
${rolesList}

## Responsibilities
${respList}

## Skills
${skillsList}

## Instructions
${instrList}
${data.additionalInfo ? `\n## Additional Information\n${data.additionalInfo}` : ''}
`;

  const fileName = `${slug}.agent.md`;
  const filePath = path.join(agentsDir, fileName);
  fs.writeFileSync(filePath, content, 'utf8');

  // Save specs used by this agent for future reuse
  for (const role of data.roles) {
    saveNewSpec('roles', role, workspaceRoot, extensionPath);
  }
  for (const resp of data.responsibilities) {
    saveNewSpec('responsibilities', resp, workspaceRoot, extensionPath);
  }
  for (const skill of data.skills) {
    saveNewSpec('skills', skill, workspaceRoot, extensionPath);
  }
  for (const tool of data.tools) {
    saveNewSpec('tools', tool, workspaceRoot, extensionPath);
  }
  for (const instr of data.instructions) {
    saveNewSpec('instructions', instr, workspaceRoot, extensionPath);
  }

  return filePath;
}

// ─────────────────────────────────────────────
// Webview
// ─────────────────────────────────────────────

function getWebviewContent(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  allSpecs: AllSpecs
): string {
  const nonce = getNonce();
  const cspSource = webview.cspSource;

  const rolesJson = JSON.stringify(allSpecs.roles);
  const respJson = JSON.stringify(allSpecs.responsibilities);
  const skillsJson = JSON.stringify(allSpecs.skills);
  const toolsJson = JSON.stringify(allSpecs.tools);
  const instrJson = JSON.stringify(allSpecs.instructions);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Custom Agent Builder</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: var(--vscode-font-family);
      font-size: 13px;
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      line-height: 1.5;
      padding-bottom: 80px; /* room for sticky footer */
    }

    /* ── Page header ─────────────────────────────── */
    .page-header {
      padding: 20px 28px 18px;
      border-bottom: 1px solid var(--vscode-panel-border, rgba(128,128,128,0.2));
      margin-bottom: 0;
    }

    .page-header h1 {
      font-size: 16px;
      font-weight: 600;
      color: var(--vscode-foreground);
      letter-spacing: 0.01em;
      margin-bottom: 3px;
    }

    .page-header p {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
    }

    /* ── Scrollable content area ─────────────────── */
    .content {
      padding: 20px 28px;
    }

    /* ── Section card ────────────────────────────── */
    .section {
      background: var(--vscode-sideBar-background, var(--vscode-editor-background));
      border: 1px solid var(--vscode-panel-border, rgba(128,128,128,0.2));
      border-radius: 6px;
      margin-bottom: 16px;
      overflow: hidden;
      animation: fadeUp 0.18s ease both;
    }

    .section:nth-child(2) { animation-delay: 0.04s; }
    .section:nth-child(3) { animation-delay: 0.08s; }

    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 11px 16px;
      background: var(--vscode-sideBarSectionHeader-background, rgba(128,128,128,0.08));
      border-bottom: 1px solid var(--vscode-panel-border, rgba(128,128,128,0.2));
    }

    .section-icon {
      width: 16px;
      height: 16px;
      border-radius: 3px;
      background: var(--vscode-button-background, #0078d4);
      flex-shrink: 0;
    }

    .section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--vscode-sideBarSectionHeader-foreground, var(--vscode-foreground));
    }

    .section-body {
      padding: 16px;
    }

    /* ── Form grid ───────────────────────────────── */
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-bottom: 14px;
    }

    .form-row.full { grid-template-columns: 1fr; }
    .form-row.three { grid-template-columns: 1fr 1fr 1fr; }

    /* ── Field ───────────────────────────────────── */
    .field { display: flex; flex-direction: column; gap: 5px; }

    .field-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--vscode-input-foreground);
      letter-spacing: 0.02em;
    }

    .field-label.required::after {
      content: ' *';
      color: var(--vscode-errorForeground, #f14c4c);
    }

    input[type="text"],
    select,
    textarea {
      width: 100%;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border, rgba(128,128,128,0.3));
      border-radius: 3px;
      padding: 6px 8px;
      font-family: inherit;
      font-size: 13px;
      outline: none;
      transition: border-color 0.12s;
    }

    input[type="text"]:focus,
    select:focus,
    textarea:focus {
      border-color: var(--vscode-focusBorder, #0078d4);
    }

    select[multiple] {
      padding: 4px 0;
    }

    select[multiple] option {
      padding: 4px 8px;
      border-radius: 0;
    }

    select[multiple] option:checked {
      background: var(--vscode-list-activeSelectionBackground, #0078d4);
      color: var(--vscode-list-activeSelectionForeground, #fff);
    }

    textarea { resize: vertical; min-height: 72px; }

    .error-msg {
      font-size: 11px;
      color: var(--vscode-errorForeground, #f14c4c);
      min-height: 16px;
    }

    /* ── Spec group (label row + select) ─────────── */
    .spec-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-bottom: 14px;
    }

    .spec-grid .span-full {
      grid-column: 1 / -1;
    }

    .spec-field { display: flex; flex-direction: column; gap: 0; }

    .spec-field-header {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      margin-bottom: 5px;
    }

    .spec-hint {
      font-size: 10px;
      color: var(--vscode-descriptionForeground);
      font-style: italic;
    }

    /* ── Buttons ─────────────────────────────────── */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-family: inherit;
      font-weight: 500;
      white-space: nowrap;
      transition: background 0.12s, opacity 0.12s;
      text-decoration: none;
    }

    .btn:focus-visible { outline: 1px solid var(--vscode-focusBorder, #0078d4); outline-offset: 1px; }
    .btn:active { opacity: 0.8; }

    .btn-primary {
      background: var(--vscode-button-background, #0078d4);
      color: var(--vscode-button-foreground, #fff);
      padding: 7px 18px;
      font-size: 13px;
    }

    .btn-primary:hover {
      background: var(--vscode-button-hoverBackground, #026ec1);
    }

    .btn-ghost {
      background: transparent;
      color: var(--vscode-foreground);
      border: 1px solid var(--vscode-input-border, rgba(128,128,128,0.4));
      padding: 7px 16px;
      font-size: 13px;
    }

    .btn-ghost:hover {
      background: var(--vscode-list-hoverBackground, rgba(128,128,128,0.1));
    }

    .btn-link {
      background: transparent;
      color: var(--vscode-textLink-foreground, #3794ff);
      padding: 2px 0;
      font-size: 11px;
      font-weight: 500;
      border: none;
    }

    .btn-link:hover { text-decoration: underline; }

    /* ── Sticky footer ───────────────────────────── */
    .footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      padding: 12px 28px;
      background: var(--vscode-editor-background);
      border-top: 1px solid var(--vscode-panel-border, rgba(128,128,128,0.2));
    }

    /* ── Modal ───────────────────────────────────── */
    .modal-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 200;
      align-items: center;
      justify-content: center;
    }

    .modal-overlay.open { display: flex; }

    .modal {
      background: var(--vscode-editorWidget-background, var(--vscode-editor-background));
      border: 1px solid var(--vscode-widget-border, rgba(128,128,128,0.3));
      border-radius: 6px;
      width: 480px;
      max-width: 94vw;
      box-shadow: 0 8px 32px rgba(0,0,0,0.36);
      animation: modalIn 0.15s ease both;
    }

    @keyframes modalIn {
      from { opacity: 0; transform: scale(0.96) translateY(-8px); }
      to   { opacity: 1; transform: scale(1) translateY(0); }
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px 12px;
      border-bottom: 1px solid var(--vscode-panel-border, rgba(128,128,128,0.2));
    }

    .modal-header h2 {
      font-size: 13px;
      font-weight: 600;
      color: var(--vscode-foreground);
    }

    .modal-close {
      background: none;
      border: none;
      cursor: pointer;
      color: var(--vscode-foreground);
      opacity: 0.6;
      font-size: 18px;
      line-height: 1;
      padding: 2px 4px;
      border-radius: 3px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .modal-close:hover { opacity: 1; background: var(--vscode-list-hoverBackground, rgba(128,128,128,0.15)); }

    .modal-body { padding: 16px; }

    .modal-field { margin-bottom: 14px; }

    .modal-field:last-child { margin-bottom: 0; }

    .modal-field label {
      display: block;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.02em;
      margin-bottom: 5px;
      color: var(--vscode-input-foreground);
    }

    .modal-field label.required::after {
      content: ' *';
      color: var(--vscode-errorForeground, #f14c4c);
    }

    .modal-error {
      font-size: 11px;
      color: var(--vscode-errorForeground, #f14c4c);
      margin-top: 5px;
      min-height: 15px;
    }

    .modal-footer {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      padding: 12px 16px;
      border-top: 1px solid var(--vscode-panel-border, rgba(128,128,128,0.2));
    }
  </style>
</head>
<body>

  <!-- Page header -->
  <div class="page-header">
    <h1>Custom Agent Builder</h1>
    <p>Design and generate a custom AI agent markdown file for your workspace.</p>
  </div>

  <div class="content">

    <!-- Section 1: Basic Information -->
    <div class="section">
      <div class="section-header">
        <div class="section-icon"></div>
        <span class="section-title">Basic Information</span>
      </div>
      <div class="section-body">
        <div class="form-row">
          <div class="field">
            <label class="field-label required" for="agentName">Agent Name</label>
            <input type="text" id="agentName" placeholder="e.g. SecurityScanAgent" />
            <span class="error-msg" id="agentNameError"></span>
          </div>
          <div class="field">
            <label class="field-label" for="model">Model</label>
            <select id="model">
              <option value="claude-sonnet-4-5" selected>Claude Sonnet 4.5 (copilot)</option>
              <option value="claude-sonnet-4-6">Claude Sonnet 4.6</option>
              <option value="claude-opus-4-7">Claude Opus 4.7</option>
              <option value="claude-haiku-4-5">Claude Haiku 4.5</option>
            </select>
          </div>
        </div>
        <div class="form-row full">
          <div class="field">
            <label class="field-label required" for="description">Description</label>
            <textarea id="description" rows="3" placeholder="Describe what this agent does and when it should be triggered"></textarea>
            <span class="error-msg" id="descriptionError"></span>
          </div>
        </div>
      </div>
    </div>

    <!-- Section 2: Agent Configuration -->
    <div class="section">
      <div class="section-header">
        <div class="section-icon"></div>
        <span class="section-title">Agent Configuration</span>
      </div>
      <div class="section-body">
        <div class="spec-grid">

          <!-- Roles -->
          <div class="spec-field">
            <div class="spec-field-header">
              <label class="field-label" for="rolesSelect">Roles</label>
              <button class="btn btn-link" id="addRoleBtn">+ Add New</button>
            </div>
            <select id="rolesSelect" multiple size="5"></select>
            <span class="spec-hint">Hold Ctrl / ⌘ to multi-select</span>
          </div>

          <!-- Responsibilities -->
          <div class="spec-field">
            <div class="spec-field-header">
              <label class="field-label" for="respSelect">Responsibilities</label>
              <button class="btn btn-link" id="addRespBtn">+ Add New</button>
            </div>
            <select id="respSelect" multiple size="5"></select>
            <span class="spec-hint">Hold Ctrl / ⌘ to multi-select</span>
          </div>

          <!-- Skills -->
          <div class="spec-field">
            <div class="spec-field-header">
              <label class="field-label" for="skillsSelect">Skills</label>
              <button class="btn btn-link" id="addSkillBtn">+ Add New</button>
            </div>
            <select id="skillsSelect" multiple size="5"></select>
            <span class="spec-hint">Hold Ctrl / ⌘ to multi-select</span>
          </div>

          <!-- Tools -->
          <div class="spec-field">
            <div class="spec-field-header">
              <label class="field-label" for="toolsSelect">Tools</label>
              <button class="btn btn-link" id="addToolBtn">+ Add New</button>
            </div>
            <select id="toolsSelect" multiple size="5"></select>
            <span class="spec-hint">Hold Ctrl / ⌘ to multi-select</span>
          </div>

          <!-- Instructions — full width -->
          <div class="spec-field span-full">
            <div class="spec-field-header">
              <label class="field-label" for="instrSelect">Instructions</label>
              <button class="btn btn-link" id="addInstrBtn">+ Add New</button>
            </div>
            <select id="instrSelect" multiple size="4"></select>
            <span class="spec-hint">Hold Ctrl / ⌘ to multi-select</span>
          </div>

        </div>
      </div>
    </div>

    <!-- Section 3: Additional Details -->
    <div class="section">
      <div class="section-header">
        <div class="section-icon"></div>
        <span class="section-title">Additional Details</span>
      </div>
      <div class="section-body">
        <div class="field">
          <label class="field-label" for="additionalInfo">Additional Information <span style="font-weight:400;color:var(--vscode-descriptionForeground)">(optional)</span></label>
          <textarea id="additionalInfo" rows="4" placeholder="Any extra context, constraints, or behaviour notes for this agent"></textarea>
        </div>
      </div>
    </div>

  </div><!-- /content -->

  <!-- Sticky footer -->
  <div class="footer">
    <button class="btn btn-ghost" id="cancelBtn">Cancel</button>
    <button class="btn btn-primary" id="createBtn">Generate Agent File</button>
  </div>

  <!-- Modal -->
  <div class="modal-overlay" id="modalOverlay">
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
      <div class="modal-header">
        <h2 id="modalTitle">Add New Item</h2>
        <button class="modal-close" id="modalCloseBtn" aria-label="Close">&#x2715;</button>
      </div>

      <div class="modal-body">
        <div class="modal-field">
          <label class="required" for="modalName">Name</label>
          <input type="text" id="modalName" placeholder="Display name" />
          <div class="modal-error" id="modalNameError"></div>
        </div>

        <div class="modal-field">
          <label class="required" for="modalDescription">Description</label>
          <textarea id="modalDescription" rows="3" placeholder="Brief description of this item"></textarea>
          <div class="modal-error" id="modalDescError"></div>
        </div>

        <div class="modal-field" id="modalCategoryField" style="display:none">
          <label for="modalCategory">Category</label>
          <select id="modalCategory">
            <option value="read">read</option>
            <option value="edit">edit</option>
            <option value="search">search</option>
            <option value="execute">execute</option>
            <option value="agent">agent</option>
            <option value="vscode/extensions">vscode/extensions</option>
            <option value="web">web</option>
            <option value="findTestFiles">findTestFiles</option>
          </select>
        </div>

        <div class="modal-field" id="modalSpecificToolsField" style="display:none">
          <label for="modalSpecificTools">Specific Tools <span style="font-weight:400">(comma-separated)</span></label>
          <input type="text" id="modalSpecificTools" placeholder="e.g. Read, Edit, Write" />
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-ghost" id="modalCancelBtn">Cancel</button>
        <button class="btn btn-primary" id="modalSaveBtn">Save</button>
      </div>
    </div>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();

    let allSpecs = {
      roles: ${rolesJson},
      responsibilities: ${respJson},
      skills: ${skillsJson},
      tools: ${toolsJson},
      instructions: ${instrJson}
    };

    let currentModalType = '';

    // ── Populate dropdowns ──────────────────────────────────
    function populateSelect(selectId, items, labelFn) {
      const sel = document.getElementById(selectId);
      sel.innerHTML = '';
      items.forEach((item, i) => {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = labelFn(item);
        sel.appendChild(opt);
      });
    }

    function refreshDropdowns() {
      populateSelect('rolesSelect', allSpecs.roles, r => r.name + ' — v' + r.version);
      populateSelect('respSelect', allSpecs.responsibilities, r => r.name);
      populateSelect('skillsSelect', allSpecs.skills, s => s.name);
      populateSelect('toolsSelect', allSpecs.tools, t => t.name + '  [' + t.category + ']');
      populateSelect('instrSelect', allSpecs.instructions, i => i.name);
    }

    // ── Get selected items from a multi-select ──────────────
    function getSelected(selectId, specKey) {
      const sel = document.getElementById(selectId);
      const result = [];
      for (const opt of sel.selectedOptions) {
        result.push(allSpecs[specKey][parseInt(opt.value)]);
      }
      return result;
    }

    // ── Modal helpers ───────────────────────────────────────
    function setModalError(nameErr, descErr) {
      document.getElementById('modalNameError').textContent = nameErr || '';
      document.getElementById('modalDescError').textContent = descErr || '';
    }

    function openModal(type) {
      currentModalType = type;
      const label = type === 'responsibilities' ? 'Responsibility'
                  : type.charAt(0).toUpperCase() + type.slice(1, -1);
      document.getElementById('modalTitle').textContent = 'Add New ' + label;
      document.getElementById('modalName').value = '';
      document.getElementById('modalDescription').value = '';
      document.getElementById('modalSpecificTools').value = '';
      setModalError('', '');

      const isTool = type === 'tools';
      document.getElementById('modalCategoryField').style.display = isTool ? 'block' : 'none';
      document.getElementById('modalSpecificToolsField').style.display = isTool ? 'block' : 'none';

      document.getElementById('modalOverlay').classList.add('open');
      document.getElementById('modalName').focus();
    }

    function closeModal() {
      document.getElementById('modalOverlay').classList.remove('open');
      currentModalType = '';
    }

    document.getElementById('modalCloseBtn').addEventListener('click', closeModal);
    document.getElementById('modalCancelBtn').addEventListener('click', closeModal);
    document.getElementById('modalOverlay').addEventListener('click', (e) => {
      if (e.target === document.getElementById('modalOverlay')) closeModal();
    });

    document.getElementById('modalSaveBtn').addEventListener('click', () => {
      const name = document.getElementById('modalName').value.trim();
      const desc = document.getElementById('modalDescription').value.trim();
      let valid = true;
      if (!name) { setModalError('Name is required.', ''); valid = false; }
      if (!desc) { setModalError(name ? '' : 'Name is required.', 'Description is required.'); valid = false; }
      if (!valid) return;

      const id = name.toLowerCase().replace(/\\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now();
      const newSpec = { id, name, version: '1.0.0', description: desc };

      if (currentModalType === 'tools') {
        newSpec.category = document.getElementById('modalCategory').value;
        const specificTools = document.getElementById('modalSpecificTools').value.trim();
        if (specificTools) {
          newSpec.specificTools = specificTools.split(',').map(s => s.trim()).filter(Boolean);
        }
      }

      allSpecs[currentModalType].push(newSpec);
      refreshDropdowns();

      vscode.postMessage({ command: 'addNewSpec', specType: currentModalType, spec: newSpec });
      closeModal();
    });

    // ── Create agent ────────────────────────────────────────
    document.getElementById('createBtn').addEventListener('click', () => {
      const agentName = document.getElementById('agentName').value.trim();
      const description = document.getElementById('description').value.trim();

      let valid = true;
      document.getElementById('agentNameError').textContent = agentName ? '' : 'Agent name is required.';
      document.getElementById('descriptionError').textContent = description ? '' : 'Description is required.';
      if (!agentName || !description) { valid = false; }
      if (!valid) return;

      vscode.postMessage({
        command: 'createAgent',
        data: {
          agentName,
          description,
          model: document.getElementById('model').value,
          roles: getSelected('rolesSelect', 'roles'),
          responsibilities: getSelected('respSelect', 'responsibilities'),
          skills: getSelected('skillsSelect', 'skills'),
          tools: getSelected('toolsSelect', 'tools'),
          instructions: getSelected('instrSelect', 'instructions'),
          additionalInfo: document.getElementById('additionalInfo').value.trim()
        }
      });
    });

    document.getElementById('cancelBtn').addEventListener('click', () => {
      vscode.postMessage({ command: 'cancel' });
    });

    // ── Handle messages from extension ──────────────────────
    window.addEventListener('message', (event) => {
      const msg = event.data;
      if (msg.command === 'updateSpecs') {
        allSpecs = msg.specs;
        refreshDropdowns();
      }
    });

    // ── Add-new button wiring ───────────────────────────────
    document.getElementById('addRoleBtn').addEventListener('click', () => openModal('roles'));
    document.getElementById('addRespBtn').addEventListener('click', () => openModal('responsibilities'));
    document.getElementById('addSkillBtn').addEventListener('click', () => openModal('skills'));
    document.getElementById('addToolBtn').addEventListener('click', () => openModal('tools'));
    document.getElementById('addInstrBtn').addEventListener('click', () => openModal('instructions'));

    // ── Init ────────────────────────────────────────────────
    refreshDropdowns();
    vscode.postMessage({ command: 'ready' });
  </script>
</body>
</html>`;
}

async function showCustomAgentWebview(
  context: vscode.ExtensionContext,
  workspaceRoot: string
): Promise<void> {
  const panel = vscode.window.createWebviewPanel(
    'customAgentBuilder',
    'Custom Agent Builder',
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      localResourceRoots: [context.extensionUri],
    }
  );

  const allSpecs = loadCustomAgentData(context.extensionPath, workspaceRoot);
  panel.webview.html = getWebviewContent(panel.webview, context.extensionUri, allSpecs);

  panel.webview.onDidReceiveMessage(
    async (message) => {
      switch (message.command) {
        case 'ready':
          break;

        case 'createAgent': {
          try {
            const filePath = generateCustomAgentFile(message.data as CustomAgentData, workspaceRoot, context.extensionPath);
            vscode.window.showInformationMessage(
              `Agent created: ${path.basename(filePath)}`,
              'Open File'
            ).then((choice) => {
              if (choice === 'Open File') {
                vscode.workspace.openTextDocument(filePath).then((doc) => {
                  vscode.window.showTextDocument(doc);
                });
              }
            });
            panel.dispose();
          } catch (err) {
            vscode.window.showErrorMessage(`Failed to create agent: ${(err as Error).message}`);
          }
          break;
        }

        case 'addNewSpec': {
          try {
            saveNewSpec(message.specType as string, message.spec as SpecItem, workspaceRoot, context.extensionPath);
            const updatedSpecs = loadCustomAgentData(context.extensionPath, workspaceRoot);
            panel.webview.postMessage({ command: 'updateSpecs', specs: updatedSpecs });
          } catch (err) {
            vscode.window.showErrorMessage(`Failed to save spec: ${(err as Error).message}`);
          }
          break;
        }

        case 'cancel':
          panel.dispose();
          break;

        case 'error':
          vscode.window.showErrorMessage(message.text as string);
          break;
      }
    },
    undefined,
    context.subscriptions
  );
}

// ─────────────────────────────────────────────
// Main orchestrator
// ─────────────────────────────────────────────

async function populateGitHubFolder(
  workspaceRoot: string,
  extensionPath: string,
  context: vscode.ExtensionContext
): Promise<void> {
  populateAgentGroups(extensionPath);

  const selectedGroup = await showGroupSelection();
  if (!selectedGroup) {
    return;
  }

  if (selectedGroup.includes('Create Custom Agent')) {
    await showCustomAgentWebview(context, workspaceRoot);
    return;
  }

  const selectedAgents = await showAgentSelection(selectedGroup);
  if (!selectedAgents) {
    return;
  }

  const copied = await copySelectedAgents(selectedAgents, workspaceRoot, extensionPath);
  const skipped = selectedAgents.length - copied;

  const parts: string[] = [];
  if (copied > 0) {
    parts.push(`${copied} agent(s) installed`);
  }
  if (skipped > 0) {
    parts.push(`${skipped} already existed (skipped)`);
  }

  vscode.window.showInformationMessage(
    `AI Agent Suite: ${parts.join(', ')} → .github/agents/`
  );
}

// ─────────────────────────────────────────────
// Extension entry points
// ─────────────────────────────────────────────

export function activate(context: vscode.ExtensionContext): void {
  const disposable = vscode.commands.registerCommand('aiAgentStudio.installAgents', async () => {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      vscode.window.showErrorMessage('Please open a workspace folder before installing agents.');
      return;
    }

    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    await populateGitHubFolder(workspaceRoot, context.extensionPath, context);
  });

  context.subscriptions.push(disposable);
}

export function deactivate(): void {}
