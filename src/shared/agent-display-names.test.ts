import { describe, it, expect } from "bun:test"
import { AGENT_DISPLAY_NAMES, getAgentDisplayName } from "./agent-display-names"

describe("getAgentDisplayName", () => {
  it("returns display name for lowercase config key (new format)", () => {
    // given config key "orchestrator"
    const configKey = "orchestrator"

    // when getAgentDisplayName called
    const result = getAgentDisplayName(configKey)

    // then returns "Orchestrator (Ultraworker)"
    expect(result).toBe("Orchestrator (Ultraworker)")
  })

  it("returns display name for uppercase config key (old format - case-insensitive)", () => {
    // given config key "Orchestrator" (old format)
    const configKey = "Orchestrator"

    // when getAgentDisplayName called
    const result = getAgentDisplayName(configKey)

    // then returns "Orchestrator (Ultraworker)" (case-insensitive lookup)
    expect(result).toBe("Orchestrator (Ultraworker)")
  })

  it("returns original key for unknown agents (fallback)", () => {
    // given config key "custom-agent"
    const configKey = "custom-agent"

    // when getAgentDisplayName called
    const result = getAgentDisplayName(configKey)

    // then returns "custom-agent" (original key unchanged)
    expect(result).toBe("custom-agent")
  })

  it("returns display name for senior-orchestrator", () => {
    // given config key "senior-orchestrator"
    const configKey = "senior-orchestrator"

    // when getAgentDisplayName called
    const result = getAgentDisplayName(configKey)

    // then returns "SeniorOrchestrator (Plan Execution Orchestrator)"
    expect(result).toBe("SeniorOrchestrator (Plan Execution Orchestrator)")
  })

  it("returns display name for planner", () => {
    // given config key "planner"
    const configKey = "planner"

    // when getAgentDisplayName called
    const result = getAgentDisplayName(configKey)

    // then returns "Planner (Plan Builder)"
    expect(result).toBe("Planner (Plan Builder)")
  })

  it("returns display name for requirements-analyst", () => {
    // given config key "requirements-analyst"
    const configKey = "requirements-analyst"

    // when getAgentDisplayName called
    const result = getAgentDisplayName(configKey)

    // then returns "RequirementsAnalyst (Plan Consultant)"
    expect(result).toBe("RequirementsAnalyst (Plan Consultant)")
  })

  it("returns display name for reviewer", () => {
    // given config key "reviewer"
    const configKey = "reviewer"

    // when getAgentDisplayName called
    const result = getAgentDisplayName(configKey)

    // then returns "Reviewer (Plan Reviewer)"
    expect(result).toBe("Reviewer (Plan Reviewer)")
  })

  it("returns display name for advisor", () => {
    // given config key "advisor"
    const configKey = "advisor"

    // when getAgentDisplayName called
    const result = getAgentDisplayName(configKey)

    // then returns "advisor"
    expect(result).toBe("advisor")
  })

  it("returns display name for researcher", () => {
    // given config key "researcher"
    const configKey = "researcher"

    // when getAgentDisplayName called
    const result = getAgentDisplayName(configKey)

    // then returns "researcher"
    expect(result).toBe("researcher")
  })

  it("returns display name for context-finder", () => {
    // given config key "context-finder"
    const configKey = "context-finder"

    // when getAgentDisplayName called
    const result = getAgentDisplayName(configKey)

    // then returns "context-finder"
    expect(result).toBe("context-finder")
  })

  it("returns display name for multimodal-looker", () => {
    // given config key "multimodal-looker"
    const configKey = "multimodal-looker"

    // when getAgentDisplayName called
    const result = getAgentDisplayName(configKey)

    // then returns "multimodal-looker"
    expect(result).toBe("multimodal-looker")
  })

  it("contains all expected agent mappings", () => {
    // given expected mappings
    const expectedMappings = {
      orchestrator: "Orchestrator (Ultraworker)",
      senior-orchestrator: "SeniorOrchestrator (Plan Execution Orchestrator)",
      planner: "Planner (Plan Builder)",
      requirements-analyst: "RequirementsAnalyst (Plan Consultant)",
      reviewer: "Reviewer (Plan Reviewer)",
      advisor: "advisor",
      researcher: "researcher",
      context-finder: "context-finder",
      "multimodal-looker": "multimodal-looker",
    }

    // when checking the constant
    // then contains all expected mappings
    expect(AGENT_DISPLAY_NAMES).toEqual(expectedMappings)
  })
})