import type { BuiltinSkill } from "./types"
import {
  DEV_BROWSER_SKILL_TEMPLATE,
  DEV_BROWSER_DESCRIPTION,
  DEV_BROWSER_GITHUB_SOURCE,
} from "./templates/dev-browser"

export function createBuiltinSkills(): BuiltinSkill[] {
  return [
    {
      name: "dev-browser",
      description: DEV_BROWSER_DESCRIPTION,
      template: DEV_BROWSER_SKILL_TEMPLATE,
      license: "MIT",
      compatibility: "Claude Code, Amp Code, OpenCode",
      source: DEV_BROWSER_GITHUB_SOURCE,
      autoServer: true,
      allowedTools: ["Bash(npx tsx:*)", "Bash(cd *dev-browser:*)"],
      argumentHint: '"task description"',
    },
  ]
}
