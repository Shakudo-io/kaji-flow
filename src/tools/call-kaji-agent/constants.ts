export const ALLOWED_SUBAGENTS = [
  "researcher",
  "advisor",
  "developer",
  "requirements-analyst",
  "reviewer",
  "context-finder",
  "vision-analyst",
  "planner",
  "product-manager",
  "solutions-architect",
  "sales-engineer",
  "bizops-manager",
]

export const CALL_KAJI_AGENT_DESCRIPTION = `Spawn specialist subagents. run_in_background REQUIRED (true=async with task_id, false=sync).
Use this tool to gather context or documentation BEFORE starting work.
- context-finder: Fast grep/glob/ast-grep in codebase.
- researcher: External documentation/GitHub search.
- advisor: High-level architectural consultation.
- vision-analyst: Analyze images/PDFs.
- product-manager: PRDs, User Stories, Strategy.
- solutions-architect: Integration guides, PoCs.
- sales-engineer: Battlecards, Sales collateral.
- bizops-manager: Process documentation, Compliance.
`
