# Feature Specification: KajiFlow Role Expansion

## 1. Feature Description

Expand KajiFlow to support non-engineering business roles by adding specialized agents and modes for Product Management, Pre-Sales/Solutions Engineering, Sales, and Business Operations (BizOps).

## 2. User Scenarios

### Scenario 1: Product Manager
- **User**: Product Manager
- **Action**: "Help me write a PRD for the new dashboard feature."
- **System**: Routes to `product-manager` agent.
- **Outcome**: Agent interviews user, drafts a structured PRD, identifies user stories, and prioritizes them based on market impact.

### Scenario 2: Solutions Engineer
- **User**: Solutions Architect
- **Action**: "Create a proof of concept integration guide for Client X using our API."
- **System**: Routes to `solutions-architect` agent.
- **Outcome**: Agent generates a technical integration guide, sample code, and architecture diagram tailored to the client's stack.

### Scenario 3: Sales Engineer
- **User**: Sales Rep
- **Action**: "I need a competitive battlecard against Competitor Y."
- **System**: Routes to `sales-engineer` agent.
- **Outcome**: Agent researches Competitor Y, compares features/pricing, and generates a battlecard highlighting our value proposition.

### Scenario 4: BizOps Manager
- **User**: Operations Manager
- **Action**: "Document our new employee onboarding process."
- **System**: Routes to `bizops-manager` agent.
- **Outcome**: Agent drafts a comprehensive runbook/process document, ensuring compliance and clarity.

## 3. Functional Requirements

### 3.1 New Agent Personas
- **Product Manager**: Optimized for structured thinking, prioritization, and user empathy.
- **Solutions Architect**: Optimized for technical translation (code <-> business value) and prototyping.
- **Sales Engineer**: Optimized for persuasion, value articulation, and competitive intelligence.
- **BizOps Manager**: Optimized for process rigor, compliance, and clarity.

### 3.2 Configuration Updates
- Add new `Category` definitions to `src/config/schema.ts`:
  - `product-management`
  - `solutions-engineering`
  - `sales`
  - `business-operations`
- Define default models/prompts for these categories (likely high-reasoning models like Claude Opus or Gemini 3 Pro).

### 3.3 Orchestrator Routing
- Update Orchestrator's prompt to recognize non-engineering intents.
- Map intents to the new specialized agents.

## 4. Success Criteria

- **Role Coverage**: Users in all 4 target roles can successfully complete a "Hello World" task (e.g., "Draft a document") without needing engineering knowledge.
- **Output Quality**: Generated documents (PRDs, Guides, Battlecards) follow standard professional templates.
- **Seamless Delegation**: The Orchestrator correctly identifies when to call a "Sales" agent vs a "Developer" agent.

### 3.4 Tool Permissions
- **All new business agents (PM, SA, Sales, BizOps)** will have access to the codebase via `Context Finder` (grep/glob).
- Rationale: Enables PMs to verify implementation status, SAs to read code for guides, and Ops to check configs.
- Restriction: They should generally NOT have `write` access (Edit/Write tools) unless explicitly required for their output (e.g., creating a new markdown file).

## 5. Assumptions & Dependencies

- **Tools**: Existing tools (Researcher/Librarian, Context Finder) are sufficient. No new *tools* (like CRM API access) are required for MVP, only new *prompts*.
- **Models**: Existing models (Claude/Gemini/GPT) have sufficient general knowledge for these domains.
