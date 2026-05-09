# Usage Guide

Step-by-step workflow for the AI Agent Management Studio extension.

## Prerequisites

- VS Code 1.85.0 or later installed
- A workspace folder open in VS Code
- The extension installed (from VSIX or Extension Development Host)

## Installing Agents

### Step 1 — Open the Command Palette

Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac).

### Step 2 — Run the Command

Type **AI Agents: Install Agent Suite** and press `Enter`.

### Step 3 — Select Agent Groups

A QuickPick dialog appears with six options. Use `Space` to select multiple groups:

- **Development Agents** — full SDLC workflow (dev, lead, PR, requirement analysis, review)
- **Quality Engineering Agents** — testing and performance evaluation
- **Migration Agents** — rule and schema migrations
- **Governance Agents** — compliance and policy auditing
- **All Agents** — install every available agent
- **Create Custom Agent** — open the Custom Agent Builder webview

Press `Enter` to confirm your selection.

### Step 4 — Select Individual Agents

A second QuickPick shows all agents within your selected groups, pre-selected. Deselect any you do not want. Press `Enter` to install.

### Step 5 — Review the Summary

A notification appears:

```
AI Agent Suite: 5 agent(s) installed, 2 already existed (skipped) → .github/agents/
```

Agents are now available in `.github/agents/` in your workspace root.

## Creating a Custom Agent

### Step 1 — Open the Builder

Follow Steps 1-2 above, then select **Create Custom Agent** from the group picker.

### Step 2 — Fill in Basic Information

Enter an **Agent Name** and **Description**. Optionally select a different **Model**.

### Step 3 — Configure the Agent

In the **Agent Configuration** section, use the multi-select dropdowns to choose:

- Roles (hold `Ctrl`/`Cmd` to multi-select)
- Responsibilities
- Skills
- Tools
- Instructions

Click **+ Add New [Type]** to define a custom spec not already in the list.

### Step 4 — Add Additional Details

Optionally enter any extra context in the **Additional Information** textarea.

### Step 5 — Generate

Click **Create Agent**. The extension:

1. Generates a `.agent.md` file in `.github/agents/`
2. Saves any new specs to `.github/agent-specs/`
3. Shows a notification with an **Open File** action

## File Locations

| Artefact | Location |
|---|---|
| Installed agents | `.github/agents/*.agent.md` |
| Custom specs | `.github/agent-specs/*.json` |
| Extension resources | `<extensionPath>/resources/` |

## Tips

- Run the command multiple times safely — existing files are never overwritten
- Add new spec types via the modal; they persist across VS Code sessions
- All agent markdown files are plain text — edit them directly after generation
- The `.github/agent-specs/` folder can be committed to version control to share custom specs with your team
