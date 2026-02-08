import type { AgentPromptMetadata, AgentCategory, BuiltinAgentName } from "./types"
import { productManagerPromptMetadata } from "./product-manager"
import { solutionsArchitectPromptMetadata } from "./solutions-architect"
import { salesEngineerPromptMetadata } from "./sales-engineer"
import { bizOpsManagerPromptMetadata } from "./bizops-manager"
import { advisorPromptMetadata } from "./advisor"
import { researcherPromptMetadata } from "./researcher"
import { contextFinderPromptMetadata } from "./context-finder"
import { visionAnalystPromptMetadata } from "./vision-analyst"

export interface AvailableAgent {
  name: string
  description: string
  metadata?: AgentPromptMetadata
}

export interface AvailableTool {
  name: string
  description: string
  category?: string
}

export interface AvailableSkill {
  name: string
  description: string
  location?: "plugin" | "user" | "project"
}

export interface AvailableCategory {
  name: string
  description: string
}

export function categorizeTools(tools: string[]): AvailableTool[] {
  // Simple categorization based on tool name prefixes or known tools
  return tools.map((name) => {
    let category = "utility"
    if (name.startsWith("git")) category = "git"
    else if (name.startsWith("file") || name === "read" || name === "write" || name === "edit")
      category = "filesystem"
    else if (name.includes("search") || name.includes("find") || name === "grep" || name === "glob")
      category = "search"
    else if (name.includes("test") || name === "lsp_diagnostics") category = "testing"
    return { name, description: "", category }
  })
}

export function buildKeyTriggersSection(
  agents: AvailableAgent[],
  skills: AvailableSkill[]
): string {
  const triggers = agents
    .filter((a) => a.metadata?.keyTrigger)
    .map((a) => `- ${a.metadata!.keyTrigger}`)

  if (triggers.length === 0) return ""

  return `### Key Triggers
${triggers.join("\n")}`
}

export function buildToolSelectionTable(
  agents: AvailableAgent[],
  tools: AvailableTool[],
  skills: AvailableSkill[]
): string {
  return ""
}

export function buildContextFinderSection(agents: AvailableAgent[]): string {
  const agent = agents.find((a) => a.name === "context-finder")
  if (!agent) return ""
  return `### Context Gathering (Internal)
Use **Context Finder** (Explore) agent for fast codebase searching (grep, glob, AST).
It runs in background parallel to your work.`
}

export function buildResearcherSection(agents: AvailableAgent[]): string {
  const agent = agents.find((a) => a.name === "researcher")
  if (!agent) return ""
  return `### Research (External)
Use **Researcher** (Librarian) agent for searching documentation, GitHub issues, and web resources.
It runs in background parallel to your work.`
}

export function buildCategorySkillsDelegationGuide(
  categories: AvailableCategory[],
  skills: AvailableSkill[]
): string {
  if (categories.length === 0) return ""
  
  const categoryList = categories.map(c => `- **${c.name}**: ${c.description}`).join("\n")
  
  // Highlight user-installed skills
  const userSkills = skills.filter(s => s.location !== "plugin")
  const skillHighlight = userSkills.length > 0 
    ? `**⚡ YOUR SKILLS (PRIORITY)**: ${userSkills.map(s => s.name).slice(0, 8).join(", ")} ${userSkills.length > 8 ? `(+${userSkills.length - 8} more)` : ""}`
    : ""

  return `### Category + Skills Delegation System

**task() combines categories and skills for optimal task execution.**

#### Available Categories (Domain-Optimized Models)

${categoryList}

${skillHighlight}

> **CRITICAL**: Ignoring user-installed skills when they match the task domain is a failure.
> The user installed these skills for a reason — USE THEM when the task overlaps with their domain.

**Default Bias: DELEGATE. WORK YOURSELF ONLY WHEN IT IS SUPER SIMPLE.**`
}

export function buildDelegationTable(agents: AvailableAgent[]): string {
  // Aggregate triggers from all agents
  const rows: string[] = []
  
  // Sort agents: Specialists first
  const sortedAgents = [...agents].sort((a, b) => {
    const catA = a.metadata?.category || "utility"
    const catB = b.metadata?.category || "utility"
    if (catA === "specialist" && catB !== "specialist") return -1
    if (catA !== "specialist" && catB === "specialist") return 1
    return 0
  })

  for (const agent of sortedAgents) {
    if (!agent.metadata?.triggers) continue
    for (const trigger of agent.metadata.triggers) {
      rows.push(`| ${trigger.domain} | **${agent.name}** | ${trigger.trigger} |`)
    }
  }

  if (rows.length === 0) return ""

  return `### Delegation Table:

| Domain | Delegate To | Trigger |
|--------|-------------|---------|
${rows.join("\n")}`
}

export function buildAdvisorSection(agents: AvailableAgent[]): string {
  const agent = agents.find((a) => a.name === "advisor")
  if (!agent) return ""
  return `### Consultation
If you are stuck, facing a complex architectural decision, or debugging a hard issue, consult the **Advisor** (Oracle).
`
}

export function buildHardBlocksSection(): string {
  return `## Hard Blocks (NEVER violate)

| Constraint | No Exceptions |
|------------|---------------|
| Type error suppression (\`as any\`, \`@ts-ignore\`) | Never |
| Commit without explicit request | Never |
| Speculate about unread code | Never |
| Leave code in broken state after failures | Never |`
}

export function buildAntiPatternsSection(): string {
  return `## Anti-Patterns (BLOCKING violations)

| Category | Forbidden |
|----------|-----------|
| **Type Safety** | \`as any\`, \`@ts-ignore\`, \`@ts-expect-error\` |
| **Error Handling** | Empty catch blocks \`catch(e) {}\` |
| **Testing** | Deleting failing tests to "pass" |
| **Search** | Firing agents for single-line typos or obvious syntax errors |
| **Debugging** | Shotgun debugging, random changes |`
}

export function formatCustomSkillsBlock(rows: string[], skills: AvailableSkill[], prefix = ""): string {
  if (rows.length === 0) return ""
  
  return `
${prefix} Custom Skills (Your Priority):
${rows.join("\n")}`
}
