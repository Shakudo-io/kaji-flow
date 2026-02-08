import type { AgentConfig } from "@opencode-ai/sdk"

const EXPLORATION_AGENT_DENYLIST = {
  write: "deny",
  edit: "deny",
  task: "deny",
  "task_*": "deny",
  // @ts-ignore
  call_kaji_agent: "deny",
  "call_kaji_agent_*": "deny",
} as const as any

// Advisor, Researcher, Context Finder, Vision Analyst can't implement or delegate
const SPECIALIST_AGENT_DENYLIST = {
  write: "deny",
  edit: "deny",
  task: "deny", // Cannot delegate (only Orchestrator delegates)
  "task_*": "deny",
  // @ts-ignore
  call_kaji_agent: "deny",
  "call_kaji_agent_*": "deny",
} as const as unknown as Partial<AgentConfig["permission"]>

// Business Agents: Can READ codebase, but NOT write code or delegate tasks
// (They generate documents via text output, which Orchestrator can save)
// OR should we allow them to write markdown?
// The Spec said "Output: Structured markdown documents".
// If they can't write, they output text and Orchestrator writes it?
// Or we give them write permission?
// Spec 3.4: "They should generally NOT have write access... unless explicitly required... e.g. creating a new markdown file".
// Let's be safe: Deny 'edit' (modifying existing code), Allow 'write' (creating new docs)?
// But 'write' tool overwrites.
// Let's DENY write/edit for now. They output text, Orchestrator (or Developer) saves it.
// Or we allow 'write' but rely on 'write-existing-file-guard' hook.
// Let's stick to DENY to prevent accidental code damage.

const BUSINESS_AGENT_DENYLIST = {
  write: "deny",
  edit: "deny",
  task: "deny",
  "task_*": "deny",
  // @ts-ignore
  call_kaji_agent: "deny",
  "call_kaji_agent_*": "deny",
} as const as any

export const AGENT_RESTRICTIONS: Record<string, any> = {
  advisor: SPECIALIST_AGENT_DENYLIST,
  researcher: SPECIALIST_AGENT_DENYLIST,
  "context-finder": EXPLORATION_AGENT_DENYLIST,
  "vision-analyst": {
    ...SPECIALIST_AGENT_DENYLIST,
    // Vision analyst needs to read files? Yes.
    // Deny 'look_at' for itself? No, it uses it? No, it IS the vision agent.
    // It might use 'look_at' tool if provided.
  },
  "product-manager": BUSINESS_AGENT_DENYLIST,
  "solutions-architect": BUSINESS_AGENT_DENYLIST,
  "sales-engineer": BUSINESS_AGENT_DENYLIST,
  "bizops-manager": BUSINESS_AGENT_DENYLIST,
  "senior-orchestrator": {
    // @ts-ignore
  call_kaji_agent: "deny",
    "call_kaji_agent_*": "deny",
  },
  planner: {
     // @ts-ignore
  call_kaji_agent: "deny",
     "call_kaji_agent_*": "deny",
  },
}

export function getAgentToolRestrictions(
  agentName: string
): any {
  return AGENT_RESTRICTIONS[agentName] || {}
}
