import { z } from "zod"

export const AgentOverrideConfigSchema = z.object({
  model: z.string().optional(),
  temperature: z.number().optional(),
  top_p: z.number().optional(),
  maxTokens: z.number().optional(),
  reasoningEffort: z.enum(["low", "medium", "high"]).optional(),
  textVerbosity: z.enum(["concise", "normal", "verbose"]).optional(),
  thinking: z.boolean().optional(),
  prompt_append: z.string().optional(),
  variant: z.string().optional(),
  category: z.string().optional(),
  permission: z.record(z.string(), z.enum(["allow", "deny", "ask"])).optional(),
  tools: z.record(z.string(), z.boolean()).optional(), // Reverted to boolean
  skills: z.array(z.string()).optional(),
  is_unstable_agent: z.boolean().optional(),
}).strict()

export type AgentOverrideConfig = z.infer<typeof AgentOverrideConfigSchema>

export const CategoryConfigSchema = z.object({
  description: z.string().optional(),
  model: z.string().optional(),
  temperature: z.number().optional(),
  top_p: z.number().optional(),
  maxTokens: z.number().optional(),
  reasoningEffort: z.enum(["low", "medium", "high"]).optional(),
  textVerbosity: z.enum(["concise", "normal", "verbose"]).optional(),
  thinking: z.boolean().optional(),
  prompt_append: z.string().optional(),
  variant: z.string().optional(),
  is_unstable_agent: z.boolean().optional(),
  tools: z.record(z.string(), z.boolean()).optional(), // Reverted to boolean
}).strict()

export type CategoryConfig = z.infer<typeof CategoryConfigSchema>
export type CategoriesConfig = Record<string, CategoryConfig>

export const GitMasterConfigSchema = z.object({
  pr_target_branch: z.string().optional(),
  git_user_name: z.string().optional(),
  git_user_email: z.string().optional(),
  commit_footer: z.string().optional(),
  include_co_authored_by: z.boolean().optional(),
}).strict()

export type GitMasterConfig = z.infer<typeof GitMasterConfigSchema>

export const HookNameSchema = z.enum([
  "context-window-monitor",
  "session-recovery",
  "session-notification",
  "comment-checker",
  "tool-output-truncator",
  "directory-agents-injector",
  "directory-readme-injector",
  "empty-task-response-detector",
  "think-mode",
  "claude-code-hooks",
  "anthropic-context-window-limit-recovery",
  "rules-injector",
  "keyword-detector",
  "agent-usage-reminder",
  "non-interactive-env",
  "interactive-bash-session",
  "thinking-block-validator",
  "category-skill-reminder",
  "ralph-loop",
  "auto-slash-command",
  "edit-error-recovery",
  "delegate-task-retry",
  "task-resume-info",
  "start-work",
  "planner-md-only",
  "senior-orchestrator",
  "question-label-truncator",
  "subagent-question-blocker",
  "stop-continuation-guard",
  "compaction-context-injector",
  "compaction-todo-preserver",
  "unstable-agent-babysitter",
  "preemptive-compaction",
  "tasks-todowrite-disabler",
  "write-existing-file-guard",
  "anthropic-effort",
  "background-notification"
])

export type HookName = z.infer<typeof HookNameSchema>

export const ExperimentalConfigSchema = z.object({
  safe_hook_creation: z.boolean().optional(),
  preemptive_compaction: z.union([z.boolean(), z.object({ enabled: z.boolean().optional() })]).optional(),
  session_recovery_auto_prompt: z.union([z.boolean(), z.object({ auto_resume: z.boolean().optional() })]).optional(),
  tool_output_truncator_max_chars: z.number().optional(),
  tasks_todowrite_disabler: z.boolean().optional(),
  task_system: z.boolean().optional(),
  plugin_load_timeout_ms: z.number().optional(),
  dynamic_context_pruning: z.boolean().optional(),
  truncate_all_tool_outputs: z.boolean().optional(),
  auto_resume: z.boolean().optional(),
}).strict()

export type ExperimentalConfig = z.infer<typeof ExperimentalConfigSchema>

export const BrowserAutomationEngineSchema = z.object({
  provider: z.enum(["playwright", "steel", "agent-browser"]).optional(),
})

export type BrowserAutomationEngineConfig = z.infer<typeof BrowserAutomationEngineSchema>
export type BrowserAutomationProvider = BrowserAutomationEngineConfig["provider"]

export const CommentCheckerConfigSchema = z.object({
  auto_fix: z.boolean().optional(),
  exclude_patterns: z.array(z.string()).optional(),
  custom_prompt: z.string().optional(),
}).strict()

export type CommentCheckerConfig = z.infer<typeof CommentCheckerConfigSchema>

export const TmuxConfigSchema = z.object({
  enabled: z.boolean().optional(),
  layout: z.enum(["main-vertical", "tiled", "main-horizontal"]).optional(),
  main_pane_size: z.number().optional(),
  main_pane_min_width: z.number().optional(),
  agent_pane_min_width: z.number().optional(),
}).strict()

export type TmuxConfig = z.infer<typeof TmuxConfigSchema>
export type TmuxLayout = NonNullable<TmuxConfig["layout"]>

