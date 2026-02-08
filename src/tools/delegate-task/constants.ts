import type { CategoryConfig } from "../../config/schema"

export const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  "visual-engineering": "Frontend, UI/UX, design, styling, animation",
  ultrabrain:
    "Use ONLY for genuinely hard, logic-heavy tasks. Give clear goals only, not step-by-step instructions.",
  deep: "Goal-oriented autonomous problem-solving. Thorough research before action. For hairy problems requiring deep understanding.",
  artistry:
    "Complex problem-solving with unconventional, creative approaches - beyond standard patterns",
  quick: "Trivial tasks - single file changes, typo fixes, simple modifications",
  "unspecified-low": "Tasks that don't fit other categories, low effort required",
  "unspecified-high": "Tasks that don't fit other categories, high effort required",
  writing: "Documentation, prose, technical writing",
  // New Business Categories
  "product-management": "PRDs, User Stories, Prioritization, Market Research (Strategy)",
  "solutions-engineering": "Technical integration guides, PoCs, Architecture Diagrams",
  "sales": "Sales collateral, Battlecards, ROI analysis, Pitch decks",
  "business-operations": "Internal processes, Compliance, Runbooks, Finance/Recruiting",
}

export const DEFAULT_CATEGORIES: Record<string, CategoryConfig> = {
  "visual-engineering": {
    description: CATEGORY_DESCRIPTIONS["visual-engineering"],
    model: "anthropic/claude-opus-4-6", // Fallback chain handles specific model
    reasoningEffort: "medium",
  },
  ultrabrain: {
    description: CATEGORY_DESCRIPTIONS.ultrabrain,
    model: "openai/gpt-5.2-codex",
    reasoningEffort: "high",
  },
  deep: {
    description: CATEGORY_DESCRIPTIONS.deep,
    model: "openai/gpt-5.2-codex",
    reasoningEffort: "medium",
  },
  artistry: {
    description: CATEGORY_DESCRIPTIONS.artistry,
    model: "google/gemini-3-pro-preview",
    temperature: 0.7,
  },
  quick: {
    description: CATEGORY_DESCRIPTIONS.quick,
    model: "anthropic/claude-haiku-4-5",
  },
  "unspecified-low": {
    description: CATEGORY_DESCRIPTIONS["unspecified-low"],
    model: "anthropic/claude-sonnet-4-5-20250929",
  },
  "unspecified-high": {
    description: CATEGORY_DESCRIPTIONS["unspecified-high"],
    model: "anthropic/claude-opus-4-6",
  },
  writing: {
    description: CATEGORY_DESCRIPTIONS.writing,
    model: "anthropic/claude-sonnet-4-5-20250929",
  },
  // New Business Categories
  "product-management": {
    description: CATEGORY_DESCRIPTIONS["product-management"],
    model: "anthropic/claude-opus-4-6",
    reasoningEffort: "high",
  },
  "solutions-engineering": {
    description: CATEGORY_DESCRIPTIONS["solutions-engineering"],
    model: "anthropic/claude-sonnet-4-5-20250929",
    reasoningEffort: "medium",
  },
  "sales": {
    description: CATEGORY_DESCRIPTIONS.sales,
    model: "anthropic/claude-sonnet-4-5-20250929",
    reasoningEffort: "medium",
  },
  "business-operations": {
    description: CATEGORY_DESCRIPTIONS["business-operations"],
    model: "anthropic/claude-sonnet-4-5-20250929",
    reasoningEffort: "medium",
  },
}

export const PLAN_AGENT_NAMES = ["plan", "planner"]
export const PLAN_AGENT_IDS = ["plan", "planner"]

export function isPlanAgent(agent: string): boolean {
  return PLAN_AGENT_NAMES.includes(agent)
}

export function buildPlanAgentSystemPrepend(agent: string): string {
  if (isPlanAgent(agent)) {
    return `You are executing a task as the Planner agent. Focus on generating or updating the plan in .kajiflow/work/plans/.\n`
  }
  return ""
}

export const CATEGORY_PROMPT_APPENDS: Record<string, string> = {
  // Empty for now, logic is handled in dynamic-agent-prompt-builder for new agents
}
