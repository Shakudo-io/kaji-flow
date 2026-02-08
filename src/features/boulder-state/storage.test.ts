import { describe, it, expect, beforeEach, afterEach } from "bun:test"
import {
  readBoulderState,
  writeBoulderState,
  clearBoulderState,
  getBoulderFilePath,
} from "./storage"
import { join } from "path"
import { existsSync, mkdirSync, rmdirSync, writeFileSync } from "fs"

const TEST_DIR = join(process.cwd(), ".test-boulder-storage")
const TEST_SESSION_ID = "test-session-123"

describe("boulder-state storage", () => {
  beforeEach(() => {
    if (existsSync(TEST_DIR)) {
      rmdirSync(TEST_DIR, { recursive: true })
    }
    mkdirSync(TEST_DIR, { recursive: true })
  })

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmdirSync(TEST_DIR, { recursive: true })
    }
  })

  it("writes and reads boulder state for a session", () => {
    const state = {
      active_plan: "/path/to/plan.md",
      started_at: "2024-01-01T00:00:00Z",
      session_ids: [TEST_SESSION_ID],
      plan_name: "test-plan",
    }

    const written = writeBoulderState(TEST_DIR, TEST_SESSION_ID, state)
    expect(written).toBe(true)

    const readState = readBoulderState(TEST_DIR, TEST_SESSION_ID)
    expect(readState).toEqual(state)
  })

  it("returns null if state does not exist", () => {
    const readState = readBoulderState(TEST_DIR, "non-existent-session")
    expect(readState).toBeNull()
  })

  it("clears boulder state", () => {
    const state = {
      active_plan: "/path/to/plan.md",
      started_at: "2024-01-01T00:00:00Z",
      session_ids: [TEST_SESSION_ID],
      plan_name: "test-plan",
    }

    writeBoulderState(TEST_DIR, TEST_SESSION_ID, state)
    const cleared = clearBoulderState(TEST_DIR, TEST_SESSION_ID)
    expect(cleared).toBe(true)

    const readState = readBoulderState(TEST_DIR, TEST_SESSION_ID)
    expect(readState).toBeNull()
  })
})
