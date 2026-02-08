/**
 * Planner Planner System Prompt
 *
 * Named after the Titan who gave fire (knowledge/foresight) to humanity.
 * Planner operates in INTERVIEW/CONSULTANT mode by default:
 * - Interviews user to understand what they want to build
 * - Uses librarian/explore agents to gather context and make informed suggestions
 * - Provides recommendations and asks clarifying questions
 * - ONLY generates work plan when user explicitly requests it
 *
 * Transition to PLAN GENERATION mode when:
 * - User says "Make it into a work plan!" or "Save it as a file"
 * - Before generating, consults Metis for missed questions/guardrails
 * - Optionally loops through Momus for high-accuracy validation
 *
 * Can write .md files only (enforced by planner-md-only hook).
 */

import { PLANNER_IDENTITY_CONSTRAINTS } from "./identity-constraints"
import { PLANNER_INTERVIEW_MODE } from "./interview-mode"
import { PLANNER_PLAN_GENERATION } from "./plan-generation"
import { PLANNER_HIGH_ACCURACY_MODE } from "./high-accuracy-mode"
import { PLANNER_PLAN_TEMPLATE } from "./plan-template"
import { PLANNER_BEHAVIORAL_SUMMARY } from "./behavioral-summary"

/**
 * Combined Planner system prompt.
 * Assembled from modular sections for maintainability.
 */
export const PLANNER_SYSTEM_PROMPT = `${PLANNER_IDENTITY_CONSTRAINTS}
${PLANNER_INTERVIEW_MODE}
${PLANNER_PLAN_GENERATION}
${PLANNER_HIGH_ACCURACY_MODE}
${PLANNER_PLAN_TEMPLATE}
${PLANNER_BEHAVIORAL_SUMMARY}`

/**
 * Planner planner permission configuration.
 * Allows write/edit for plan files (.md only, enforced by planner-md-only hook).
 * Question permission allows agent to ask user questions via OpenCode's QuestionTool.
 */
export const PLANNER_PERMISSION = {
  edit: "allow" as const,
  bash: "allow" as const,
  webfetch: "allow" as const,
  question: "allow" as const,
}

// Re-export individual sections for granular access
export { PLANNER_IDENTITY_CONSTRAINTS } from "./identity-constraints"
export { PLANNER_INTERVIEW_MODE } from "./interview-mode"
export { PLANNER_PLAN_GENERATION } from "./plan-generation"
export { PLANNER_HIGH_ACCURACY_MODE } from "./high-accuracy-mode"
export { PLANNER_PLAN_TEMPLATE } from "./plan-template"
export { PLANNER_BEHAVIORAL_SUMMARY } from "./behavioral-summary"

import type { AgentConfig } from "@opencode-ai/sdk"
import type { AgentMode } from "../types"

const MODE: AgentMode = "primary"

/**
 * Creates the Planner agent configuration.
 */
export function createPlannerAgent(model?: string): AgentConfig {
  return {
    description: "Consultant & Planner. Interviews you, gathers context, and creates .sisyphus/plan.md. (Planner - KajiFlow)",
    mode: MODE,
    model,
    prompt: PLANNER_SYSTEM_PROMPT,
    color: "#8B5CF6", // Violet
    permission: PLANNER_PERMISSION,
  } as AgentConfig
}
createPlannerAgent.mode = MODE
