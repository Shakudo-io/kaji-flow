import { createTechnicalWriterAgent, technicalWriterPromptMetadata } from "./technical-writer"
import { createBusinessWriterAgent, businessWriterPromptMetadata } from "./business-writer"
import { readOpenCodeConfigProviders } from "../shared/opencode-config-reader"
import { log } from "../shared/logger"
import type { AgentConfig } from "@opencode-ai/sdk"
import type { BuiltinAgentName, AgentOverrideConfig, AgentOverrides, AgentFactory, AgentPromptMetadata } from "./types"
import type { CategoriesConfig, CategoryConfig, GitMasterConfig } from "../config/schema"
import { createOrchestratorAgent } from "./orchestrator"
import { createAdvisorAgent, advisorPromptMetadata } from "./advisor"
import { createResearcherAgent, researcherPromptMetadata } from "./researcher"
import { createContextFinderAgent, contextFinderPromptMetadata } from "./context-finder"
import { createVisionAnalystAgent, visionAnalystPromptMetadata } from "./vision-analyst"
import { createSeniorOrchestratorAgent, seniorOrchestratorPromptMetadata } from "./senior-orchestrator"
import { createDeveloperAgent } from "./developer"
import { createProductManagerAgent, productManagerPromptMetadata } from "./product-manager"
import { createSolutionsArchitectAgent, solutionsArchitectPromptMetadata } from "./solutions-architect"
import { createSalesEngineerAgent, salesEngineerPromptMetadata } from "./sales-engineer"
import { createBizOpsManagerAgent, bizOpsManagerPromptMetadata } from "./bizops-manager"
import type { AvailableAgent, AvailableCategory, AvailableSkill } from "./dynamic-agent-prompt-builder"
import { deepMerge, fetchAvailableModels, resolveModelPipeline, AGENT_MODEL_REQUIREMENTS, readConnectedProvidersCache, isModelAvailable, isAnyFallbackModelAvailable, isAnyProviderConnected, migrateAgentConfig } from "../shared"
import { DEFAULT_CATEGORIES, CATEGORY_DESCRIPTIONS } from "../tools/delegate-task/constants"
import { resolveMultipleSkills } from "../features/opencode-skill-loader/skill-content"
import { createBuiltinSkills } from "../features/builtin-skills"
import type { LoadedSkill, SkillScope } from "../features/opencode-skill-loader/types"
import type { BrowserAutomationProvider } from "../config/schema"

type AgentSource = AgentFactory | AgentConfig

const agentSources: Record<BuiltinAgentName, AgentSource> = {
  orchestrator: createOrchestratorAgent,
  developer: createDeveloperAgent,
  advisor: createAdvisorAgent,
  researcher: createResearcherAgent,
  "context-finder": createContextFinderAgent,
  "vision-analyst": createVisionAnalystAgent,
  "senior-orchestrator": createSeniorOrchestratorAgent as unknown as AgentFactory,
  planner: undefined as unknown as AgentFactory,
  "product-manager": createProductManagerAgent,
  "solutions-architect": createSolutionsArchitectAgent,
  "sales-engineer": createSalesEngineerAgent,
  "bizops-manager": createBizOpsManagerAgent,
  "technical-writer": createTechnicalWriterAgent,
  "business-writer": createBusinessWriterAgent,
}

const agentMetadata: Partial<Record<BuiltinAgentName, AgentPromptMetadata>> = {
  advisor: advisorPromptMetadata,
  researcher: researcherPromptMetadata,
  "context-finder": contextFinderPromptMetadata,
  "vision-analyst": visionAnalystPromptMetadata,
  "senior-orchestrator": seniorOrchestratorPromptMetadata,
  "product-manager": productManagerPromptMetadata,
  "solutions-architect": solutionsArchitectPromptMetadata,
  "sales-engineer": salesEngineerPromptMetadata,
  "bizops-manager": bizOpsManagerPromptMetadata,
  "technical-writer": technicalWriterPromptMetadata,
  "business-writer": businessWriterPromptMetadata,
}

