import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from "node:fs"
import { dirname, join, basename, isAbsolute } from "node:path"
import type { BoulderState, PlanProgress } from "./types"
import { BOULDER_DIR, BOULDER_SESSIONS_DIR, BOULDER_FILE_LEGACY, PLANNER_PLANS_DIR, SPECKIT_TASKS_FILE } from "./constants"

export function getBoulderFilePath(directory: string, sessionId: string): string {
  return join(directory, BOULDER_SESSIONS_DIR, `${sessionId}.json`)
}

export function getLegacyBoulderFilePath(directory: string): string {
  return join(directory, BOULDER_DIR, BOULDER_FILE_LEGACY)
}

export function readBoulderState(directory: string, sessionId: string): BoulderState | null {
  const filePath = getBoulderFilePath(directory, sessionId)
  
  if (existsSync(filePath)) {
    try {
      const content = readFileSync(filePath, "utf-8")
      return JSON.parse(content) as BoulderState
    } catch {
      return null
    }
  }

  // Fallback to legacy singleton if it contains this session ID?
  // Or migrate it?
  // For simplicity, we check if legacy file exists and has this session.
  const legacyPath = getLegacyBoulderFilePath(directory)
  if (existsSync(legacyPath)) {
    try {
      const content = readFileSync(legacyPath, "utf-8")
      const legacyState = JSON.parse(content) as BoulderState
      if (legacyState.session_ids?.includes(sessionId)) {
        // Migration: Clone to session file
        // We do NOT modify legacy file here to avoid race conditions, just copy state.
        // But we should probably write it to the new path so next read is fast.
        writeBoulderState(directory, sessionId, legacyState)
        return legacyState
      }
    } catch {
      // Ignore legacy read errors
    }
  }

  return null
}

export function writeBoulderState(directory: string, sessionId: string, state: BoulderState): boolean {
  const filePath = getBoulderFilePath(directory, sessionId)

  try {
    const dir = dirname(filePath)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }

    // Ensure session_ids includes this session (redundant but safe)
    if (!state.session_ids.includes(sessionId)) {
      state.session_ids.push(sessionId)
    }

    writeFileSync(filePath, JSON.stringify(state, null, 2), "utf-8")
    return true
  } catch {
    return false
  }
}

export function appendSessionId(directory: string, sessionId: string, targetSessionId?: string): BoulderState | null {
  // If targetSessionId is provided, we are "joining" another session's boulder.
  // But with isolation, "joining" means copying their state to our file?
  // Or do we support shared state?
  // The requirement is "Session-Isolated State".
  // So appendSessionId might be obsolete or mean "Initialize my state from existing".
  
  // For now, let's assume standard flow: read OWN state.
  const state = readBoulderState(directory, sessionId)
  if (!state) return null
  
  // No-op if already isolated
  return state
}

export function clearBoulderState(directory: string, sessionId: string): boolean {
  const filePath = getBoulderFilePath(directory, sessionId)

  try {
    if (existsSync(filePath)) {
      unlinkSync(filePath)
    }
    return true
  } catch {
    return false
  }
}

export function findPlannerPlans(directory: string): string[] {
  const plansDir = join(directory, PLANNER_PLANS_DIR)

  if (!existsSync(plansDir)) {
    return []
  }

  try {
    const files = readdirSync(plansDir)
    return files
      .filter((f) => f.endsWith(".md"))
      .map((f) => join(plansDir, f))
      .sort((a, b) => {
        const aStat = require("node:fs").statSync(a)
        const bStat = require("node:fs").statSync(b)
        return bStat.mtimeMs - aStat.mtimeMs
      })
  } catch {
    return []
  }
}

export function getPlanName(planPath: string): string {
  if (basename(planPath) === SPECKIT_TASKS_FILE) {
    const parentDir = basename(dirname(planPath))
    return parentDir
  }
  return basename(planPath, ".md")
}

export function createBoulderState(
  planPath: string,
  sessionId: string,
  agent?: string
): BoulderState {
  return {
    active_plan: planPath,
    started_at: new Date().toISOString(),
    session_ids: [sessionId],
    plan_name: getPlanName(planPath),
    ...(agent !== undefined ? { agent } : {}),
  }
}

export function getPlanProgress(planPath: string): PlanProgress {
  if (!existsSync(planPath)) {
    return { total: 0, completed: 0, isComplete: true }
  }

  try {
    const content = readFileSync(planPath, "utf-8")
    const uncheckedMatches = content.match(/^[-*]\s*\[\s*\]/gm) || []
    const checkedMatches = content.match(/^[-*]\s*\[[xX]\]/gm) || []

    const total = uncheckedMatches.length + checkedMatches.length
    const completed = checkedMatches.length

    return {
      total,
      completed,
      isComplete: total === 0 || completed === total,
    }
  } catch {
    return { total: 0, completed: 0, isComplete: true }
  }
}
