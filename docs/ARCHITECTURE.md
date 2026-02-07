# Oh-My-OpenCode Architecture

## 1. Overview & Philosophy

Oh-My-OpenCode (OMO) is an "OS for Agents" built as an OpenCode plugin. Its core design philosophy is the **Separation of Planning and Execution**, aiming to solve context pollution and goal drift in long-running tasks.

- **Planning (Prometheus)**: Pure strategy, no execution. Creates immutable plans.
- **Execution (Atlas)**: Pure orchestration, no improvisation. Executes plans via delegation.
- **Orchestration (Sisyphus)**: The user-facing interface that routes between planning and execution.

## 2. High-Level Architecture

```mermaid
flowchart TD
    User[User Request] --> Sisyphus[Sisyphus<br>(Interface Agent)]
    
    subgraph Planning_Phase [Phase 1: Planning]
        Sisyphus -- "@plan" --> Prometheus[Prometheus<br>(Planner)]
        Prometheus --> Metis[Metis<br>(Consultant)]
        Metis --> Prometheus
        Prometheus -- "Generates" --> PlanFile[".sisyphus/plans/*.md"]
    end
    
    subgraph Execution_Phase [Phase 2: Execution]
        User -- "/start-work" --> BoulderState[boulder.json<br>(State Manager)]
        BoulderState --> Atlas[Atlas<br>(Executor)]
        
        Atlas -- "Delegates" --> SubAgents
        
        subgraph SubAgents [Specialized Agents]
            direction TB
            Frontend[Frontend Engineer]
            Oracle[Oracle<br>(Advisor)]
            Librarian[Librarian<br>(Researcher)]
            Explore[Explore<br>(Context Grep)]
            Hephaestus[Hephaestus<br>(Deep Worker)]
        end
    end
    
    Atlas -- "Verifies" --> Verification[LSP / Tests]
    SubAgents --> Atlas
```

## 3. Core Components

### 3.1 Agents (`src/agents/`)

Oh-My-OpenCode provides **11 specialized AI agents** organized into three tiers.

**Primary Agents** (Respect UI model selection):
*   **Sisyphus** (Claude Opus 4.6, Temp 0.1): The default orchestrator. Plans, delegates, and executes. Uses a dynamic prompt builder to adapt to available tools.
*   **Atlas** (Claude Sonnet 4.5, Temp 0.1): Master orchestrator for `/start-work`. Reads plans, maintains state, and delegates.
*   **Prometheus** (Claude Opus 4.6, Temp 0.1): Read-only planner. Interviews users and generates immutable markdown plans.

**Subagents** (Use own fallback chains):
*   **Hephaestus** (GPT-5.3 Codex, Temp 0.1): "Deep Work" agent. Autonomous, goal-oriented, explores before acting.
*   **Oracle** (GPT-5.2, Temp 0.1): Strategic advisor for architecture and debugging.
*   **Librarian** (GLM 4.7, Temp 0.1): External researcher (Docs, GitHub, OSS examples).
*   **Explore** (Grok Code Fast, Temp 0.1): Fast internal contextual grep.
*   **Frontend-UI-UX** (Gemini 3 Pro): Visual specialist.
*   **Metis** (Claude Opus 4.6, Temp 0.3): Pre-planning consultant (gap detection).
*   **Momus** (GPT-5.2, Temp 0.1): Plan reviewer/validator.
*   **Sisyphus-Junior** (Claude Sonnet 4.5, Temp 0.1): Category-spawned task executor.

### 3.2 Orchestration Engine (`src/hooks/atlas/`)

The heart of OMO is the **Atlas Hook**, which implements the "Boulder" loop:

1.  **State Detection**: Monitors `session.idle` events.
2.  **Continuity Check**: Reads `boulder.json` to see if a plan is active.
3.  **Prompt Injection**: If active and incomplete, injects a system directive forcing the agent to continue.
4.  **Guardrails**:
    *   **Orchestrator vs Implementer**: Prevents Atlas from writing code directly (must delegate).
    *   **Single Task**: Enforces atomic task delegation to sub-agents.
    *   **Verification**: Mandates LSP checks and tests before marking tasks complete.

### 3.3 Background Task System (`src/features/background-agent/`)

Enables parallel execution similar to a real engineering team.

*   **Manager (`manager.ts`)**: Handles task lifecycle (launch -> poll -> complete).
*   **Concurrency (`concurrency.ts`)**: Manages rate limits per provider/model.
*   **Polling**: Checks sub-session status every 2 seconds.
*   **Stability**: Completes tasks when output stabilizes (3 consecutive polls with no changes) or `session.idle` is reached.

### 3.4 Task System (`src/features/claude-tasks/`)

A file-based task queue stored in `.sisyphus/tasks/`.

*   **Schema**: Supports dependencies (`blockedBy`), status tracking, and metadata.
*   **Persistence**: Survives session restarts (unlike memory-based todos).
*   **Parallelism**: Automatically identifies tasks that can run concurrently.

### 3.5 Hook System (`src/hooks/`)

Interceptors for OpenCode lifecycle events (40+ hooks):

*   **Events**:
    *   `UserPromptSubmit` (Blocking): Slash commands, keyword detection.
    *   `PreToolUse` (Blocking): Input validation, context injection, guardrails.
    *   `PostToolUse` (Non-blocking): Output truncation, error recovery, auto-correction.
    *   `Stop` (Non-blocking): Auto-continue, notifications.
    *   `onSummarize`: Compaction handling.

*   **Key Hooks**:
    *   `atlas`: Main orchestration loop.
    *   `todo-continuation-enforcer`: Forces task completion.
    *   `context-window-monitor`: Warns about token usage.
    *   `auto-slash-command`: Handles `/start-work`, `/ulw`.
    *   `comment-checker`: Prevents AI slop.

## 4. Data Flow

1.  **Initialization**: `src/index.ts` registers agents, hooks, and tools.
2.  **Request**: User inputs a command.
3.  **Routing**:
    *   If `@plan` -> Route to Prometheus.
    *   If `/start-work` -> Initialize `boulder.json` -> Activate Atlas.
    *   If `ulw` -> Sisyphus executes in "Ultrawork" mode (autonomous).
4.  **Execution Loop**:
    *   Atlas reads `boulder.json` -> Picks next task.
    *   Atlas calls `task()` tool -> Spawns background sub-agent.
    *   Sub-agent runs -> `BackgroundManager` polls.
    *   Sub-agent finishes -> Atlas verifies -> Updates plan -> Commits.
    *   Atlas Hook detects idle -> Injects continuation prompt -> Loop repeats.

## 5. Configuration

Config is loaded from `.opencode/kajiflow.json` (project) or `~/.config/opencode/kajiflow.json` (user). It uses a Zod schema (`src/config/schema.ts`) for validation.

## 6. Directory Structure

```
src/
├── agents/           # Agent definitions and prompts
├── hooks/            # Lifecycle interceptors (Atlas, logic)
├── features/         # Core subsystems (Background, Tasks)
├── tools/            # Custom tools (LSP, Git, etc.)
├── shared/           # Utilities (Logger, Tmux, etc.)
└── index.ts          # Plugin entry point
```