function isFactory(source: AgentSource): source is AgentFactory {
  return typeof source === "function"
}

export function buildAgent(
  source: AgentSource,
  model: string,
  categories?: CategoriesConfig,
  gitMasterConfig?: GitMasterConfig,
  browserProvider?: BrowserAutomationProvider,
  disabledSkills?: Set<string>
): AgentConfig {
  const base = isFactory(source) ? source(model) : source
  const categoryConfigs: Record<string, CategoryConfig> = categories
    ? { ...DEFAULT_CATEGORIES, ...categories }
    : DEFAULT_CATEGORIES

  const agentWithCategory = base as AgentConfig & { category?: string; skills?: string[]; variant?: string }
  if (agentWithCategory.category) {
    const categoryConfig = categoryConfigs[agentWithCategory.category]
    if (categoryConfig) {
      if (!base.model) {
        base.model = categoryConfig.model
      }
      if (base.temperature === undefined && categoryConfig.temperature !== undefined) {
        base.temperature = categoryConfig.temperature
      }
      if (base.variant === undefined && categoryConfig.variant !== undefined) {
        base.variant = categoryConfig.variant
      }
    }
  }

  if (agentWithCategory.skills?.length) {
    const { resolved } = resolveMultipleSkills(agentWithCategory.skills, { gitMasterConfig, browserProvider, disabledSkills })
    if (resolved.size > 0) {
      const skillContent = Array.from(resolved.values()).join("\n\n")
      base.prompt = skillContent + (base.prompt ? "\n\n" + base.prompt : "")
    }
  }

  return base
}

export function createEnvContext(): string {
  const now = new Date()
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const locale = Intl.DateTimeFormat().resolvedOptions().locale

  const dateStr = now.toLocaleDateString(locale, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  })

  const timeStr = now.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  })

  return `
<kaji-env>
  Current date: ${dateStr}
  Current time: ${timeStr}
  Timezone: ${timezone}
  Locale: ${locale}
</kaji-env>`
}

function applyCategoryOverride(
  config: AgentConfig,
  categoryName: string,
  mergedCategories: Record<string, CategoryConfig>
): AgentConfig {
  const categoryConfig = mergedCategories[categoryName]
  if (!categoryConfig) return config

  const result = { ...config } as AgentConfig & Record<string, unknown>
  if (categoryConfig.model) result.model = categoryConfig.model
  if (categoryConfig.variant !== undefined) result.variant = categoryConfig.variant
  if (categoryConfig.temperature !== undefined) result.temperature = categoryConfig.temperature
  if (categoryConfig.reasoningEffort !== undefined) result.reasoningEffort = categoryConfig.reasoningEffort
  if (categoryConfig.textVerbosity !== undefined) result.textVerbosity = categoryConfig.textVerbosity
  if (categoryConfig.thinking !== undefined) result.thinking = categoryConfig.thinking
  if (categoryConfig.top_p !== undefined) result.top_p = categoryConfig.top_p
  if (categoryConfig.maxTokens !== undefined) result.maxTokens = categoryConfig.maxTokens

  return result as AgentConfig
}

function applyModelResolution(input: {
  uiSelectedModel?: string
  userModel?: string
  requirement?: { fallbackChain?: { providers: string[]; model: string; variant?: string }[] }
  availableModels: Set<string>
  systemDefaultModel?: string
}) {
  const { uiSelectedModel, userModel, requirement, availableModels, systemDefaultModel } = input
  return resolveModelPipeline({
    intent: { uiSelectedModel, userModel },
    constraints: { availableModels },
    policy: { fallbackChain: requirement?.fallbackChain, systemDefaultModel },
  })
}

function getFirstFallbackModel(requirement?: {
  fallbackChain?: { providers: string[]; model: string; variant?: string }[]
}) {
  const entry = requirement?.fallbackChain?.[0]
  if (!entry || entry.providers.length === 0) return undefined
  return {
    model: `${entry.providers[0]}/${entry.model}`,
    provenance: "provider-fallback" as const,
    variant: entry.variant,
  }
}

