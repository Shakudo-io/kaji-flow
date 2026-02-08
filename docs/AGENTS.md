# AGENTS KNOWLEDGE BASE

**Generated:** Sun Feb  8 02:42:53 UTC 2026
**Version:** 3.0 (KajiFlow)

## OVERVIEW

10 specialized AI agents for multi-model orchestration.
Each agent has a unique role, prompt strategy, and model fallback chain.

**Primary Agents** (respect UI model selection):
- **Orchestrator** (Default entry point)
- **Senior Orchestrator** (Advanced reasoning)
- **Planner** (Strategic planning)

**Subagents** (use own fallback chains):
- **Developer**, **Advisor**, **Researcher**, **Context Finder**, **Vision Analyst**, **Requirements Analyst**, **Reviewer**

## STRUCTURE

```
agents/
├── orchestrator.ts             # Main Orchestrator (formerly Sisyphus)
├── senior-orchestrator/        # Advanced Orchestrator (formerly Atlas)
├── planner/                    # Strategic Planner (formerly Prometheus)
├── developer.ts                # Autonomous Implementer (formerly Hephaestus)
├── advisor.ts                  # Consultant (formerly Oracle)
├── researcher.ts               # Documentation Search (formerly Librarian)
├── context-finder.ts           # Codebase Grep (formerly Explore)
├── vision-analyst.ts           # Image/PDF Analysis (formerly Multimodal Looker)
├── requirements-analyst.ts     # Pre-planning Analysis (formerly Metis)
├── reviewer.ts                 # Plan Validation (formerly Momus)
├── dynamic-agent-prompt-builder.ts
└── index.ts
```

## AGENT CONFIGURATION (DEFAULTS)

| Agent | Legacy Name | Default Model | Role |
|-------|-------------|---------------|------|
| **Orchestrator** | Sisyphus | `anthropic/claude-opus-4-6` | Primary task manager. Coordinates delegation. |
| **Developer** | Hephaestus | `openai/gpt-5.2-codex` | "The Legitimate Craftsman". Writes code autonomously. |
| **Senior Orchestrator** | Atlas | `anthropic/claude-sonnet-4-5` | Fast, high-context orchestration loop. |
| **Planner** | Prometheus | `anthropic/claude-opus-4-6` | Creates strategic plans (.kajiflow/work/plans). |
| **Requirements Analyst** | Metis | `anthropic/claude-opus-4-6` | Analyzes requirements before planning. |
| **Reviewer** | Momus | `openai/gpt-5.2` | Critiques plans for flaws. |
| **Advisor** | Oracle | `google/gemini-3-pro` | High-context consulting & debugging. |
| **Researcher** | Librarian | `anthropic/claude-sonnet-4-5` | Searches external docs and GitHub. |
| **Context Finder** | Explore | `anthropic/claude-sonnet-4-5` | Fast codebase context gathering. |
| **Vision Analyst** | Multimodal Looker | `google/gemini-3-pro` | Analyzes images and PDFs. |

## TOOL RESTRICTIONS

| Agent | Denied Tools |
|-------|-------------|
| Advisor | write, edit, task (implementation) |
| Researcher | write, edit, task |
| Context Finder | write, edit, task |
| Vision Analyst | write, edit, task |
| Senior Orchestrator | call_kaji_agent |

## HOW TO ADD
1. Create `src/agents/my-agent.ts` exporting factory + metadata.
2. Add to `agentSources` in `src/agents/utils.ts`.
3. Update `KajiFlowConfigSchema` in `src/config/schema.ts`.