export const ClaudeCodeConfigSchema = z.object({
  hooks: z.boolean().optional(),
  skills: z.boolean().optional(),
  plugins: z.boolean().optional(),
  plugins_override: z.array(z.string()).optional(),
  agents: z.boolean().optional(),
  mcp: z.boolean().optional(),
  commands: z.boolean().optional(),
}).strict()

export type ClaudeCodeConfig = z.infer<typeof ClaudeCodeConfigSchema>

export const BackgroundTaskConfigSchema = z.object({
  poll_interval_ms: z.number().optional(),
  max_concurrent_tasks: z.number().optional(),
  max_tasks_per_model: z.record(z.string(), z.number()).optional(),
  stability_polls: z.number().optional(),
  stale_timeout_ms: z.number().optional(),
}).strict()

export type BackgroundTaskConfig = z.infer<typeof BackgroundTaskConfigSchema>

export const RalphLoopConfigSchema = z.object({
  max_iterations: z.number().optional(),
  default_max_iterations: z.number().optional(),
  state_dir: z.string().optional(),
}).strict()

export type RalphLoopConfig = z.infer<typeof RalphLoopConfigSchema>

export const BabysittingConfigSchema = z.object({
  timeout_ms: z.number().optional(),
}).strict()

export type BabysittingConfig = z.infer<typeof BabysittingConfigSchema>

export const NotificationConfigSchema = z.object({
  force_enable: z.boolean().optional(),
}).strict()

export type NotificationConfig = z.infer<typeof NotificationConfigSchema>

export const OrchestratorTasksConfigSchema = z.object({
  storage_path: z.string().optional(),
  task_list_id: z.string().optional(),
}).strict()

export type OrchestratorTasksConfig = z.infer<typeof OrchestratorTasksConfigSchema>

export const OrchestratorConfigSchema = z.object({
  disabled: z.boolean().optional(),
  default_builder_enabled: z.boolean().optional(),
  planner_enabled: z.boolean().optional(),
  replace_plan: z.boolean().optional(),
  tasks: OrchestratorTasksConfigSchema.optional(),
}).strict()

export type OrchestratorConfig = z.infer<typeof OrchestratorConfigSchema>

export const WebsearchConfigSchema = z.object({
  provider: z.enum(["exa", "tavily"]).optional(),
}).strict()

export type WebsearchConfig = z.infer<typeof WebsearchConfigSchema>

export const SkillDefinitionSchema = z.object({
  description: z.string().optional(),
  mcp_servers: z.array(z.string()).optional(),
  env: z.record(z.string(), z.string()).optional(),
  template: z.string().optional(),
  from: z.string().optional(),
  model: z.string().optional(),
  agent: z.string().optional(),
  subtask: z.string().optional(),
  "argument-hint": z.string().optional(),
  "allowed-tools": z.array(z.string()).optional(),
  license: z.string().optional(),
  compatibility: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  disable: z.boolean().optional(),
}).strict()

export type SkillDefinition = z.infer<typeof SkillDefinitionSchema>
export type SkillsConfig = Record<string, SkillDefinition> | string[]

export const KajiFlowConfigSchema = z.object({
  agent: z.object({
    orchestrator: AgentOverrideConfigSchema.optional(),
    "senior-orchestrator": AgentOverrideConfigSchema.optional(),
    planner: AgentOverrideConfigSchema.optional(),
    developer: AgentOverrideConfigSchema.optional(),
    reviewer: AgentOverrideConfigSchema.optional(),
    researcher: AgentOverrideConfigSchema.optional(),
    "context-finder": AgentOverrideConfigSchema.optional(),
    advisor: AgentOverrideConfigSchema.optional(),
    "vision-analyst": AgentOverrideConfigSchema.optional(),
    "product-manager": AgentOverrideConfigSchema.optional(),
    "solutions-architect": AgentOverrideConfigSchema.optional(),
    "sales-engineer": AgentOverrideConfigSchema.optional(),
    "bizops-manager": AgentOverrideConfigSchema.optional(),
    "OpenCode-Builder": AgentOverrideConfigSchema.optional(),
    "technical-writer": AgentOverrideConfigSchema.optional(),
    "business-writer": AgentOverrideConfigSchema.optional(),
  }).optional(),
  categories: z.record(z.string(), CategoryConfigSchema).optional(),
  disabled_agents: z.array(z.string()).optional(),
  disabled_tools: z.array(z.string()).optional(),
  disabled_hooks: z.array(z.string()).optional(),
  disabled_mcps: z.array(z.string()).optional(),
  disabled_commands: z.array(z.string()).optional(),
  disabled_skills: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  experimental: ExperimentalConfigSchema.optional(),
  browser_automation_engine: BrowserAutomationEngineSchema.optional(),
  comment_checker: CommentCheckerConfigSchema.optional(),
  tmux: TmuxConfigSchema.optional(),
  claude_code: ClaudeCodeConfigSchema.optional(),
  background_task: BackgroundTaskConfigSchema.optional(),
  ralph_loop: RalphLoopConfigSchema.optional(),
  babysitting: BabysittingConfigSchema.optional(),
  notification: NotificationConfigSchema.optional(),
  git_master: GitMasterConfigSchema.optional(),
  orchestrator_config: OrchestratorConfigSchema.optional(),
  websearch: WebsearchConfigSchema.optional(),
}).strict()

export type KajiFlowConfig = z.infer<typeof KajiFlowConfigSchema>
