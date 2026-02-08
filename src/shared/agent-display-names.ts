/**
 * Agent config keys to display names mapping.
 * Config keys are lowercase (e.g., "orchestrator", "senior-orchestrator").
 * Display names include suffixes for UI/logs (e.g., "Orchestrator (Ultraworker)").
 */
export const AGENT_DISPLAY_NAMES: Record<string, string> = {
  orchestrator: "Orchestrator (Ultraworker)",
  "senior-orchestrator": "SeniorOrchestrator (Plan Execution Orchestrator)",
  planner: "Planner (Plan Builder)",
  reviewer: "Reviewer (Plan Reviewer)",
  advisor: "advisor",
  researcher: "researcher",
  "context-finder": "context-finder",
  "multimodal-looker": "multimodal-looker",
}

/**
 * Get display name for an agent config key.
 * Uses case-insensitive lookup for backward compatibility.
 * Returns original key if not found.
 */
export function getAgentDisplayName(configKey: string): string {
  // Try exact match first
  const exactMatch = AGENT_DISPLAY_NAMES[configKey]
  if (exactMatch !== undefined) return exactMatch
  
  // Fall back to case-insensitive search
  const lowerKey = configKey.toLowerCase()
  for (const [k, v] of Object.entries(AGENT_DISPLAY_NAMES)) {
    if (k.toLowerCase() === lowerKey) return v
  }
  
  // Unknown agent: return original key
  return configKey
}