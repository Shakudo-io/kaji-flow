import { join } from "path"
import { existsSync, readFileSync } from "fs"
import { homedir } from "os"
import { log } from "./logger"
import { parseJsonc } from "./jsonc-parser"

export interface OpenCodeConfig {
  provider?: Record<string, unknown>
}

export function readOpenCodeConfigProviders(): string[] {
  try {
    const configPath = join(homedir(), ".config", "opencode", "opencode.json")
    if (!existsSync(configPath)) {
      log("[opencode-config-reader] opencode.json not found", { path: configPath })
      return []
    }

    const content = readFileSync(configPath, "utf-8")
    const config = parseJsonc<OpenCodeConfig>(content)
    
    if (config?.provider) {
      const providers = Object.keys(config.provider)
      log("[opencode-config-reader] Found providers in opencode.json", { providers })
      return providers
    }
  } catch (error) {
    log("[opencode-config-reader] Failed to read opencode.json", { error: String(error) })
  }
  return []
}
