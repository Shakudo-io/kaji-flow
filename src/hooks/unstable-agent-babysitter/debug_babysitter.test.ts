import { _resetForTesting, setMainSession, getMainSessionID } from "../../features/claude-code-session-state/state"
import { createUnstableAgentBabysitterHook } from "../../hooks/unstable-agent-babysitter/index.ts"

// Mock task
const task = {
  id: "task-1",
  status: "running",
  sessionID: "bg-1",
  parentSessionID: "main-1",
  model: { providerID: "google", modelID: "gemini-1.5" },
  progress: {
    lastMessageAt: new Date(Date.now() - 130000) // 130s ago
  }
}

const manager = {
  getTasksByParentSession: (id) => {
    console.log("getTasksByParentSession called with:", id)
    return [task]
  }
}

const client = {
  session: {
    messages: async () => ({ data: [] }),
    prompt: async (arg) => { console.log("Prompt called:", arg) },
    promptAsync: async (arg) => { console.log("PromptAsync called:", arg) }
  }
}

// Run test logic
async function run() {
  _resetForTesting()
  setMainSession("main-1")
  console.log("Main Session ID:", getMainSessionID())

  const hook = createUnstableAgentBabysitterHook({ directory: ".", client }, { backgroundManager: manager, config: { timeout_ms: 120000 } })
  
  await hook.event({ event: { type: "session.idle", properties: { sessionID: "main-1" } } })
}

run()
