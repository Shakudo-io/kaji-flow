import { describe, expect, test, beforeEach, afterEach, mock } from "bun:test"
import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { randomUUID } from "node:crypto"
import { SYSTEM_DIRECTIVE_PREFIX } from "../../shared/system-directive"
import { clearSessionAgent } from "../../features/claude-code-session-state"

const TEST_STORAGE_ROOT = join(tmpdir(), `planner-md-only-${randomUUID()}`)
const TEST_MESSAGE_STORAGE = join(TEST_STORAGE_ROOT, "message")
const TEST_PART_STORAGE = join(TEST_STORAGE_ROOT, "part")

mock.module("../../features/hook-message-injector/constants", () => ({
  OPENCODE_STORAGE: TEST_STORAGE_ROOT,
  MESSAGE_STORAGE: TEST_MESSAGE_STORAGE,
  PART_STORAGE: TEST_PART_STORAGE,
}))

const { createPlannerMdOnlyHook } = await import("./index")
const { MESSAGE_STORAGE } = await import("../../features/hook-message-injector")

describe("planner-md-only", () => {
  const TEST_SESSION_ID = "test-session-planner"
  let testMessageDir: string

  function createMockPluginInput() {
    return {
      client: {},
      directory: "/tmp/test",
    } as never
  }

  function setupMessageStorage(sessionID: string, agent: string): void {
    testMessageDir = join(MESSAGE_STORAGE, sessionID)
    mkdirSync(testMessageDir, { recursive: true })
    const messageContent = {
      agent,
      model: { providerID: "test", modelID: "test-model" },
    }
    writeFileSync(
      join(testMessageDir, "msg_001.json"),
      JSON.stringify(messageContent)
    )
  }

  afterEach(() => {
    clearSessionAgent(TEST_SESSION_ID)
    if (testMessageDir) {
      try {
        rmSync(testMessageDir, { recursive: true, force: true })
      } catch {
        // ignore
      }
    }
    rmSync(TEST_STORAGE_ROOT, { recursive: true, force: true })
  })

   describe("with Planner agent in message storage", () => {
     beforeEach(() => {
       setupMessageStorage(TEST_SESSION_ID, "planner")
     })

    test("should block Planner from writing non-.md files", async () => {
      // given
      const hook = createPlannerMdOnlyHook(createMockPluginInput())
      const input = {
        tool: "Write",
        sessionID: TEST_SESSION_ID,
        callID: "call-1",
      }
      const output = {
        args: { filePath: "/path/to/file.ts" },
      }

      // when / #then
      await expect(
        hook["tool.execute.before"](input, output)
      ).rejects.toThrow("can only write/edit .md files")
    })

    test("should allow Planner to write .md files inside .sisyphus/", async () => {
      // given
      const hook = createPlannerMdOnlyHook(createMockPluginInput())
      const input = {
        tool: "Write",
        sessionID: TEST_SESSION_ID,
        callID: "call-1",
      }
      const output = {
        args: { filePath: "/tmp/test/.sisyphus/plans/work-plan.md" },
      }

      // when / #then
      await expect(
        hook["tool.execute.before"](input, output)
      ).resolves.toBeUndefined()
    })

    test("should inject workflow reminder when Planner writes to .sisyphus/plans/", async () => {
      // given
      const hook = createPlannerMdOnlyHook(createMockPluginInput())
      const input = {
        tool: "Write",
        sessionID: TEST_SESSION_ID,
        callID: "call-1",
      }
      const output: { args: Record<string, unknown>; message?: string } = {
        args: { filePath: "/tmp/test/.sisyphus/plans/work-plan.md" },
      }

      // when
      await hook["tool.execute.before"](input, output)

      // then
      expect(output.message).toContain("PLANNER MANDATORY WORKFLOW REMINDER")
      expect(output.message).toContain("INTERVIEW")
      expect(output.message).toContain("METIS CONSULTATION")
      expect(output.message).toContain("MOMUS REVIEW")
    })

    test("should NOT inject workflow reminder for .sisyphus/drafts/", async () => {
      // given
      const hook = createPlannerMdOnlyHook(createMockPluginInput())
      const input = {
        tool: "Write",
        sessionID: TEST_SESSION_ID,
        callID: "call-1",
      }
      const output: { args: Record<string, unknown>; message?: string } = {
        args: { filePath: "/tmp/test/.sisyphus/drafts/notes.md" },
      }

      // when
      await hook["tool.execute.before"](input, output)

      // then
      expect(output.message).toBeUndefined()
    })

    test("should block Planner from writing .md files outside .sisyphus/", async () => {
      // given
      const hook = createPlannerMdOnlyHook(createMockPluginInput())
      const input = {
        tool: "Write",
        sessionID: TEST_SESSION_ID,
        callID: "call-1",
      }
      const output = {
        args: { filePath: "/path/to/README.md" },
      }

      // when / #then
      await expect(
        hook["tool.execute.before"](input, output)
      ).rejects.toThrow("can only write/edit .md files inside .sisyphus/")
    })

    test("should block Edit tool for non-.md files", async () => {
      // given
      const hook = createPlannerMdOnlyHook(createMockPluginInput())
      const input = {
        tool: "Edit",
        sessionID: TEST_SESSION_ID,
        callID: "call-1",
      }
      const output = {
        args: { filePath: "/path/to/code.py" },
      }

      // when / #then
      await expect(
        hook["tool.execute.before"](input, output)
      ).rejects.toThrow("can only write/edit .md files")
    })

    test("should block bash commands from Planner", async () => {
      // given
      const hook = createPlannerMdOnlyHook(createMockPluginInput())
      const input = {
        tool: "bash",
        sessionID: TEST_SESSION_ID,
        callID: "call-1",
      }
      const output = {
        args: { command: "echo test" },
      }

      // when / #then
      await expect(
        hook["tool.execute.before"](input, output)
      ).rejects.toThrow("cannot execute bash commands")
    })

    test("should not affect non-blocked tools", async () => {
      // given
      const hook = createPlannerMdOnlyHook(createMockPluginInput())
      const input = {
        tool: "Read",
        sessionID: TEST_SESSION_ID,
        callID: "call-1",
      }
      const output = {
        args: { filePath: "/path/to/file.ts" },
      }

      // when / #then
      await expect(
        hook["tool.execute.before"](input, output)
      ).resolves.toBeUndefined()
    })

    test("should handle missing filePath gracefully", async () => {
      // given
      const hook = createPlannerMdOnlyHook(createMockPluginInput())
      const input = {
        tool: "Write",
        sessionID: TEST_SESSION_ID,
        callID: "call-1",
      }
      const output = {
        args: {},
      }

      // when / #then
      await expect(
        hook["tool.execute.before"](input, output)
      ).resolves.toBeUndefined()
    })

    test("should inject read-only warning when Planner calls task", async () => {
      // given
      const hook = createPlannerMdOnlyHook(createMockPluginInput())
      const input = {
        tool: "task",
        sessionID: TEST_SESSION_ID,
        callID: "call-1",
      }
      const output = {
        args: { prompt: "Analyze this codebase" },
      }

      // when
      await hook["tool.execute.before"](input, output)

      // then
      expect(output.args.prompt).toContain(SYSTEM_DIRECTIVE_PREFIX)
      expect(output.args.prompt).toContain("DO NOT modify any files")
    })

    test("should inject read-only warning when Planner calls task", async () => {
      // given
      const hook = createPlannerMdOnlyHook(createMockPluginInput())
      const input = {
        tool: "task",
        sessionID: TEST_SESSION_ID,
        callID: "call-1",
      }
      const output = {
        args: { prompt: "Research this library" },
      }

      // when
      await hook["tool.execute.before"](input, output)

      // then
      expect(output.args.prompt).toContain(SYSTEM_DIRECTIVE_PREFIX)
    })

    test("should inject read-only warning when Planner calls call_kaji_agent", async () => {
      // given
      const hook = createPlannerMdOnlyHook(createMockPluginInput())
      const input = {
        tool: "call_kaji_agent",
        sessionID: TEST_SESSION_ID,
        callID: "call-1",
      }
      const output = {
        args: { prompt: "Find implementation examples" },
      }

      // when
      await hook["tool.execute.before"](input, output)

      // then
      expect(output.args.prompt).toContain(SYSTEM_DIRECTIVE_PREFIX)
    })

    test("should not double-inject warning if already present", async () => {
      // given
      const hook = createPlannerMdOnlyHook(createMockPluginInput())
      const input = {
        tool: "task",
        sessionID: TEST_SESSION_ID,
        callID: "call-1",
      }
      const promptWithWarning = `Some prompt ${SYSTEM_DIRECTIVE_PREFIX} already here`
      const output = {
        args: { prompt: promptWithWarning },
      }

      // when
      await hook["tool.execute.before"](input, output)

      // then
      const occurrences = (output.args.prompt as string).split(SYSTEM_DIRECTIVE_PREFIX).length - 1
      expect(occurrences).toBe(1)
    })
  })

  describe("with non-Planner agent in message storage", () => {
    beforeEach(() => {
      setupMessageStorage(TEST_SESSION_ID, "sisyphus")
    })

    test("should not affect non-Planner agents", async () => {
      // given
      const hook = createPlannerMdOnlyHook(createMockPluginInput())
      const input = {
        tool: "Write",
        sessionID: TEST_SESSION_ID,
        callID: "call-1",
      }
      const output = {
        args: { filePath: "/path/to/file.ts" },
      }

      // when / #then
      await expect(
        hook["tool.execute.before"](input, output)
      ).resolves.toBeUndefined()
    })

    test("should not inject warning for non-Planner agents calling task", async () => {
      // given
      const hook = createPlannerMdOnlyHook(createMockPluginInput())
      const input = {
        tool: "task",
        sessionID: TEST_SESSION_ID,
        callID: "call-1",
      }
      const originalPrompt = "Implement this feature"
      const output = {
        args: { prompt: originalPrompt },
      }

      // when
      await hook["tool.execute.before"](input, output)

      // then
      expect(output.args.prompt).toBe(originalPrompt)
      expect(output.args.prompt).not.toContain(SYSTEM_DIRECTIVE_PREFIX)
    })
  })

  describe("boulder state priority over message files (fixes #927)", () => {
    const BOULDER_DIR = join(tmpdir(), `boulder-test-${randomUUID()}`)
    const BOULDER_FILE = join(BOULDER_DIR, ".sisyphus", "boulder.json")

    beforeEach(() => {
      mkdirSync(join(BOULDER_DIR, ".sisyphus"), { recursive: true })
    })

    afterEach(() => {
      rmSync(BOULDER_DIR, { recursive: true, force: true })
    })

    //#given session was started with planner (first message), but /start-work set boulder agent to atlas
    //#when user types "continue" after interruption (memory cleared, falls back to message files)
    //#then should use boulder state agent (atlas), not message file agent (planner)
    test("should prioritize boulder agent over message file agent", async () => {
      // given - planner in message files (from /plan)
      setupMessageStorage(TEST_SESSION_ID, "planner")
      
      // given - atlas in boulder state (from /start-work)
      writeFileSync(BOULDER_FILE, JSON.stringify({
        active_plan: "/test/plan.md",
        started_at: new Date().toISOString(),
        session_ids: [TEST_SESSION_ID],
        plan_name: "test-plan",
        agent: "atlas"
      }))

      const hook = createPlannerMdOnlyHook({
        client: {},
        directory: BOULDER_DIR,
      } as never)

      const input = {
        tool: "Write",
        sessionID: TEST_SESSION_ID,
        callID: "call-1",
      }
      const output = {
        args: { filePath: "/path/to/code.ts" },
      }

      // when / then - should NOT block because boulder says atlas, not planner
      await expect(
        hook["tool.execute.before"](input, output)
      ).resolves.toBeUndefined()
    })

    test("should use planner from boulder state when set", async () => {
      // given - atlas in message files (from some other agent)
      setupMessageStorage(TEST_SESSION_ID, "atlas")
      
      // given - planner in boulder state (edge case, but should honor it)
      writeFileSync(BOULDER_FILE, JSON.stringify({
        active_plan: "/test/plan.md",
        started_at: new Date().toISOString(),
        session_ids: [TEST_SESSION_ID],
        plan_name: "test-plan",
        agent: "planner"
      }))

      const hook = createPlannerMdOnlyHook({
        client: {},
        directory: BOULDER_DIR,
      } as never)

      const input = {
        tool: "Write",
        sessionID: TEST_SESSION_ID,
        callID: "call-1",
      }
      const output = {
        args: { filePath: "/path/to/code.ts" },
      }

      // when / then - should block because boulder says planner
      await expect(
        hook["tool.execute.before"](input, output)
      ).rejects.toThrow("can only write/edit .md files")
    })

    test("should fall back to message files when session not in boulder", async () => {
      // given - planner in message files
      setupMessageStorage(TEST_SESSION_ID, "planner")
      
      // given - boulder state exists but for different session
      writeFileSync(BOULDER_FILE, JSON.stringify({
        active_plan: "/test/plan.md",
        started_at: new Date().toISOString(),
        session_ids: ["other-session-id"],
        plan_name: "test-plan",
        agent: "atlas"
      }))

      const hook = createPlannerMdOnlyHook({
        client: {},
        directory: BOULDER_DIR,
      } as never)

      const input = {
        tool: "Write",
        sessionID: TEST_SESSION_ID,
        callID: "call-1",
      }
      const output = {
        args: { filePath: "/path/to/code.ts" },
      }

      // when / then - should block because falls back to message files (planner)
      await expect(
        hook["tool.execute.before"](input, output)
      ).rejects.toThrow("can only write/edit .md files")
    })
  })

  describe("without message storage", () => {
    test("should handle missing session gracefully (no agent found)", async () => {
      // given
      const hook = createPlannerMdOnlyHook(createMockPluginInput())
      const input = {
        tool: "Write",
        sessionID: "non-existent-session",
        callID: "call-1",
      }
      const output = {
        args: { filePath: "/path/to/file.ts" },
      }

      // when / #then
      await expect(
        hook["tool.execute.before"](input, output)
      ).resolves.toBeUndefined()
    })
  })

  describe("cross-platform path validation", () => {
    beforeEach(() => {
      setupMessageStorage(TEST_SESSION_ID, "planner")
    })

     test("should allow Windows-style backslash paths under .sisyphus/", async () => {
       // given
       setupMessageStorage(TEST_SESSION_ID, "planner")
       const hook = createPlannerMdOnlyHook(createMockPluginInput())
       const input = {
         tool: "Write",
         sessionID: TEST_SESSION_ID,
         callID: "call-1",
       }
       const output = {
         args: { filePath: ".sisyphus\\plans\\work-plan.md" },
       }

       // when / #then
       await expect(
         hook["tool.execute.before"](input, output)
       ).resolves.toBeUndefined()
     })

     test("should allow mixed separator paths under .sisyphus/", async () => {
       // given
       setupMessageStorage(TEST_SESSION_ID, "planner")
       const hook = createPlannerMdOnlyHook(createMockPluginInput())
       const input = {
         tool: "Write",
         sessionID: TEST_SESSION_ID,
         callID: "call-1",
       }
       const output = {
         args: { filePath: ".sisyphus\\plans/work-plan.MD" },
       }

       // when / #then
       await expect(
         hook["tool.execute.before"](input, output)
       ).resolves.toBeUndefined()
     })

     test("should allow uppercase .MD extension", async () => {
       // given
       setupMessageStorage(TEST_SESSION_ID, "planner")
       const hook = createPlannerMdOnlyHook(createMockPluginInput())
       const input = {
         tool: "Write",
         sessionID: TEST_SESSION_ID,
         callID: "call-1",
       }
       const output = {
         args: { filePath: ".sisyphus/plans/work-plan.MD" },
       }

       // when / #then
       await expect(
         hook["tool.execute.before"](input, output)
       ).resolves.toBeUndefined()
     })

     test("should block paths outside workspace root even if containing .sisyphus", async () => {
       // given
       setupMessageStorage(TEST_SESSION_ID, "planner")
       const hook = createPlannerMdOnlyHook(createMockPluginInput())
       const input = {
         tool: "Write",
         sessionID: TEST_SESSION_ID,
         callID: "call-1",
       }
       const output = {
         args: { filePath: "/other/project/.sisyphus/plans/x.md" },
       }

       // when / #then
       await expect(
         hook["tool.execute.before"](input, output)
       ).rejects.toThrow("can only write/edit .md files inside .sisyphus/")
     })

     test("should allow nested .sisyphus directories (ctx.directory may be parent)", async () => {
       // given - when ctx.directory is parent of actual project, path includes project name
       setupMessageStorage(TEST_SESSION_ID, "planner")
       const hook = createPlannerMdOnlyHook(createMockPluginInput())
       const input = {
         tool: "Write",
         sessionID: TEST_SESSION_ID,
         callID: "call-1",
       }
       const output = {
         args: { filePath: "src/.sisyphus/plans/x.md" },
       }

       // when / #then - should allow because .sisyphus is in path
       await expect(
         hook["tool.execute.before"](input, output)
       ).resolves.toBeUndefined()
     })

     test("should block path traversal attempts", async () => {
       // given
       setupMessageStorage(TEST_SESSION_ID, "planner")
       const hook = createPlannerMdOnlyHook(createMockPluginInput())
       const input = {
         tool: "Write",
         sessionID: TEST_SESSION_ID,
         callID: "call-1",
       }
       const output = {
         args: { filePath: ".sisyphus/../secrets.md" },
       }

       // when / #then
       await expect(
         hook["tool.execute.before"](input, output)
       ).rejects.toThrow("can only write/edit .md files inside .sisyphus/")
     })

     test("should allow case-insensitive .SISYPHUS directory", async () => {
       // given
       setupMessageStorage(TEST_SESSION_ID, "planner")
       const hook = createPlannerMdOnlyHook(createMockPluginInput())
       const input = {
         tool: "Write",
         sessionID: TEST_SESSION_ID,
         callID: "call-1",
       }
       const output = {
         args: { filePath: ".SISYPHUS/plans/work-plan.md" },
       }

       // when / #then
       await expect(
         hook["tool.execute.before"](input, output)
       ).resolves.toBeUndefined()
     })

     test("should allow nested project path with .sisyphus (Windows real-world case)", async () => {
       // given - simulates when ctx.directory is parent of actual project
       // User reported: xauusd-dxy-plan\.sisyphus\drafts\supabase-email-templates.md
       setupMessageStorage(TEST_SESSION_ID, "planner")
       const hook = createPlannerMdOnlyHook(createMockPluginInput())
       const input = {
         tool: "Write",
         sessionID: TEST_SESSION_ID,
         callID: "call-1",
       }
       const output = {
         args: { filePath: "xauusd-dxy-plan\\.sisyphus\\drafts\\supabase-email-templates.md" },
       }

       // when / #then
       await expect(
         hook["tool.execute.before"](input, output)
       ).resolves.toBeUndefined()
     })

     test("should allow nested project path with mixed separators", async () => {
       // given
       setupMessageStorage(TEST_SESSION_ID, "planner")
       const hook = createPlannerMdOnlyHook(createMockPluginInput())
       const input = {
         tool: "Write",
         sessionID: TEST_SESSION_ID,
         callID: "call-1",
       }
       const output = {
         args: { filePath: "my-project/.sisyphus\\plans/task.md" },
       }

       // when / #then
       await expect(
         hook["tool.execute.before"](input, output)
       ).resolves.toBeUndefined()
     })

     test("should block nested project path without .sisyphus", async () => {
       // given
       setupMessageStorage(TEST_SESSION_ID, "planner")
       const hook = createPlannerMdOnlyHook(createMockPluginInput())
       const input = {
         tool: "Write",
         sessionID: TEST_SESSION_ID,
         callID: "call-1",
       }
       const output = {
         args: { filePath: "my-project\\src\\code.ts" },
       }

       // when / #then
       await expect(
         hook["tool.execute.before"](input, output)
       ).rejects.toThrow("can only write/edit .md files")
     })
  })
})
