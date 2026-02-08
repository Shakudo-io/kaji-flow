import type { BuildSystemContentInput } from "./types"
import { buildPlanAgentSystemPrepend, isPlanAgent } from "./constants"

/**
 * Build the system content to inject into the agent prompt.
 * Combines skill content, category prompt append, and plan agent system prepend.
 */
export function buildSystemContent(input: BuildSystemContentInput): string | undefined {
  const {
    skillContent,
    categoryPromptAppend,
    agentName,
  } = input

  const agent = agentName || ""
  const planAgentPrepend = isPlanAgent(agent)
    ? buildPlanAgentSystemPrepend(agent)
    : ""

  if (!skillContent && !categoryPromptAppend && !planAgentPrepend) {
    return undefined
  }

  const parts: string[] = []

  if (planAgentPrepend) {
    parts.push(planAgentPrepend)
  }

  if (skillContent) {
    parts.push(skillContent)
  }

  if (categoryPromptAppend) {
    parts.push(categoryPromptAppend)
  }

  return parts.join("\n\n") || undefined
}
