export type LspSpawnMode = "bun" | "node"

/**
 * Select how LSP servers are spawned.
 *
 * Background:
 * - Native Windows + Bun has had intermittent segfaults around process spawning/stdio pipes.
 * - Using the Node-compatible child_process implementation tends to be more stable.
 */
export function getLspSpawnMode(
  platform: NodeJS.Platform = process.platform,
  env: NodeJS.ProcessEnv = process.env
): LspSpawnMode {
  const raw = (env.OMO_LSP_SPAWN_MODE ?? env.OH_MY_OPENCODE_LSP_SPAWN_MODE ?? "").toLowerCase()
  if (raw === "bun" || raw === "node") return raw

  // Default: prefer Node mode on Windows for stability.
  if (platform === "win32") return "node"
  return "bun"
}
