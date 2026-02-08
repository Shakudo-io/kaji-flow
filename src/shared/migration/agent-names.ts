/**
 * Maps legacy agent names to new enterprise-friendly names.
 * Used for config migration and backward compatibility.
 */
export const LEGACY_AGENT_MAPPING: Record<string, string> = {
  // Core Agents
  sisyphus: "orchestrator",
  atlas: "senior-orchestrator",
  prometheus: "planner",
  hephaestus: "developer",
  
  // Specialists
  metis: "requirements-analyst",
  momus: "reviewer",
  librarian: "researcher",
  explore: "context-finder",
  oracle: "advisor",
  "multimodal-looker": "vision-analyst",
  
  // Legacy/Removed (map to closest equivalent or ignore)
  "sisyphus-junior": "developer", 
}

/**
 * Migrates a legacy agent name to its new name.
 * If the name is already current or unknown, returns it as-is.
 */
export function migrateAgentName(name: string): string {
  const lowerName = name.toLowerCase()
  return LEGACY_AGENT_MAPPING[lowerName] ?? name
}

/**
 * Migrates a configuration object keys from legacy to new names.
 */
export function migrateConfigKeys(config: Record<string, any>): Record<string, any> {
  const newConfig: Record<string, any> = {}
  for (const [key, value] of Object.entries(config)) {
    const newKey = migrateAgentName(key)
    newConfig[newKey] = value
  }
  return newConfig
}

export const BUILTIN_AGENT_NAMES = Object.values(LEGACY_AGENT_MAPPING)