function applyEnvironmentContext(config: AgentConfig, directory?: string): AgentConfig {
  if (!directory || !config.prompt) return config
  const envContext = createEnvContext()
  return { ...config, prompt: config.prompt + envContext }
}

function applyOverrides(
  config: AgentConfig,
  override: AgentOverrideConfig | undefined,
  mergedCategories: Record<string, CategoryConfig>
): AgentConfig {
  let result = config
  const overrideCategory = (override as Record<string, unknown> | undefined)?.category as string | undefined
  if (overrideCategory) {
    result = applyCategoryOverride(result, overrideCategory, mergedCategories)
  }

  if (override) {
    result = mergeAgentConfig(result, override)
  }

  return result
}

function mergeAgentConfig(
  base: AgentConfig,
  override: AgentOverrideConfig
): AgentConfig {
  const migratedOverride = migrateAgentConfig(override as Record<string, unknown>) as AgentOverrideConfig
  const { prompt_append, ...rest } = migratedOverride
  const merged = deepMerge(base, rest as Partial<AgentConfig>)

  if (prompt_append && merged.prompt) {
    merged.prompt = merged.prompt + "\n" + prompt_append
  }

  return merged
}

function mapScopeToLocation(scope: SkillScope): AvailableSkill["location"] {
  if (scope === "user" || scope === "opencode") return "user"
  if (scope === "project" || scope === "opencode-project") return "project"
  return "plugin"
}

