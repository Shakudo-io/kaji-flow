# KajiFlow Architecture V2 (Comprehensive)

**Generated:** 2026-02-07
**Version:** 3.3.1 (Refactored)

## 1. System Overview

KajiFlow (formerly Oh-My-OpenCode) is an advanced orchestration plugin for OpenCode. It transforms the IDE into an autonomous agentic workspace by providing:
- **Orchestration**: A hierarchical agent system (Sisyphus → Subagents).
- **Delegation**: Parallel background task execution with lifecycle management.
- **Integration**: Deep hooks into OpenCode events (chat, tools, session lifecycle).
- **Tools**: A suite of 25+ specialized tools for code analysis, planning, and execution.

### High-Level Architecture

```mermaid
graph TD
    User[User] -->|Chat/Commands| OpenCode[OpenCode IDE]
    OpenCode -->|Hooks| KajiFlow[KajiFlow Plugin]
    
    subgraph KajiFlow Plugin
        Orchestrator[Sisyphus Orchestrator]
        Config[Config Handler]
        
        subgraph "Agent System"
            Planner[Prometheus (Planner)]
            Worker[Hephaestus (Deep Worker)]
            Specialists[Specialists (Librarian/Explore/etc)]
        end
        
        subgraph "Execution Engine"
            BgManager[Background Manager]
            TmuxManager[Tmux Session Manager]
            TaskToast[Task Toast Manager]
        end
        
        subgraph "Tooling Layer"
            DelegateTask[Delegate Task Tool]
            LSP[LSP Tools]
            Search[Search Tools]
            Skills[Skill Loader]
        end
    end
    
    KajiFlow -->|Load| Config
    Orchestrator -->|Delegate| DelegateTask
    DelegateTask -->|Launch| BgManager
    BgManager -->|Spawn| SubagentSessions[Subagent Sessions]
    SubagentSessions -->|Execute| Worker & Specialists & Planner
    BgManager -->|Feedback| TaskToast
```

---

## 2. Core Modules

### 2.1 Agents Module (`src/agents`)
Defines the AI personas and their prompting strategies.

-   **Primary Agents**:
    -   **Sisyphus** (`sisyphus.ts`): The main orchestrator. Uses a dynamic prompt builder to integrate available skills and tools. Enforces task tracking and delegation.
    -   **Atlas** (`atlas/`): Alternative orchestrator (Claude Sonnet optimized).
    -   **Prometheus** (`prometheus/`): The Planner. Operates in Interview Mode -> Plan Generation -> Validation loops. Restricted to modifying markdown files.

-   **Subagents**:
    -   **Hephaestus** (`hephaestus.ts`): "The Legitimate Craftsman". Deep worker (GPT-5.3 Codex) for autonomous implementation.
    -   **Librarian** (`librarian.ts`): Research specialist (Docs/GitHub).
    -   **Explore** (`explore.ts`): Codebase context gatherer (Grep/Glob).
    -   **Metis** (`metis.ts`): Pre-planning analyst.
    -   **Momus** (`momus.ts`): Critic/Validator.
    -   **Sisyphus-Junior**: Category-specific executor spawned for domain tasks.

### 2.2 Config Module (`src/config`)
Defines the configuration schema using Zod.

-   **Schema**: `KajiFlowConfigSchema` validates `.kajiflow/kajiflow.json`.
-   **Granularity**: Supports detailed overrides for agents (model, temp, permissions), tools, and hooks.
-   **Features**: Toggle flags for experimental features (e.g., `ralph_loop`, `tmux`).

### 2.3 Features Module (`src/features`)
Contains complex subsystems and business logic.

-   **Background Agent** (`background-agent/`):
    -   Manages asynchronous tasks: `launch` -> `poll` -> `stability_check` -> `complete`.
    -   **Concurrency**: Limits active tasks per provider/model to prevent rate limits.
    -   **Stability**: Detects completion when 3 consecutive polls show no new messages/activity.
-   **Tmux Subagent** (`tmux-subagent/`):
    -   Maps logical subagent sessions to physical tmux panes.
    -   Decides layout (split vs. replace) based on window geometry.
    -   Source of truth is `tmux` query, not internal state.
