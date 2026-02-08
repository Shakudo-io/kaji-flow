export const ALLOWED_SUBAGENTS = [
  "researcher",
  "advisor",
  "developer",
  "requirements-analyst",
  "reviewer",
  "context-finder",
  "vision-analyst",
  "planner",
]

export const CALL_KAJI_AGENT_DESCRIPTION = `Spawn context-finder/researcher agent. run_in_background REQUIRED (true=async with task_id, false=sync).
Use this tool to gather context or documentation BEFORE starting work.
- context-finder: Fast grep/glob/ast-grep in codebase.
- researcher: External documentation/GitHub search.
- advisor: High-level architectural consultation.
- vision-analyst: Analyze images/PDFs in the repository.
`
