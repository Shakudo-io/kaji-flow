import type { PluginInput } from "@opencode-ai/plugin"
import {
  readBoulderState,
  writeBoulderState,
  appendSessionId,
  findPlannerPlans,
  getPlanProgress,
  createBoulderState,
  getPlanName,
  clearBoulderState,
} from "../../boulder-state"
import { SPECKIT_TASKS_FILE } from "../../boulder-state/constants"
import { log } from "../../../shared/logger"
import { updateSessionAgent } from "../../claude-code-session-state"
import { existsSync, readdirSync, statSync } from "fs"
import { join } from "path"

export const HOOK_NAME = "start-work"

const KEYWORD_PATTERN = /\b(ultrawork|ulw)\b/gi

interface StartWorkHookInput {
  sessionID: string
  messageID?: string
}

interface StartWorkHookOutput {
  parts: Array<{ type: string; text?: string }>
}

function extractUserRequestPlanName(promptText: string): string | null {
  const userRequestMatch = promptText.match(/<user-request>\s*([\s\S]*?)\s*<\/user-request>/i)
  if (!userRequestMatch) return null
  
  const rawArg = userRequestMatch[1].trim()
  if (!rawArg) return null
  
  const cleanedArg = rawArg.replace(KEYWORD_PATTERN, "").trim()
  return cleanedArg || null
}

function findSpeckitTasks(directory: string): string[] {
  const tasks: string[] = []
  const roots = ["specs", ".specify"]
  
  for (const root of roots) {
    const rootPath = join(directory, root)
    if (!existsSync(rootPath)) continue
    
    try {
      const projects = readdirSync(rootPath)
      for (const project of projects) {
        const projectPath = join(rootPath, project)
        try {
          if (!statSync(projectPath).isDirectory()) continue
          
          const features = readdirSync(projectPath)
          for (const feature of features) {
            const featurePath = join(projectPath, feature)
            try {
              if (!statSync(featurePath).isDirectory()) continue
              
              const tasksPath = join(featurePath, SPECKIT_TASKS_FILE)
              if (existsSync(tasksPath)) {
                tasks.push(tasksPath)
              }
            } catch {}
          }
        } catch {}
      }
    } catch {}
  }
  return tasks
}

function findPlanByName(plans: string[], requestedName: string): string | null {
  const lowerName = requestedName.toLowerCase()
  const exactMatch = plans.find(p => getPlanName(p).toLowerCase() === lowerName)
  if (exactMatch) return exactMatch
  const partialMatch = plans.find(p => getPlanName(p).toLowerCase().includes(lowerName))
  return partialMatch || null
}

