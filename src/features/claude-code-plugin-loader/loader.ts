import { existsSync, readdirSync, readFileSync } from "fs"
import { homedir } from "os"
import { join, basename } from "path"
import type { AgentConfig } from "@opencode-ai/sdk"
import { parseFrontmatter } from "../../shared/frontmatter"
import { sanitizeModelField } from "../../shared/model-sanitizer"
import { isMarkdownFile, resolveSymlink } from "../../shared/file-utils"
import { log } from "../../shared/logger"
import { expandEnvVarsInObject } from "../claude-code-mcp-loader/env-expander"
import { transformMcpServer } from "../claude-code-mcp-loader/transformer"
import type { CommandDefinition, CommandFrontmatter } from "../claude-code-command-loader/types"
import type { SkillMetadata } from "../claude-code-skill-loader/types"
import type { AgentFrontmatter } from "../claude-code-agent-loader/types"
import type { ClaudeCodeMcpConfig, McpServerConfig } from "../claude-code-mcp-loader/types"
import type {
  InstalledPluginsDatabase,
  PluginManifest,
  LoadedPlugin,
  PluginLoadResult,
  PluginLoadError,
  PluginScope,
  HooksConfig,
} from "./types"

const CLAUDE_PLUGIN_ROOT_VAR = "${CLAUDE_PLUGIN_ROOT}"

function getPluginsBaseDir(): string {
  // Allow override for testing
  if (process.env.CLAUDE_PLUGINS_HOME) {
    return process.env.CLAUDE_PLUGINS_HOME
  }
  return join(homedir(), ".claude", "plugins")
}

function getInstalledPluginsPath(): string {
  return join(getPluginsBaseDir(), "installed_plugins.json")
}

function resolvePluginPath(path: string, pluginRoot: string): string {
  return path.replace(CLAUDE_PLUGIN_ROOT_VAR, pluginRoot)
}

function resolvePluginPaths<T>(obj: T, pluginRoot: string): T {
  if (obj === null || obj === undefined) return obj
  if (typeof obj === "string") {
    return resolvePluginPath(obj, pluginRoot) as T
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => resolvePluginPaths(item, pluginRoot)) as T
  }
  if (typeof obj === "object") {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      result[key] = resolvePluginPaths(value, pluginRoot)
    }
    return result as T
  }
  return obj
}

function loadInstalledPlugins(): InstalledPluginsDatabase | null {
  const dbPath = getInstalledPluginsPath()
  if (!existsSync(dbPath)) {
    return null
  }

  try {
    const content = readFileSync(dbPath, "utf-8")
    return JSON.parse(content) as InstalledPluginsDatabase
  } catch (error) {
    log("Failed to load installed plugins database", error)
    return null
  }
}

function loadPluginManifest(installPath: string): PluginManifest | null {
  const manifestPath = join(installPath, ".claude-plugin", "plugin.json")
  if (!existsSync(manifestPath)) {
    return null
  }

  try {
    const content = readFileSync(manifestPath, "utf-8")
    return JSON.parse(content) as PluginManifest
  } catch (error) {
    log(`Failed to load plugin manifest from ${manifestPath}`, error)
    return null
  }
}

export function discoverInstalledPlugins(): PluginLoadResult {
  const db = loadInstalledPlugins()
  const plugins: LoadedPlugin[] = []
  const errors: PluginLoadError[] = []

  if (!db || !db.plugins) {
    return { plugins, errors }
  }

  for (const [pluginKey, installations] of Object.entries(db.plugins)) {
    if (!installations || installations.length === 0) continue

    const installation = installations[0]
    const { installPath, scope, version } = installation

    if (!existsSync(installPath)) {
      errors.push({
        pluginKey,
        installPath,
        error: "Plugin installation path does not exist",
      })
      continue
    }

    const manifest = loadPluginManifest(installPath)
    if (!manifest) {
      errors.push({
        pluginKey,
        installPath,
        error: "Failed to load plugin manifest",
      })
      continue
    }

    const loadedPlugin: LoadedPlugin = {
      name: manifest.name,
      version: version || manifest.version || "unknown",
      scope: scope as PluginScope,
      installPath,
      manifest,
    }

    if (existsSync(join(installPath, "commands"))) {
      loadedPlugin.commandsDir = join(installPath, "commands")
    }
    if (existsSync(join(installPath, "agents"))) {
      loadedPlugin.agentsDir = join(installPath, "agents")
    }
    if (existsSync(join(installPath, "skills"))) {
      loadedPlugin.skillsDir = join(installPath, "skills")
    }

    const hooksPath = join(installPath, "hooks", "hooks.json")
    if (existsSync(hooksPath)) {
      loadedPlugin.hooksPath = hooksPath
    }

    const mcpPath = join(installPath, ".mcp.json")
    if (existsSync(mcpPath)) {
      loadedPlugin.mcpPath = mcpPath
    }

    plugins.push(loadedPlugin)
    log(`Discovered plugin: ${manifest.name}@${version} (${scope})`, { installPath })
  }

  return { plugins, errors }
}

