# KajiFlow Migration Guide (v3.0)

This guide documents the major refactoring from "Oh-My-OpenCode" to "KajiFlow" (v3.0).

## 🚨 Breaking Changes

### 1. Agent Renaming (Enterprise Terminology)
All internal agent IDs and configuration keys have been renamed to descriptive, enterprise-friendly terms.

| Legacy Name | **New Name** | Role |
| :--- | :--- | :--- |
| `sisyphus` | **`orchestrator`** | Primary Task Orchestrator |
| `atlas` | **`senior-orchestrator`** | Advanced Orchestrator (Claude Sonnet) |
| `prometheus` | **`planner`** | Strategic Planner |
| `hephaestus` | **`developer`** | Autonomous Implementer |
| `metis` | **`requirements-analyst`** | Pre-planning Analyst |
| `momus` | **`reviewer`** | Plan Validator/Critic |
| `librarian` | **`researcher`** | Documentation Search |
| `explore` | **`context-finder`** | Codebase Grep/Search |
| `oracle` | **`advisor`** | High-level Consulting |
| `multimodal-looker` | **`vision-analyst`** | Image/PDF Analysis |

**Automatic Migration:**
The plugin automatically migrates legacy keys in `.kajiflow/kajiflow.json` at runtime. However, we recommend updating your config files to use the new keys.

### 2. Removed Functionality
To streamline the codebase, the following features have been **removed**:

*   **Standalone CLI**: The `kajiflow` binary (and `install`/`doctor` commands) has been removed. The plugin must be loaded directly by OpenCode.
*   **Sisyphus Junior**: This subagent has been retired. Delegation now defaults to the more robust `developer` agent.
*   **MCP OAuth**: Built-in OAuth handling for MCP servers has been removed. Authentication must be handled externally or via `SKIP_AUTH`.
*   **Auto-Update Checker**: The startup check for new versions has been removed.

### 3. Configuration Directory
*   Old: `.opencode/oh-my-opencode.json`
*   New: `.kajiflow/kajiflow.json`

## Migration Steps

1.  **Rename Directory**: Rename your project's `.opencode` folder to `.kajiflow`.
2.  **Update Config**: Open `.kajiflow/kajiflow.json` and update agent keys (e.g., change `"sisyphus": { ... }` to `"orchestrator": { ... }`).
3.  **Update Imports**: If you have custom scripts importing KajiFlow types, update package imports from `oh-my-opencode` to `kajiflow`.