export async function createBuiltinAgents(
  disabledAgents: string[] = [],
  agentOverrides: AgentOverrides = {},
  directory?: string,
  systemDefaultModel?: string,
  categories?: CategoriesConfig,
  gitMasterConfig?: GitMasterConfig,
  discoveredSkills: LoadedSkill[] = [],
  client?: any,
  browserProvider?: BrowserAutomationProvider,
  uiSelectedModel?: string,
  disabledSkills?: Set<string>
): Promise<Record<string, AgentConfig>> {
    let connectedProviders = readConnectedProvidersCache()
  
  // Fallback: Read from opencode.json directly if cache is missing
  if (!connectedProviders || connectedProviders.length === 0) {
    connectedProviders = readOpenCodeConfigProviders()
    if (connectedProviders.length > 0) {
      log("[createBuiltinAgents] Using providers from opencode.json fallback", { connectedProviders })
    }
  }
  const availableModels = await fetchAvailableModels(undefined, {
    connectedProviders: connectedProviders ?? undefined,
  })
    const isFirstRunNoCache =
    availableModels.size === 0 && (!connectedProviders || connectedProviders.length === 0)

  log("[createBuiltinAgents] Starting agent registration", { 
    disabledAgents, 
    availableModelsCount: availableModels.size,
    isFirstRunNoCache,
    agentSourcesCount: Object.keys(agentSources).length
  })

  const result: Record<string, AgentConfig> = {}
  const availableAgents: AvailableAgent[] = []

  const mergedCategories = categories
    ? { ...DEFAULT_CATEGORIES, ...categories }
    : DEFAULT_CATEGORIES

  const availableCategories: AvailableCategory[] = Object.entries(mergedCategories).map(([name]) => ({
    name,
    description: categories?.[name]?.description ?? CATEGORY_DESCRIPTIONS[name] ?? "General tasks",
  }))

  const builtinSkills = createBuiltinSkills({ browserProvider, disabledSkills })
  const builtinSkillNames = new Set(builtinSkills.map(s => s.name))

  const builtinAvailable: AvailableSkill[] = builtinSkills.map((skill) => ({
    name: skill.name,
    description: skill.description,
    location: "plugin" as const,
  }))

  const discoveredAvailable: AvailableSkill[] = discoveredSkills
    .filter(s => !builtinSkillNames.has(s.name))
    .map((skill) => ({
      name: skill.name,
      description: skill.definition.description ?? "",
      location: mapScopeToLocation(skill.scope),
    }))

  const availableSkills: AvailableSkill[] = [...builtinAvailable, ...discoveredAvailable]

  const pendingAgentConfigs: Map<string, AgentConfig> = new Map()

      for (const [name, source] of Object.entries(agentSources)) {
     const agentName = name as BuiltinAgentName
     log(`[createBuiltinAgents] Processing ${agentName}`, { agentName })

     if (agentName === "orchestrator") continue
     if (agentName === "developer") continue
     if (agentName === "senior-orchestrator") continue
     if (agentName === "planner") continue
          if (disabledAgents.some((name) => name.toLowerCase() === agentName.toLowerCase())) {
       log(`[createBuiltinAgents] Skipping ${agentName} (disabled)`)
       continue
     }

     const override = agentOverrides[agentName]
       ?? Object.entries(agentOverrides).find(([key]) => key.toLowerCase() === agentName.toLowerCase())?.[1]
     const requirement = AGENT_MODEL_REQUIREMENTS[agentName]

          if (requirement?.requiresModel && availableModels) {
       if (!isModelAvailable(requirement.requiresModel, availableModels)) {
         log(`[createBuiltinAgents] Skipping ${agentName} (model unavailable: ${requirement.requiresModel})`, { availableModels: Array.from(availableModels) })
         continue
       }
     }

     const isPrimaryAgent = isFactory(source) && source.mode === "primary"

    const resolution = applyModelResolution({
      uiSelectedModel: (isPrimaryAgent && !override?.model) ? uiSelectedModel : undefined,
      userModel: override?.model,
      requirement,
      availableModels,
      systemDefaultModel,
    })
    if (!resolution) continue
    const { model, variant: resolvedVariant } = resolution

    let config = buildAgent(source, model, mergedCategories, gitMasterConfig, browserProvider, disabledSkills)
    
    if (resolvedVariant) {
      config = { ...config, variant: resolvedVariant }
    }

    const overrideCategory = (override as Record<string, unknown> | undefined)?.category as string | undefined
    if (overrideCategory) {
      config = applyCategoryOverride(config, overrideCategory, mergedCategories)
    }

    if (agentName === "researcher") {
      config = applyEnvironmentContext(config, directory)
    }

    config = applyOverrides(config, override, mergedCategories)

        pendingAgentConfigs.set(name, config)
    log(`[createBuiltinAgents] Registered ${name} with model ${config.model}`)

    const metadata = agentMetadata[agentName]
    if (metadata) {
      availableAgents.push({
        name: agentName,
        description: config.description ?? "",
        metadata,
      })
    }
  }

   // Handle Orchestrator
   const orchestratorOverride = agentOverrides["orchestrator"]
   const orchestratorRequirement = AGENT_MODEL_REQUIREMENTS["orchestrator"]
   const hasOrchestratorExplicitConfig = orchestratorOverride !== undefined
   const meetsOrchestratorAnyModelRequirement =
     !orchestratorRequirement?.requiresAnyModel ||
     hasOrchestratorExplicitConfig ||
     isFirstRunNoCache ||
     isAnyFallbackModelAvailable(orchestratorRequirement.fallbackChain, availableModels)

   if (!disabledAgents.includes("orchestrator") && meetsOrchestratorAnyModelRequirement) {
    let orchestratorResolution = applyModelResolution({
      uiSelectedModel: orchestratorOverride?.model ? undefined : uiSelectedModel,
      userModel: orchestratorOverride?.model,
      requirement: orchestratorRequirement,
      availableModels,
      systemDefaultModel,
    })

    if (isFirstRunNoCache && !orchestratorOverride?.model && !uiSelectedModel) {
      orchestratorResolution = getFirstFallbackModel(orchestratorRequirement)
    }

    if (orchestratorResolution) {
      const { model: orchestratorModel, variant: orchestratorResolvedVariant } = orchestratorResolution

      let orchestratorConfig = createOrchestratorAgent(
        orchestratorModel,
        availableAgents,
        undefined,
        availableSkills,
        availableCategories
      )

      if (orchestratorResolvedVariant) {
        orchestratorConfig = { ...orchestratorConfig, variant: orchestratorResolvedVariant }
      }

      orchestratorConfig = applyOverrides(orchestratorConfig, orchestratorOverride, mergedCategories)
      orchestratorConfig = applyEnvironmentContext(orchestratorConfig, directory)

      result["orchestrator"] = orchestratorConfig
    }
   }

  // Handle Developer
  if (!disabledAgents.includes("developer")) {
    const developerOverride = agentOverrides["developer"]
    const developerRequirement = AGENT_MODEL_REQUIREMENTS["developer"]
    const hasDeveloperExplicitConfig = developerOverride !== undefined

    const hasRequiredProvider =
      !developerRequirement?.requiresProvider ||
      hasDeveloperExplicitConfig ||
      isFirstRunNoCache ||
      isAnyProviderConnected(developerRequirement.requiresProvider, availableModels)

    if (hasRequiredProvider) {
      let developerResolution = applyModelResolution({
        userModel: developerOverride?.model,
        requirement: developerRequirement,
        availableModels,
        systemDefaultModel,
      })

      if (isFirstRunNoCache && !developerOverride?.model) {
        developerResolution = getFirstFallbackModel(developerRequirement)
      }

      if (developerResolution) {
        const { model: developerModel, variant: developerResolvedVariant } = developerResolution

        let developerConfig = createDeveloperAgent(
          developerModel,
          availableAgents,
          undefined,
          availableSkills,
          availableCategories
        )

        developerConfig = { ...developerConfig, variant: developerResolvedVariant ?? "medium" }

        const hepOverrideCategory = (developerOverride as Record<string, unknown> | undefined)?.category as string | undefined
        if (hepOverrideCategory) {
          developerConfig = applyCategoryOverride(developerConfig, hepOverrideCategory, mergedCategories)
        }

        if (directory && developerConfig.prompt) {
          const envContext = createEnvContext()
          developerConfig = { ...developerConfig, prompt: developerConfig.prompt + envContext }
        }

        if (developerOverride) {
          developerConfig = mergeAgentConfig(developerConfig, developerOverride)
        }

        result["developer"] = developerConfig
      }
    }
   }

   // Add pending agents
   for (const [name, config] of pendingAgentConfigs) {
     result[name] = config
   }

    // Handle Senior Orchestrator
    if (!disabledAgents.includes("senior-orchestrator")) {
      const seniorOrchestratorOverride = agentOverrides["senior-orchestrator"]
      const seniorOrchestratorRequirement = AGENT_MODEL_REQUIREMENTS["senior-orchestrator"]

      const seniorOrchestratorResolution = applyModelResolution({
        uiSelectedModel: seniorOrchestratorOverride?.model ? undefined : uiSelectedModel,
        userModel: seniorOrchestratorOverride?.model,
        requirement: seniorOrchestratorRequirement,
        availableModels,
        systemDefaultModel,
      })
    
    if (seniorOrchestratorResolution) {
      const { model: seniorOrchestratorModel, variant: seniorOrchestratorResolvedVariant } = seniorOrchestratorResolution

      let seniorOrchestratorConfig = createSeniorOrchestratorAgent({
        model: seniorOrchestratorModel,
        availableAgents,
        availableSkills,
        userCategories: categories,
      })

      if (seniorOrchestratorResolvedVariant) {
        seniorOrchestratorConfig = { ...seniorOrchestratorConfig, variant: seniorOrchestratorResolvedVariant }
      }

      seniorOrchestratorConfig = applyOverrides(seniorOrchestratorConfig, seniorOrchestratorOverride, mergedCategories)

      result["senior-orchestrator"] = seniorOrchestratorConfig
    }
   }

   return result
 }
