/**
 * SeniorOrchestrator - Master Orchestrator Agent
 *
 * Orchestrates work via task() to complete ALL tasks in a todo list until fully done.
 * You are the conductor of a symphony of specialized agents.
 *
 * Routing:
 * 1. GPT models (openai/*, github-copilot/gpt-*) → gpt.ts (GPT-5.2 optimized)
 * 2. Default (Claude, etc.) → default.ts (Claude-optimized)
 */

import type { AgentConfig } from "@opencode-ai/sdk"
import type { AgentMode, AgentPromptMetadata } from "../types"
import { isGptModel } from "../types"
import type { AvailableAgent, AvailableSkill, AvailableCategory } from "../dynamic-agent-prompt-builder"
import { buildCategorySkillsDelegationGuide } from "../dynamic-agent-prompt-builder"
import type { CategoryConfig } from "../../config/schema"
import { DEFAULT_CATEGORIES } from "../../tools/delegate-task/constants"
import { createAgentToolRestrictions } from "../../shared/permission-compat"

import { SENIOR_ORCHESTRATOR_SYSTEM_PROMPT, getDefaultSeniorOrchestratorPrompt } from "./default"
import { SENIOR_ORCHESTRATOR_GPT_SYSTEM_PROMPT, getGptSeniorOrchestratorPrompt } from "./gpt"
import {
  getCategoryDescription,
  buildAgentSelectionSection,
  buildCategorySection,
  buildSkillsSection,
  buildDecisionMatrix,
} from "./utils"

export { SENIOR_ORCHESTRATOR_SYSTEM_PROMPT, getDefaultSeniorOrchestratorPrompt } from "./default"
export { SENIOR_ORCHESTRATOR_GPT_SYSTEM_PROMPT, getGptSeniorOrchestratorPrompt } from "./gpt"
export {
  getCategoryDescription,
  buildAgentSelectionSection,
  buildCategorySection,
  buildSkillsSection,
  buildDecisionMatrix,
} from "./utils"
export { isGptModel }

const MODE: AgentMode = "primary"

export type SeniorOrchestratorPromptSource = "default" | "gpt"

/**
 * Determines which SeniorOrchestrator prompt to use based on model.
 */
export function getSeniorOrchestratorPromptSource(model?: string): SeniorOrchestratorPromptSource {
  if (model && isGptModel(model)) {
    return "gpt"
  }
  return "default"
}

export interface OrchestratorContext {
  model?: string
  availableAgents?: AvailableAgent[]
  availableSkills?: AvailableSkill[]
  userCategories?: Record<string, CategoryConfig>
}

/**
 * Gets the appropriate SeniorOrchestrator prompt based on model.
 */
export function getSeniorOrchestratorPrompt(model?: string): string {
  const source = getSeniorOrchestratorPromptSource(model)

  switch (source) {
    case "gpt":
      return getGptSeniorOrchestratorPrompt()
    case "default":
    default:
      return getDefaultSeniorOrchestratorPrompt()
  }
}

function buildDynamicOrchestratorPrompt(ctx?: OrchestratorContext): string {
  const agents = ctx?.availableAgents ?? []
  const skills = ctx?.availableSkills ?? []
  const userCategories = ctx?.userCategories
  const model = ctx?.model

  const allCategories = { ...DEFAULT_CATEGORIES, ...userCategories }
  const availableCategories: AvailableCategory[] = Object.entries(allCategories).map(([name]) => ({
    name,
    description: getCategoryDescription(name, userCategories),
  }))

  const categorySection = buildCategorySection(userCategories)
  const agentSection = buildAgentSelectionSection(agents)
  const decisionMatrix = buildDecisionMatrix(agents, userCategories)
  const skillsSection = buildSkillsSection(skills)
  const categorySkillsGuide = buildCategorySkillsDelegationGuide(availableCategories, skills)

  const basePrompt = getSeniorOrchestratorPrompt(model)

  return basePrompt
    .replace("{CATEGORY_SECTION}", categorySection)
    .replace("{AGENT_SECTION}", agentSection)
    .replace("{DECISION_MATRIX}", decisionMatrix)
    .replace("{SKILLS_SECTION}", skillsSection)
    .replace("{{CATEGORY_SKILLS_DELEGATION_GUIDE}}", categorySkillsGuide)
}

export function createSeniorOrchestratorAgent(ctx: OrchestratorContext): AgentConfig {
  const restrictions = createAgentToolRestrictions([
    "task",
    "call_kaji_agent",
  ])

  const baseConfig = {
    description:
      "Orchestrates work via task() to complete ALL tasks in a todo list until fully done. (SeniorOrchestrator - KajiFlow)",
    mode: MODE,
    ...(ctx.model ? { model: ctx.model } : {}),
    temperature: 0.1,
    prompt: buildDynamicOrchestratorPrompt(ctx),
    color: "#10B981",
    ...restrictions,
  }

  return baseConfig as AgentConfig
}
createSeniorOrchestratorAgent.mode = MODE

export const seniorOrchestratorPromptMetadata: AgentPromptMetadata = {
  category: "advisor",
  cost: "EXPENSIVE",
  promptAlias: "SeniorOrchestrator",
  triggers: [
    {
      domain: "Todo list orchestration",
      trigger: "Complete ALL tasks in a todo list with verification",
    },
    {
      domain: "Multi-agent coordination",
      trigger: "Parallel task execution across specialized agents",
    },
  ],
  useWhen: [
    "User provides a todo list path (.sisyphus/plans/{name}.md)",
    "Multiple tasks need to be completed in sequence or parallel",
    "Work requires coordination across multiple specialized agents",
  ],
  avoidWhen: [
    "Single simple task that doesn't require orchestration",
    "Tasks that can be handled directly by one agent",
    "When user wants to execute tasks manually",
  ],
  keyTrigger:
    "Todo list path provided OR multiple tasks requiring multi-agent orchestration",
}
