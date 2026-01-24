# HOOKS KNOWLEDGE BASE

## OVERVIEW

30 lifecycle hooks intercepting/modifying agent behavior. Events: PreToolUse, PostToolUse, UserPromptSubmit, Stop, onSummarize.

## STRUCTURE

```
hooks/
├── atlas/                      # Main orchestration (773 lines)
├── anthropic-context-window-limit-recovery/  # Auto-summarize on context limit
├── todo-continuation-enforcer.ts # Force TODO completion
├── ralph-loop/                 # Self-referential dev loop
├── claude-code-hooks/          # settings.json compat layer - see AGENTS.md
├── comment-checker/            # Prevents AI slop comments
├── auto-slash-command/         # Detects /command patterns
├── rules-injector/             # Conditional rules injection
├── directory-agents-injector/  # Auto-injects AGENTS.md
├── directory-readme-injector/  # Auto-injects README.md
├── edit-error-recovery/        # Recovers from Edit failures
├── thinking-block-validator/   # Ensures valid <thinking>
├── context-window-monitor.ts   # Reminds of context headroom
├── session-recovery/           # Auto-recovers from crashes
├── think-mode/                 # Dynamic thinking budget
├── keyword-detector/           # ultrawork/search/analyze modes
├── background-notification/    # Routes events to BackgroundManager
├── prometheus-md-only/         # Planner read-only mode
├── agent-usage-reminder/       # Specialized agent hints
├── auto-update-checker/        # Plugin update check
├── tool-output-truncator.ts    # Prevents context bloat
├── background-compaction/      # Preserves background task state during compaction
├── compaction-context-injector/ # Injects critical context on summarize
├── delegate-task-retry/        # Retry logic for delegate_task failures
├── interactive-bash-session/   # Tmux integration for interactive terminals
├── non-interactive-env/        # Prepends env vars for non-interactive git
├── question-label-truncator/   # Truncates long AskUserQuestion labels
├── start-work/                 # Initiates work from Prometheus plans
├── task-resume-info/           # Appends resume instructions to delegate_task
├── session-notification.ts     # Session state notifications
└── empty-task-response-detector.ts # Detects empty task responses
```

## HOOK EVENTS

| Event | Timing | Can Block | Use Case |
|-------|--------|-----------|----------|
| PreToolUse | Before tool | Yes | Validate/modify inputs |
| PostToolUse | After tool | No | Append warnings, truncate |
| UserPromptSubmit | On prompt | Yes | Keyword detection |
| Stop | Session idle | No | Auto-continue |
| onSummarize | Compaction | No | Preserve state |

## EXECUTION ORDER

**chat.message**: keywordDetector → claudeCodeHooks → autoSlashCommand → startWork → ralphLoop

**tool.execute.before**: claudeCodeHooks → nonInteractiveEnv → commentChecker → directoryAgentsInjector → rulesInjector

**tool.execute.after**: editErrorRecovery → delegateTaskRetry → commentChecker → toolOutputTruncator → claudeCodeHooks

## HOW TO ADD

1. Create `src/hooks/name/` with `index.ts` exporting `createMyHook(ctx)`
2. Add hook name to `HookNameSchema` in `src/config/schema.ts`
3. Register in `src/index.ts`:
   ```typescript
   const myHook = isHookEnabled("my-hook") ? createMyHook(ctx) : null
   ```

## PATTERNS

- **Session-scoped state**: `Map<sessionID, Set<string>>`
- **Conditional execution**: Check `input.tool` before processing
- **Output modification**: `output.output += "\n${REMINDER}"`

## ANTI-PATTERNS

- **Blocking non-critical**: Use PostToolUse warnings instead
- **Heavy computation**: Keep PreToolUse light
- **Redundant injection**: Track injected files