export function loadPluginCommands(
  plugins: LoadedPlugin[]
): Record<string, CommandDefinition> {
  const commands: Record<string, CommandDefinition> = {}

  for (const plugin of plugins) {
    if (!plugin.commandsDir || !existsSync(plugin.commandsDir)) continue

    const entries = readdirSync(plugin.commandsDir, { withFileTypes: true })

    for (const entry of entries) {
      if (!isMarkdownFile(entry)) continue

      const commandPath = join(plugin.commandsDir, entry.name)
      const commandName = basename(entry.name, ".md")
      const namespacedName = `${plugin.name}:${commandName}`

      try {
        const content = readFileSync(commandPath, "utf-8")
        const { data, body } = parseFrontmatter<CommandFrontmatter>(content)

        const wrappedTemplate = `<command-instruction>
${body.trim()}
</command-instruction>

<user-request>
$ARGUMENTS
</user-request>`

        const formattedDescription = `(plugin: ${plugin.name}) ${data.description || ""}`

        commands[namespacedName] = {
          name: namespacedName,
          description: formattedDescription,
          template: wrappedTemplate,
          agent: data.agent,
          model: sanitizeModelField(data.model, "claude-code"),
          subtask: data.subtask,
          argumentHint: data["argument-hint"],
        }

        log(`Loaded plugin command: ${namespacedName}`, { path: commandPath })
      } catch (error) {
        log(`Failed to load plugin command: ${commandPath}`, error)
      }
    }
  }

  return commands
}

export function loadPluginSkillsAsCommands(
  plugins: LoadedPlugin[]
): Record<string, CommandDefinition> {
  const skills: Record<string, CommandDefinition> = {}

  for (const plugin of plugins) {
    if (!plugin.skillsDir || !existsSync(plugin.skillsDir)) continue

    const entries = readdirSync(plugin.skillsDir, { withFileTypes: true })

    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue

      const skillPath = join(plugin.skillsDir, entry.name)
      if (!entry.isDirectory() && !entry.isSymbolicLink()) continue

      const resolvedPath = resolveSymlink(skillPath)
      const skillMdPath = join(resolvedPath, "SKILL.md")
      if (!existsSync(skillMdPath)) continue

      try {
        const content = readFileSync(skillMdPath, "utf-8")
        const { data, body } = parseFrontmatter<SkillMetadata>(content)

        const skillName = data.name || entry.name
        const namespacedName = `${plugin.name}:${skillName}`
        const originalDescription = data.description || ""
        const formattedDescription = `(plugin: ${plugin.name} - Skill) ${originalDescription}`

        const wrappedTemplate = `<skill-instruction>
Base directory for this skill: ${resolvedPath}/
File references (@path) in this skill are relative to this directory.

${body.trim()}
</skill-instruction>

<user-request>
$ARGUMENTS
</user-request>`

        skills[namespacedName] = {
          name: namespacedName,
          description: formattedDescription,
          template: wrappedTemplate,
          model: sanitizeModelField(data.model),
        }

        log(`Loaded plugin skill: ${namespacedName}`, { path: resolvedPath })
      } catch (error) {
        log(`Failed to load plugin skill: ${skillPath}`, error)
      }
    }
  }

  return skills
}

function parseToolsConfig(toolsStr?: string): Record<string, boolean> | undefined {
  if (!toolsStr) return undefined

  const tools = toolsStr.split(",").map((t) => t.trim()).filter(Boolean)
  if (tools.length === 0) return undefined

  const result: Record<string, boolean> = {}
  for (const tool of tools) {
    result[tool.toLowerCase()] = true
  }
  return result
}

