# Agent Renaming Migration Plan

**Status:** Planned
**Target Version:** 3.4.0

## Objective
Rename all agents to enterprise-friendly terms while maintaining backward compatibility for existing user configurations.

## 1. Mapping Table

| Legacy ID | **New ID** | Role |
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

## 2. Execution Steps

### Phase 1: Compatibility Layer (Safety First)
1.  **Update `src/shared/migration/agent-names.ts`**:
    *   Add mappings from Legacy IDs (`sisyphus`, `hephaestus`, etc.) to New IDs (`orchestrator`, `developer`).
    *   Ensure `migrateAgentNames` function correctly handles the transition.
2.  **Update `src/plugin-handlers/config-handler.ts`**:
    *   Ensure configuration loading pipeline applies the migration *before* usage.

### Phase 2: Codebase Refactoring
3.  **Rename Source Files**:
    *   `src/agents/sisyphus.ts` → `src/agents/orchestrator.ts`
    *   `src/agents/hephaestus.ts` → `src/agents/developer.ts`
    *   `src/agents/prometheus/` → `src/agents/planner/`
    *   `src/agents/atlas/` → `src/agents/senior-orchestrator/`
    *   ...and so on for all 10 agents.
4.  **Update Config Schema**:
    *   Modify `src/config/schema.ts` to use new keys (e.g., `orchestrator` instead of `sisyphus`).
    *   Update `KajiFlowConfigSchema` definitions.
5.  **Update Hooks**:
    *   Rename `prometheus-md-only` hook to `planner-md-only`.
    *   Update `atlas` hook (now `senior-orchestrator` hook?) logic.
    *   Update `keyword-detector` to recognize new agent names.
6.  **Update Delegation Logic**:
    *   Update `src/tools/delegate-task/` to default to `developer` instead of `hephaestus`.
    *   Update `src/shared/agent-tool-restrictions.ts`.

### Phase 3: Cleanup & Docs
7.  **Documentation**:
    *   Update `docs/AGENTS.md`.
    *   Update `docs/ARCHITECTURE_V2.md`.
8.  **Verification**:
    *   Run `bun run build`.
    *   Run `bun test`.
