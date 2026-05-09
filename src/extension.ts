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
  qe: {
    name: 'Quality Engineering Agents',
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
      label: '$(beaker) Quality Engineering Agents',
      description: 'Test automation and performance agents',
      detail: 'Testing, BDD, API, and performance evaluation agents',
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
    '$(beaker) Quality Engineering Agents': 'qe',
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
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      padding: 24px;
      line-height: 1.5;
    }

    h1 {
      font-size: 1.4em;
      font-weight: 600;
      color: var(--vscode-titleBar-activeForeground, var(--vscode-foreground));
      margin-bottom: 6px;
    }

    .subtitle {
      color: var(--vscode-descriptionForeground);
      font-size: 0.9em;
      margin-bottom: 28px;
    }

    .section {
      background: var(--vscode-editor-inactiveSelectionBackground, rgba(255,255,255,0.04));
      border: 1px solid var(--vscode-panel-border, rgba(255,255,255,0.1));
      border-radius: 6px;
      padding: 20px 24px;
      margin-bottom: 20px;
      animation: slideIn 0.2s ease;
    }

    @keyframes slideIn {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .section-title {
      font-size: 1em;
      font-weight: 600;
      color: var(--vscode-foreground);
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--vscode-panel-border, rgba(255,255,255,0.1));
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 14px;
    }

    .form-row.full { grid-template-columns: 1fr; }

    .field { display: flex; flex-direction: column; gap: 5px; }

    label {
      font-size: 0.85em;
      font-weight: 500;
      color: var(--vscode-input-foreground);
    }

    input, select, textarea {
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border, rgba(255,255,255,0.15));
      border-radius: 4px;
      padding: 7px 10px;
      font-family: inherit;
      font-size: 0.9em;
      outline: none;
      transition: border-color 0.15s;
    }

    input:focus, select:focus, textarea:focus {
      border-color: var(--vscode-focusBorder, #007acc);
    }

    textarea { resize: vertical; min-height: 90px; }

    .spec-row {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 10px;
      align-items: center;
      margin-bottom: 12px;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 14px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-family: inherit;
      font-size: 0.88em;
      font-weight: 500;
      transition: opacity 0.15s, transform 0.1s;
    }

    .btn:active { transform: scale(0.97); }

    .btn-primary {
      background: var(--vscode-button-background, #007acc);
      color: var(--vscode-button-foreground, #fff);
    }

    .btn-primary:hover { opacity: 0.88; }

    .btn-secondary {
      background: var(--vscode-button-secondaryBackground, rgba(255,255,255,0.1));
      color: var(--vscode-button-secondaryForeground, var(--vscode-foreground));
    }

    .btn-secondary:hover { opacity: 0.8; }

    .btn-add {
      background: transparent;
      color: var(--vscode-textLink-foreground, #3794ff);
      border: 1px solid var(--vscode-textLink-foreground, #3794ff);
      padding: 5px 10px;
      font-size: 0.82em;
    }

    .btn-add:hover { background: rgba(55, 148, 255, 0.12); }

    .actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 8px;
    }

    /* Modal */
    .modal-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.55);
      z-index: 100;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.15s ease;
    }

    .modal-overlay.open { display: flex; }

    @keyframes fadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    .modal {
      background: var(--vscode-editorWidget-background, var(--vscode-editor-background));
      border: 1px solid var(--vscode-panel-border, rgba(255,255,255,0.15));
      border-radius: 8px;
      padding: 24px;
      width: 460px;
      max-width: 92vw;
      animation: slideIn 0.18s ease;
    }

    .modal-title {
      font-size: 1em;
      font-weight: 600;
      margin-bottom: 18px;
    }

    .modal-field { margin-bottom: 12px; }

    .modal-field label { display: block; margin-bottom: 4px; font-size: 0.85em; font-weight: 500; }

    .modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 18px; }

    .error-msg {
      color: var(--vscode-errorForeground, #f48771);
      font-size: 0.85em;
      margin-top: 4px;
    }

    .required::after { content: ' *'; color: var(--vscode-errorForeground, #f48771); }
  </style>
</head>
<body>
  <h1>Custom Agent Builder</h1>
  <p class="subtitle">Design and generate a custom AI agent markdown file for your workspace.</p>

  <!-- Section 1: Basic Information -->
  <div class="section">
    <div class="section-title">Basic Information</div>
    <div class="form-row">
      <div class="field">
        <label class="required" for="agentName">Agent Name</label>
        <input type="text" id="agentName" placeholder="e.g. SecurityScanAgent" />
        <span class="error-msg" id="agentNameError"></span>
      </div>
      <div class="field">
        <label for="model">Model</label>
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
        <label class="required" for="description">Description</label>
        <textarea id="description" rows="2" placeholder="Describe what this agent does and when to trigger it"></textarea>
        <span class="error-msg" id="descriptionError"></span>
      </div>
    </div>
  </div>

  <!-- Section 2: Agent Configuration -->
  <div class="section">
    <div class="section-title">Agent Configuration</div>

    <div class="spec-row">
      <div class="field">
        <label for="rolesSelect">Roles</label>
        <select id="rolesSelect" multiple size="4"></select>
      </div>
      <button class="btn btn-add" id="addRoleBtn">+ Add New Role</button>
    </div>

    <div class="spec-row">
      <div class="field">
        <label for="respSelect">Responsibilities</label>
        <select id="respSelect" multiple size="4"></select>
      </div>
      <button class="btn btn-add" id="addRespBtn">+ Add New Responsibility</button>
    </div>

    <div class="spec-row">
      <div class="field">
        <label for="skillsSelect">Skills</label>
        <select id="skillsSelect" multiple size="4"></select>
      </div>
      <button class="btn btn-add" id="addSkillBtn">+ Add New Skill</button>
    </div>

    <div class="spec-row">
      <div class="field">
        <label for="toolsSelect">Tools</label>
        <select id="toolsSelect" multiple size="4"></select>
      </div>
      <button class="btn btn-add" id="addToolBtn">+ Add New Tool</button>
    </div>

    <div class="spec-row">
      <div class="field">
        <label for="instrSelect">Instructions</label>
        <select id="instrSelect" multiple size="4"></select>
      </div>
      <button class="btn btn-add" id="addInstrBtn">+ Add New Instruction</button>
    </div>
  </div>

  <!-- Section 3: Additional Details -->
  <div class="section">
    <div class="section-title">Additional Details</div>
    <div class="field">
      <label for="additionalInfo">Additional Information (optional)</label>
      <textarea id="additionalInfo" rows="4" placeholder="Any extra context, constraints, or behaviour notes for this agent"></textarea>
    </div>
  </div>

  <div class="actions">
    <button class="btn btn-secondary" id="cancelBtn">Cancel</button>
    <button class="btn btn-primary" id="createBtn">Generate Agent File</button>
  </div>

  <!-- Modal -->
  <div class="modal-overlay" id="modalOverlay">
    <div class="modal">
      <div class="modal-title" id="modalTitle">Add New Item</div>

      <div class="modal-field">
        <label class="required" for="modalName">Name</label>
        <input type="text" id="modalName" placeholder="Display name" />
      </div>

      <div class="modal-field">
        <label class="required" for="modalDescription">Description</label>
        <textarea id="modalDescription" rows="2" placeholder="Brief description"></textarea>
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
        <label for="modalSpecificTools">Specific Tools (comma-separated)</label>
        <input type="text" id="modalSpecificTools" placeholder="e.g. Read, Edit, Write" />
      </div>

      <div class="modal-actions">
        <button class="btn btn-secondary" id="modalCancelBtn">Cancel</button>
        <button class="btn btn-primary" id="modalSaveBtn">Save</button>
      </div>
    </div>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();

    // Spec data injected from extension
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
      populateSelect('rolesSelect', allSpecs.roles, r => r.name + ' v' + r.version);
      populateSelect('respSelect', allSpecs.responsibilities, r => r.name);
      populateSelect('skillsSelect', allSpecs.skills, s => s.name);
      populateSelect('toolsSelect', allSpecs.tools, t => t.name + ' [' + t.category + ']');
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

    // ── Modal logic ─────────────────────────────────────────
    function openModal(type) {
      currentModalType = type;
      document.getElementById('modalTitle').textContent = 'Add New ' + type.charAt(0).toUpperCase() + type.slice(1, -1);
      document.getElementById('modalName').value = '';
      document.getElementById('modalDescription').value = '';
      document.getElementById('modalSpecificTools').value = '';

      const isTool = type === 'tools';
      document.getElementById('modalCategoryField').style.display = isTool ? 'block' : 'none';
      document.getElementById('modalSpecificToolsField').style.display = isTool ? 'block' : 'none';

      document.getElementById('modalOverlay').classList.add('open');
    }

    function closeModal() {
      document.getElementById('modalOverlay').classList.remove('open');
      currentModalType = '';
    }

    document.getElementById('modalCancelBtn').addEventListener('click', closeModal);
    document.getElementById('modalOverlay').addEventListener('click', (e) => {
      if (e.target === document.getElementById('modalOverlay')) closeModal();
    });

    document.getElementById('modalSaveBtn').addEventListener('click', () => {
      const name = document.getElementById('modalName').value.trim();
      const desc = document.getElementById('modalDescription').value.trim();
      if (!name || !desc) {
        alert('Name and Description are required.');
        return;
      }

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
      if (!agentName) {
        document.getElementById('agentNameError').textContent = 'Agent name is required.';
        valid = false;
      } else {
        document.getElementById('agentNameError').textContent = '';
      }
      if (!description) {
        document.getElementById('descriptionError').textContent = 'Description is required.';
        valid = false;
      } else {
        document.getElementById('descriptionError').textContent = '';
      }
      if (!valid) return;

      const data = {
        agentName,
        description,
        model: document.getElementById('model').value,
        roles: getSelected('rolesSelect', 'roles'),
        responsibilities: getSelected('respSelect', 'responsibilities'),
        skills: getSelected('skillsSelect', 'skills'),
        tools: getSelected('toolsSelect', 'tools'),
        instructions: getSelected('instrSelect', 'instructions'),
        additionalInfo: document.getElementById('additionalInfo').value.trim()
      };

      vscode.postMessage({ command: 'createAgent', data });
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
