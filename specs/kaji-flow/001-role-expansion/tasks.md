# Implementation Tasks: KajiFlow Role Expansion

## Phase 1: Core Agent Definitions
- [ ] Create `src/agents/product-manager.ts` with PM persona and prompt
- [ ] Create `src/agents/solutions-architect.ts` with SA persona and prompt
- [ ] Create `src/agents/sales-engineer.ts` with Sales persona and prompt
- [ ] Create `src/agents/bizops-manager.ts` with BizOps persona and prompt

## Phase 2: Configuration & Wiring
- [ ] Update `src/agents/types.ts` to include new agent names in `BuiltinAgentName`
- [ ] Update `src/config/schema.ts` to add new agents to `KajiFlowConfigSchema`
- [ ] Update `src/shared/model-requirements.ts` with default models (Opus/Gemini)
- [ ] Update `src/agents/utils.ts` to register new agents in `agentSources`
- [ ] Update `src/agents/index.ts` exports

## Phase 3: Routing & Permissions
- [ ] Update `src/shared/agent-tool-restrictions.ts` (Allow Context Finder, Deny Edit)
- [ ] Update `src/agents/dynamic-agent-prompt-builder.ts` metadata
- [ ] Update `src/tools/call-kaji-agent/constants.ts` to allow calling these subagents

## Phase 4: Verification
- [ ] Run `bun run build` to verify types and schema
- [ ] Run `bun test` to ensure no regression
- [ ] Manual verification: Simulate a PM request
