# Custom Agent Guide

This guide explains how to use the Custom Agent Builder to design and generate your own AI agent markdown files.

## Opening the Builder

1. Open the Command Palette (`Ctrl+Shift+P`)
2. Run **AI Agents: Install Agent Suite**
3. Select **Create Custom Agent** from the group picker

## Form Sections

### Section 1 — Basic Information

| Field | Required | Description |
|---|---|---|
| Agent Name | Yes | Human-readable name (e.g. `SecurityScanAgent`). Used as the file slug. |
| Description | Yes | What this agent does and when to trigger it. Appears in the agent frontmatter. |
| Model | No | Default is `Claude Sonnet 4.5 (copilot)`. Choose a different model if needed. |

### Section 2 — Agent Configuration

Each dropdown is pre-populated from the JSON spec files bundled with the extension, merged with any custom specs you have previously saved.

Hold `Ctrl` (Windows/Linux) or `Cmd` (Mac) to select multiple items from each list.

| Dropdown | Source File |
|---|---|
| Roles | `resources/roles.json` + `.github/agent-specs/roles.json` |
| Responsibilities | `resources/responsibilities.json` + `.github/agent-specs/responsibilities.json` |
| Skills | `resources/skills.json` + `.github/agent-specs/skills.json` |
| Tools | `resources/tools.json` + `.github/agent-specs/tools.json` |
| Instructions | `resources/instructions.json` + `.github/agent-specs/instructions.json` |

#### Adding a New Spec

Click **+ Add New [Type]** next to any dropdown to open a modal:

1. Fill in **Name** and **Description** (required)
2. For Tools only: select a **Category** and optionally provide **Specific Tools** (comma-separated)
3. Click **Save**

The new spec appears immediately in the dropdown and is persisted to `.github/agent-specs/<type>.json`.

### Section 3 — Additional Details

Use the **Additional Information** textarea for any extra context, constraints, or behaviour notes that should appear in the generated agent file.

## Generated File Format

```markdown
---
name: <slug>
description: <description>
model: <model-id>
tools: <comma-separated tool names>
---

# <Agent Name>

<description>

## Roles
- **<Role Name>** (v<version>): <description>

## Responsibilities
- <description>

## Skills
- <name>

## Instructions
- <description>

## Additional Information
<additionalInfo>
```

Files are saved to `.github/agents/<slug>.agent.md`.

## Troubleshooting

**Dropdowns are empty** — ensure the extension is installed correctly and `resources/` was not excluded from the VSIX. Try reinstalling the extension.

**"Agent name is required"** — fill in both Agent Name and Description before clicking Generate.

**Modal does not save** — Name and Description are required in the modal. Both fields must be non-empty.

**Custom specs not appearing after restart** — check that `.github/agent-specs/` exists in your workspace root and contains valid JSON files.

## Examples

### Minimal Custom Agent

- Name: `DatabaseMigrationHelper`
- Description: `Assists with writing and validating database migration scripts for PostgreSQL.`
- Skills: SQL/NoSQL Databases, Git/Version Control
- Tools: Read, Edit, Execute
- Instructions: Write clean and maintainable code, Implement comprehensive error handling

### Full Custom Agent

Select all relevant roles, responsibilities, skills, tools, and instructions. Use Additional Information to add specific constraints such as:

```
Only operate on files within the /migrations directory.
Never DROP tables — flag destructive operations for human review.
Always generate a rollback script alongside the forward migration.
```
