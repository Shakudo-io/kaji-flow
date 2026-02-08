import { 
  KajiFlowConfigSchema,
  AgentOverrideConfigSchema,
  HookNameSchema,
  ExperimentalConfigSchema,
  RalphLoopConfigSchema,
  TmuxConfigSchema,
  CategoryConfigSchema,
  GitMasterConfigSchema,
  BrowserAutomationEngineSchema,
  CommentCheckerConfigSchema,
  ClaudeCodeConfigSchema,
  BackgroundTaskConfigSchema,
  BabysittingConfigSchema,
  NotificationConfigSchema,
  OrchestratorConfigSchema,
  WebsearchConfigSchema,
} from "./schema"

import type {
  OrchestratorConfig,
  KajiFlowConfig,
  AgentOverrideConfig,
  HookName,
  ExperimentalConfig,
  RalphLoopConfig,
  TmuxConfig,
  CategoryConfig,
  CategoriesConfig,
  GitMasterConfig,
  BrowserAutomationEngineConfig,
  CommentCheckerConfig,
  ClaudeCodeConfig,
  BackgroundTaskConfig,
  BabysittingConfig,
  NotificationConfig,
  
  WebsearchConfig,
  TmuxLayout,
} from "./schema"

export {
  KajiFlowConfigSchema,
  AgentOverrideConfigSchema,
  HookNameSchema,
  ExperimentalConfigSchema,
  RalphLoopConfigSchema,
  TmuxConfigSchema,
  CategoryConfigSchema,
  GitMasterConfigSchema,
  BrowserAutomationEngineSchema,
  CommentCheckerConfigSchema,
  ClaudeCodeConfigSchema,
  BackgroundTaskConfigSchema,
  BabysittingConfigSchema,
  NotificationConfigSchema,
  OrchestratorConfigSchema,
  WebsearchConfigSchema,
}

export type {
  OrchestratorConfig,
  KajiFlowConfig,
  AgentOverrideConfig,
  HookName,
  ExperimentalConfig,
  RalphLoopConfig,
  TmuxConfig,
  CategoryConfig,
  CategoriesConfig,
  GitMasterConfig,
  BrowserAutomationEngineConfig,
  CommentCheckerConfig,
  ClaudeCodeConfig,
  BackgroundTaskConfig,
  BabysittingConfig,
  NotificationConfig,
  WebsearchConfig,
  TmuxLayout,
}

// Legacy/Compatibility types
export type AgentName = string // Fallback
export type McpName = string
export type AgentOverrides = Record<string, any>
export type BuiltinCommandName = string
export type OrchestratorAgentConfig = OrchestratorConfig // Alias
export type OrchestratorTasksConfig = any
export type DynamicContextPruningConfig = any