export function createStartWorkHook(ctx: PluginInput) {
  return {
    "chat.message": async (
      input: StartWorkHookInput,
      output: StartWorkHookOutput
    ): Promise<void> => {
      const parts = output.parts
      const promptText = parts
        ?.filter((p) => p.type === "text" && p.text)
        .map((p) => p.text)
        .join("\n")
        .trim() || ""

      const isStartWorkCommand = promptText.includes("<session-context>")

      if (!isStartWorkCommand) {
        return
      }

      log(`[${HOOK_NAME}] Processing start-work command`, {
        sessionID: input.sessionID,
      })

      updateSessionAgent(input.sessionID, "senior-orchestrator")

      const existingState = readBoulderState(ctx.directory)
      const sessionId = input.sessionID
      const timestamp = new Date().toISOString()

      let contextInfo = ""
      
      const explicitPlanName = extractUserRequestPlanName(promptText)
      
      if (explicitPlanName) {
        log(`[${HOOK_NAME}] Explicit plan name requested: ${explicitPlanName}`, {
          sessionID: input.sessionID,
        })
        
        const legacyPlans = findPlannerPlans(ctx.directory)
        const speckitTasks = findSpeckitTasks(ctx.directory)
        const allPlans = [...speckitTasks, ...legacyPlans]
        
        const matchedPlan = findPlanByName(allPlans, explicitPlanName)
        
        if (matchedPlan) {
          const progress = getPlanProgress(matchedPlan)
          
          if (progress.isComplete) {
            contextInfo = `
## Plan Already Complete

The requested plan "${getPlanName(matchedPlan)}" has been completed.
All ${progress.total} tasks are done.

Create a new feature spec with: /speckit.specify {project}:{feature}`
          } else {
            if (existingState) {
              clearBoulderState(ctx.directory)
            }
            const newState = createBoulderState(matchedPlan, sessionId, "senior-orchestrator")
            writeBoulderState(ctx.directory, newState)
            
            contextInfo = `
## Auto-Selected Plan (Speckit)

**Plan**: ${getPlanName(matchedPlan)}
**Path**: ${matchedPlan}
**Progress**: ${progress.completed}/${progress.total} tasks
**Session ID**: ${sessionId}
**Started**: ${timestamp}

boulder.json has been created. Read the tasks.md and begin execution.`
          }
        } else {
          const incompletePlans = allPlans.filter(p => !getPlanProgress(p).isComplete)
          if (incompletePlans.length > 0) {
            const planList = incompletePlans.map((p, i) => {
              const progress = getPlanProgress(p)
              return `${i + 1}. [${getPlanName(p)}] - Progress: ${progress.completed}/${progress.total}`
            }).join("\n")
            
            contextInfo = `
## Plan Not Found

Could not find a plan matching "${explicitPlanName}".

Available incomplete plans:
${planList}

Ask the user which plan to work on.`
          } else {
            contextInfo = `
## Plan Not Found

Could not find a plan matching "${explicitPlanName}".
No incomplete plans available.

Create a new feature spec with: /speckit.specify {project}:{feature}`
          }
        }
      } else if (existingState) {
        const progress = getPlanProgress(existingState.active_plan)
        
        if (!progress.isComplete) {
          appendSessionId(ctx.directory, sessionId)
          contextInfo = `
## Active Work Session Found

**Status**: RESUMING existing work
**Plan**: ${existingState.plan_name}
**Path**: ${existingState.active_plan}
**Progress**: ${progress.completed}/${progress.total} tasks completed
**Sessions**: ${existingState.session_ids.length + 1} (current session appended)
**Started**: ${existingState.started_at}

The current session (${sessionId}) has been added to session_ids.
Read the plan file and continue from the first unchecked task.`
        } else {
          contextInfo = `
## Previous Work Complete

The previous plan (${existingState.plan_name}) has been completed.
Looking for new plans...`
        }
      }

      if (!contextInfo) {
        const legacyPlans = findPlannerPlans(ctx.directory)
        const speckitTasks = findSpeckitTasks(ctx.directory)
        const allPlans = [...speckitTasks, ...legacyPlans]
        
        const incompletePlans = allPlans.filter(p => !getPlanProgress(p).isComplete)
        
        if (allPlans.length === 0) {
          contextInfo = `
## No Plans Found

No Speckit tasks.md or legacy plans found.

**Recommended Action**:
Use the 1-1-1 workflow to start a new feature:
1. Specify: /speckit.specify {project}:{feature}
2. Plan: /speckit.plan
3. Tasks: /speckit.tasks
4. Execute: /start-work`
        } else if (incompletePlans.length === 0) {
           contextInfo = `
## All Plans Complete

All ${allPlans.length} plan(s) are complete.

Create a new feature spec with: /speckit.specify {project}:{feature}`
        } else if (incompletePlans.length === 1) {
          const planPath = incompletePlans[0]
          const progress = getPlanProgress(planPath)
          const newState = createBoulderState(planPath, sessionId, "senior-orchestrator")
          writeBoulderState(ctx.directory, newState)

          contextInfo = `
## Auto-Selected Plan (Speckit)

**Plan**: ${getPlanName(planPath)}
**Path**: ${planPath}
**Progress**: ${progress.completed}/${progress.total} tasks
**Session ID**: ${sessionId}
**Started**: ${timestamp}

boulder.json has been created. Read the tasks.md and begin execution.`
        } else {
          const planList = incompletePlans.map((p, i) => {
            const progress = getPlanProgress(p)
            return `${i + 1}. [${getPlanName(p)}] - Progress: ${progress.completed}/${progress.total}`
          }).join("\n")

          contextInfo = `
<system-reminder>
## Multiple Plans Found

Current Time: ${timestamp}
Session ID: ${sessionId}

${planList}

Ask the user which plan to work on. Present the options above and wait for their response.
</system-reminder>`
        }
      }

      const idx = output.parts.findIndex((p) => p.type === "text" && p.text)
      if (idx >= 0 && output.parts[idx].text) {
        output.parts[idx].text = output.parts[idx].text
          .replace(/$SESSION_ID/g, sessionId)
          .replace(/$TIMESTAMP/g, timestamp)
        
        output.parts[idx].text += `\n\n---\n${contextInfo}`
      }

      log(`[${HOOK_NAME}] Context injected`, {
        sessionID: input.sessionID,
        hasExistingState: !!existingState,
      })
    },
  }
}

export const START_WORK_TEMPLATE = `You are starting an Orchestrator work session.

## WHAT TO DO

1. **Find available plans**:
   - Check \`specs/**/tasks.md\` (Speckit workflow)
   - Check \`.kajiflow/work/plans/\` (Legacy)

2. **Check for active boulder state**: Read \`.kajiflow/work/boulder.json\` if it exists

3. **Decision logic**:
   - If \`.kajiflow/work/boulder.json\` exists AND plan is NOT complete:
     - **RESUME** work on existing plan
   - If no active plan OR plan is complete:
     - List available incomplete plans
     - If ONE plan: auto-select it
     - If MULTIPLE plans: show list and ask user to select

4. **Create/Update boulder.json**:
   \`\`\`json
   {
     "active_plan": "/absolute/path/to/tasks.md",
     "started_at": "ISO_TIMESTAMP",
     "session_ids": ["session_id_1"],
     "plan_name": "feature-name"
   }
   \`\`\`

5. **Read the plan file** and start executing tasks using the senior-orchestrator loop.

## CRITICAL
- The session_id is injected by the hook.
- Always update boulder.json BEFORE starting work.
- If no plans exist, guide the user to creating one via \`/speckit.specify\`.
`
