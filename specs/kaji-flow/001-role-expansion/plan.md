# Implementation Plan: KajiFlow Role Expansion

## Architecture

### 1. New Agent Definitions (`src/agents/`)
We will create 4 new agent files, each exporting a factory function and metadata.
- `src/agents/product-manager.ts`
- `src/agents/solutions-architect.ts`
- `src/agents/sales-engineer.ts`
- `src/agents/bizops-manager.ts`

Each will define:
- `PROMPT`: A specialized system prompt defining the persona.
- `METADATA`: Category, tool restrictions (read-only code access), and triggers.

### 2. Configuration Updates
- **Schema**: Update `src/config/schema.ts` to include `product-manager`, `solutions-architect`, etc. in `KajiFlowConfigSchema`.
- **Model Requirements**: Update `src/shared/model-requirements.ts` to assign high-reasoning models (Claude Opus / Gemini Pro) to these roles.
- **Utils**: Update `src/agents/utils.ts` to register the new agents in `agentSources`.

### 3. Orchestrator Routing
- Update `src/agents/dynamic-agent-prompt-builder.ts` to include the new agents in the delegation table.
- Update `src/agents/types.ts` to add them to `BuiltinAgentName`.

### 4. Tool Permissions
- Update `src/shared/agent-tool-restrictions.ts` to allow `context-finder` (grep) but deny `edit`/`write` for these new roles (unless explicitly overridden).

## Execution Strategy
We will implement the agents first, then the wiring (utils/schema), then the prompt updates.
