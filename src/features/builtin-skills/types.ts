export interface GithubSkillSource {
  repo: string
  ref?: string
  path: string
  name: string
  version?: string
}

export interface BuiltinSkill {
  name: string
  description: string
  template: string
  license?: string
  compatibility?: string
  metadata?: Record<string, unknown>
  allowedTools?: string[]
  agent?: string
  model?: string
  subtask?: boolean
  argumentHint?: string
  source?: GithubSkillSource
  autoServer?: boolean
}