-   **Skill Loader** (`opencode-skill-loader/`):
    -   Loads skills from Project > Global > Legacy paths.
    -   Parses frontmatter and `mcp.json` configs for skill-specific MCPs.
-   **MCP OAuth** (`mcp-oauth/`):
    -   Implements PKCE OAuth flow for MCP servers.
    -   Handles Dynamic Client Registration (DCR) and token storage.

### 2.4 Hooks Module (`src/hooks`)
Intercepts OpenCode lifecycle events to enforce rules and inject context.

-   **Atlas Hook** (`atlas/`): Core orchestration logic. Enforces "Orchestrator doesn't implement" rule, manages "Boulder" execution loops, and handles single-task enforcement.
-   **Keyword Detector**: Scans user input for triggers (e.g., "ultrawork") to activate modes.
-   **Todo Enforcer**: Blocks non-trivial work if a Todo list isn't active.
-   **Session Recovery**: Auto-recovers crashed sessions.
-   **Prometheus MD Only**: Security guardrail restricting the Planner to markdown files.

### 2.5 MCP Module (`src/mcp`)
Built-in remote MCP server configurations.

-   **Websearch**: Exa/Tavily integration.
-   **Context7**: Documentation search.
-   **Grep.app**: GitHub code search.

### 2.6 Plugin Handlers (`src/plugin-handlers`)
Initialization logic.

-   **Config Handler**: Loads config, discovers plugins/skills/agents, configures permissions, and initializes the plugin instance.

### 2.7 Shared Module (`src/shared`)
Cross-cutting utilities.

-   **System Directives**: `[SYSTEM DIRECTIVE: KAJIFLOW - TYPE]` protocol for internal agent communication.
-   **Model Resolver**: 3-step resolution (Override -> Fallback -> Default) for robust model selection.
-   **Paths**: XDG-compliant path resolution.

### 2.8 Tools Module (`src/tools`)
The toolset available to agents.

-   **Delegate Task** (`delegate-task/`): The primary delegation engine. Resolves subagents, manages background/sync execution, and handles context passing.
-   **LSP**: Wrapper around OpenCode's LSP capabilities.
-   **Search**: `grep`, `glob`, `ast-grep`.
-   **Task**: `task_create`, `task_update` (Claude Code compatible).
-   **Interactive Bash**: Tmux-aware shell execution.

---

## 3. Data Flow

### Delegation Flow
1.  **Sisyphus** receives a complex request.
2.  **Sisyphus** calls `task(category="frontend", description="...")`.
3.  **Delegate Task Tool**:
    -   Resolves category to `sisyphus-junior` (or specific subagent).
    -   Calls `BackgroundManager.launch()`.
4.  **Background Manager**:
    -   Creates a new OpenCode session.
    -   Injects the subagent system prompt.
    -   Sends the task prompt.
    -   Returns a `task_id` to Sisyphus immediately (pending state).
5.  **Polling Loop**:
    -   BackgroundManager polls the subagent session.
    -   Updates `TaskToastManager` (UI).
    -   Detects completion (idle state).
6.  **Completion**:
    -   Sisyphus calls `background_output(task_id)`.
    -   Result is injected into Sisyphus's context.

### Boulder Loop (Continuous Execution)
1.  User initiates "Boulder" mode (e.g., via `/start-work` or keyword).
2.  **Atlas Hook** intercepts `session.idle`.
3.  Checks `boulder-state` (active plan).
4.  Injects a "Continuation" prompt: "You have an active plan. Continue working. [X/Y tasks done]."
5.  Agent performs the next step.
6.  Loop repeats until plan is complete or stopped.

---

## 4. Key Decisions & Constraints

-   **One-Way Dependency**: Agents rely on Features, Features rely on Shared. No circular imports.
-   **Orchestrator vs. Implementer**: The Orchestrator (Sisyphus/Atlas) is explicitly FORBIDDEN from editing code directly (enforced by hooks) to ensure delegation.
-   **English-Only**: Codebase and documentation language is strictly English.
-   **Bun-Only**: Project tooling is standardized on Bun.