export function loadPluginAgents(
  plugins: LoadedPlugin[]
): Record<string, AgentConfig> {
  const agents: Record<string, AgentConfig> = {}

  for (const plugin of plugins) {
    if (!plugin.agentsDir || !existsSync(plugin.agentsDir)) continue

    const entries = readdirSync(plugin.agentsDir, { withFileTypes: true })

    for (const entry of entries) {
      if (!isMarkdownFile(entry)) continue

      const agentPath = join(plugin.agentsDir, entry.name)
      const agentName = basename(entry.name, ".md")
      const namespacedName = `${plugin.name}:${agentName}`

      try {
        const content = readFileSync(agentPath, "utf-8")
        const { data, body } = parseFrontmatter<AgentFrontmatter>(content)

        const name = data.name || agentName
        const originalDescription = data.description || ""
        const formattedDescription = `(plugin: ${plugin.name}) ${originalDescription}`

        const config: AgentConfig = {
          description: formattedDescription,
          mode: "subagent",
          prompt: body.trim(),
        }

        const toolsConfig = parseToolsConfig(data.tools)
        if (toolsConfig) {
          config.tools = toolsConfig
        }

        agents[namespacedName] = config
        log(`Loaded plugin agent: ${namespacedName}`, { path: agentPath })
      } catch (error) {
        log(`Failed to load plugin agent: ${agentPath}`, error)
      }
    }
  }

  return agents
}

export async function loadPluginMcpServers(
  plugins: LoadedPlugin[]
): Promise<Record<string, McpServerConfig>> {
  const servers: Record<string, McpServerConfig> = {}

  for (const plugin of plugins) {
    if (!plugin.mcpPath || !existsSync(plugin.mcpPath)) continue

    try {
      const content = await Bun.file(plugin.mcpPath).text()
      let config = JSON.parse(content) as ClaudeCodeMcpConfig

      config = resolvePluginPaths(config, plugin.installPath)
      config = expandEnvVarsInObject(config)

      if (!config.mcpServers) continue

      for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
        if (serverConfig.disabled) {
          log(`Skipping disabled MCP server "${name}" from plugin ${plugin.name}`)
          continue
        }

        try {
          const transformed = transformMcpServer(name, serverConfig)
          const namespacedName = `${plugin.name}:${name}`
          servers[namespacedName] = transformed
          log(`Loaded plugin MCP server: ${namespacedName}`, { path: plugin.mcpPath })
        } catch (error) {
          log(`Failed to transform plugin MCP server "${name}"`, error)
        }
      }
    } catch (error) {
      log(`Failed to load plugin MCP config: ${plugin.mcpPath}`, error)
    }
  }

  return servers
}

export function loadPluginHooksConfigs(
  plugins: LoadedPlugin[]
): HooksConfig[] {
  const configs: HooksConfig[] = []

  for (const plugin of plugins) {
    if (!plugin.hooksPath || !existsSync(plugin.hooksPath)) continue

    try {
      const content = readFileSync(plugin.hooksPath, "utf-8")
      let config = JSON.parse(content) as HooksConfig

      config = resolvePluginPaths(config, plugin.installPath)

      configs.push(config)
      log(`Loaded plugin hooks config from ${plugin.name}`, { path: plugin.hooksPath })
    } catch (error) {
      log(`Failed to load plugin hooks config: ${plugin.hooksPath}`, error)
    }
  }

  return configs
}

export interface PluginComponentsResult {
  commands: Record<string, CommandDefinition>
  skills: Record<string, CommandDefinition>
  agents: Record<string, AgentConfig>
  mcpServers: Record<string, McpServerConfig>
  hooksConfigs: HooksConfig[]
  plugins: LoadedPlugin[]
  errors: PluginLoadError[]
}

export async function loadAllPluginComponents(): Promise<PluginComponentsResult> {
  const { plugins, errors } = discoverInstalledPlugins()

  const commands = loadPluginCommands(plugins)
  const skills = loadPluginSkillsAsCommands(plugins)
  const agents = loadPluginAgents(plugins)
  const mcpServers = await loadPluginMcpServers(plugins)
  const hooksConfigs = loadPluginHooksConfigs(plugins)

  log(`Loaded ${plugins.length} plugins with ${Object.keys(commands).length} commands, ${Object.keys(skills).length} skills, ${Object.keys(agents).length} agents, ${Object.keys(mcpServers).length} MCP servers`)

  return {
    commands,
    skills,
    agents,
    mcpServers,
    hooksConfigs,
    plugins,
    errors,
  }
}
