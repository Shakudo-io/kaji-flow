import { describe, test, expect } from "bun:test"
import { getLspSpawnMode } from "./spawn-mode"

describe("getLspSpawnMode", () => {
  test("defaults to node on Windows", () => {
    expect(getLspSpawnMode("win32", {} as any)).toBe("node")
  })

  test("defaults to bun on non-Windows", () => {
    expect(getLspSpawnMode("darwin", {} as any)).toBe("bun")
    expect(getLspSpawnMode("linux", {} as any)).toBe("bun")
  })

  test("respects OMO_LSP_SPAWN_MODE env", () => {
    expect(getLspSpawnMode("win32", { OMO_LSP_SPAWN_MODE: "bun" } as any)).toBe("bun")
    expect(getLspSpawnMode("darwin", { OMO_LSP_SPAWN_MODE: "node" } as any)).toBe("node")
  })

  test("respects OH_MY_OPENCODE_LSP_SPAWN_MODE env", () => {
    expect(getLspSpawnMode("win32", { OH_MY_OPENCODE_LSP_SPAWN_MODE: "bun" } as any)).toBe("bun")
  })
})
