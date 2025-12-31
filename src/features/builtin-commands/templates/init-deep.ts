export const INIT_DEEP_TEMPLATE = `# Initialize Deep Knowledge Base

Generate comprehensive AGENTS.md files across project hierarchy. Combines root-level project knowledge (gen-knowledge) with complexity-based subdirectory documentation (gen-knowledge-deep).

## Usage

\`\`\`
/init-deep                      # Update mode: Modify existing + create new where needed
/init-deep --create-new         # Fresh start: Read existing → Remove all → Rewrite from scratch
/init-deep --max-depth=2        # Limit to N directory levels (default: 3)
\`\`\`

### Flag Behavior

| Flag | Read Existing | Remove Existing | Create New Files |
|------|--------------|-----------------|------------------|
| (default) | ✓ Yes | ✗ No | ✓ Yes (where warranted) |
| --create-new | ✓ Yes (for context) | ✓ Yes (after reading) | ✓ Yes (all locations) |

<important>
**--create-new does NOT mean "ignore existing"**. It means:
1. READ all existing AGENTS.md files to understand what was documented
2. REMOVE all existing files after reading
3. REWRITE everything from scratch, using the gathered context

This preserves institutional knowledge while ensuring fresh, consistent documentation.
</important>

---

## Operating Modes

| Mode | Behavior |
|------|----------|
| **Update (default)** | Read existing → Identify gaps → Update existing + Create new where complexity > threshold |
| **Create New** | Read existing → Delete all → Regenerate entire hierarchy from scratch |

<update-mode>
**Update Mode** is NOT read-only. It:
1. Reads all existing AGENTS.md files
2. Analyzes current codebase structure
3. **Updates** existing AGENTS.md files with new information
4. **Creates** new AGENTS.md files in directories that now warrant them (score > 15)
5. Does NOT delete existing files that are still relevant
</update-mode>

---

## Core Principles

- **Existing First**: ALWAYS read existing AGENTS.md files before any other analysis
- **LSP-First**: Use LSP tools as PRIMARY method for code understanding (semantic > text search)
- **Update Creates**: Update mode can CREATE new files, not just modify existing ones
- **Telegraphic Style**: Sacrifice grammar for concision ("Project uses React" → "React 18")
- **Predict-then-Compare**: Predict standard → find actual → document ONLY deviations
- **Hierarchy Aware**: Parent covers general, children cover specific
- **No Redundancy**: Child AGENTS.md NEVER repeats parent content

---

## Execution Order

<critical>
**MANDATORY ORDER - DO NOT SKIP OR REORDER:**
1. **Discovery**: Find & READ all existing AGENTS.md files (ALWAYS FIRST)
2. **LSP Analysis**: Semantic code understanding (PRIMARY method)
3. **Supplementary Analysis**: Bash + Explore agents (SECONDARY)
4. **Scoring**: Determine which directories need AGENTS.md
5. **Generation**: Create/update AGENTS.md files
6. **Review**: Deduplicate and validate
</critical>

---

## Process

<critical>
**MANDATORY: TodoWrite for ALL phases. Mark in_progress → completed in real-time.**
</critical>

### Phase 0: Initialize

\`\`\`
TodoWrite([
  { id: "p0-discovery", content: "Discover and READ all existing AGENTS.md files", status: "pending", priority: "high" },
  { id: "p1-analysis", content: "LSP-first structural analysis + supplementary context gathering", status: "pending", priority: "high" },
  { id: "p2-scoring", content: "Score directories, determine AGENTS.md locations", status: "pending", priority: "high" },
  { id: "p3-root", content: "Generate root AGENTS.md with Predict-then-Compare", status: "pending", priority: "high" },
  { id: "p4-subdirs", content: "Generate subdirectory AGENTS.md files in parallel", status: "pending", priority: "high" },
  { id: "p5-review", content: "Review, deduplicate, validate all files", status: "pending", priority: "medium" }
])
\`\`\`

---

## Phase 0.5: Discover & Read Existing AGENTS.md

**Mark "p0-discovery" as in_progress.**

<critical>
**THIS MUST BE THE FIRST ANALYSIS STEP.** Before ANY LSP analysis, explore agents, or bash commands.
Understanding existing documentation is essential for BOTH update mode AND --create-new mode.
</critical>

### Step 1: Find ALL existing AGENTS.md files

\`\`\`bash
# Find all existing AGENTS.md files (including CLAUDE.md for compatibility)
find . -type f \\( -name "AGENTS.md" -o -name "CLAUDE.md" \\) \\
  -not -path '*/node_modules/*' \\
  -not -path '*/venv/*' \\
  -not -path '*/.git/*' \\
  -not -path '*/dist/*' \\
  -not -path '*/build/*' \\
  2>/dev/null | sort
\`\`\`

### Step 2: Read EACH existing file

For every AGENTS.md found, use the Read tool to capture its content:

\`\`\`
EXISTING_AGENTS = {}

for each file in found_files:
  content = Read(filePath=file)
  EXISTING_AGENTS[file] = {
    path: file,
    content: content,
    directory: dirname(file),
    sections: extractSections(content)  // OVERVIEW, STRUCTURE, CONVENTIONS, etc.
  }
\`\`\`

### Step 3: Analyze existing documentation coverage

\`\`\`
EXISTING_COVERAGE = {
  root_exists: "./AGENTS.md" in EXISTING_AGENTS,
  documented_directories: [dirs with AGENTS.md],
  undocumented_directories: [],  // To be filled in Phase 2
  total_files: len(EXISTING_AGENTS),
  key_insights: []  // Extract notable patterns, anti-patterns, conventions from existing files
}
\`\`\`

### Step 4: Extract key insights from existing files

For each existing AGENTS.md, extract and preserve:
- Project-specific conventions mentioned
- Anti-patterns documented
- Unique styles described
- Commands and deployment info
- Any "NOTES" or gotchas

\`\`\`
KEY_INSIGHTS_FROM_EXISTING = [
  // Examples:
  // "Project uses BDD-style test comments (#given, #when, #then)" - from existing AGENTS.md
  // "Bun-only package manager (anti-pattern: npm/yarn)" - from existing AGENTS.md
  // "Hook naming convention: createXXXHook" - from existing AGENTS.md
]
\`\`\`

### Output Format

\`\`\`
EXISTING_AGENTS_ANALYSIS = {
  files_found: [
    { path: "./AGENTS.md", lines: 150, has_sections: ["OVERVIEW", "STRUCTURE", "CONVENTIONS"] },
    { path: "./src/hooks/AGENTS.md", lines: 80, has_sections: ["OVERVIEW", "HOOK CATEGORIES"] }
  ],
  key_insights: [
    "Project uses BDD-style test comments (#given, #when, #then)",
    "Bun-only package manager (anti-pattern: npm/yarn)",
    "Hook naming convention: createXXXHook"
  ],
  coverage_gaps: [],  // Directories that might need AGENTS.md - filled in Phase 2
}
\`\`\`

### Mode-Specific Behavior After Discovery

<mode-handling>
**Update Mode (default):**
- Preserve EXISTING_AGENTS content as baseline
- Use KEY_INSIGHTS_FROM_EXISTING to inform new content
- Merge new findings with existing documentation
- CREATE new AGENTS.md files where scoring warrants

**--create-new Mode:**
- Still use EXISTING_AGENTS for context (don't ignore institutional knowledge)
- Delete all existing AGENTS.md files AFTER reading them
- Regenerate ALL files from scratch using gathered context + new analysis

\`\`\`bash
# --create-new: After reading all existing files, remove them
if [[ "$ARGUMENTS" == *"--create-new"* ]]; then
  echo "Mode: --create-new detected"
  echo "Existing files read and context preserved. Now removing all AGENTS.md files..."
  find . -type f -name "AGENTS.md" \\
    -not -path '*/node_modules/*' \\
    -not -path '*/.git/*' \\
    -exec rm -v {} \\;
  echo "All existing AGENTS.md files removed. Will regenerate from scratch."
fi
\`\`\`
</mode-handling>

**Mark "p0-discovery" as completed.**

---

## Phase 1: LSP-First Structural Analysis

**Mark "p1-analysis" as in_progress.**

<critical>
**LSP is the PRIMARY tool for codebase understanding.** Use LSP for semantic accuracy.
Bash and explore agents provide SUPPLEMENTARY context where LSP cannot reach.
</critical>

Launch **ALL tasks simultaneously**, but prioritize LSP results:

<parallel-tasks priority="lsp-first">

### Code Intelligence Analysis (LSP tools - PRIMARY)

LSP provides semantic understanding beyond text search. Use for accurate code mapping.

\`\`\`
# Step 1: Check LSP availability
lsp_servers()  # Verify language server is available

# Step 2: Analyze entry point files (run in parallel)
# Find entry points first, then analyze each with lsp_document_symbols
lsp_document_symbols(filePath="src/index.ts")      # Main entry
lsp_document_symbols(filePath="src/main.py")       # Python entry
lsp_document_symbols(filePath="cmd/main.go")       # Go entry

# Step 3: Discover key symbols across workspace (run in parallel)
lsp_workspace_symbols(filePath=".", query="class")      # All classes
lsp_workspace_symbols(filePath=".", query="interface")  # All interfaces
lsp_workspace_symbols(filePath=".", query="function")   # Top-level functions
lsp_workspace_symbols(filePath=".", query="type")       # Type definitions

# Step 4: Analyze symbol centrality (for top 5-10 key symbols)
# High reference count = central/important concept
lsp_find_references(filePath="src/index.ts", line=X, character=Y)  # Main export
\`\`\`

#### LSP Analysis Output Format

\`\`\`
CODE_INTELLIGENCE = {
  entry_points: [
    { file: "src/index.ts", exports: ["Plugin", "createHook"], symbol_count: 12 }
  ],
  key_symbols: [
    { name: "Plugin", type: "class", file: "src/index.ts", refs: 45, role: "Central orchestrator" },
    { name: "createHook", type: "function", file: "src/utils.ts", refs: 23, role: "Hook factory" }
  ],
  module_boundaries: [
    { dir: "src/hooks", exports: 21, imports_from: ["shared/"] },
    { dir: "src/tools", exports: 15, imports_from: ["shared/", "hooks/"] }
  ]
}
\`\`\`

<lsp-priority>
**LSP Results Take Precedence**: When LSP provides symbol information, prefer it over:
- grep/regex pattern matching
- AST-grep approximations
- explore agent text searches

LSP provides:
- Accurate symbol types (class, function, interface, enum)
- True export/import relationships
- Precise reference counts
- Hierarchical document structure
</lsp-priority>

<critical>
**LSP Fallback**: If LSP unavailable (no server installed), skip this section and rely on explore agents + AST-grep patterns. Log a warning that semantic analysis is degraded.
</critical>

### Structural Analysis (bash - SUPPLEMENTARY)

\`\`\`bash
# Task A: Directory depth analysis
find . -type d -not -path '*/\\.*' -not -path '*/node_modules/*' -not -path '*/venv/*' -not -path '*/__pycache__/*' -not -path '*/dist/*' -not -path '*/build/*' | awk -F/ '{print NF-1}' | sort -n | uniq -c

# Task B: File count per directory  
find . -type f -not -path '*/\\.*' -not -path '*/node_modules/*' -not -path '*/venv/*' -not -path '*/__pycache__/*' | sed 's|/[^/]*$||' | sort | uniq -c | sort -rn | head -30

# Task C: Code concentration
find . -type f \\( -name "*.py" -o -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.go" -o -name "*.rs" -o -name "*.java" \\) -not -path '*/node_modules/*' -not -path '*/venv/*' | sed 's|/[^/]*$||' | sort | uniq -c | sort -rn | head -20
\`\`\`

### Context Gathering (Explore agents - SUPPLEMENTARY)

\`\`\`
background_task(agent="explore", prompt="Project structure: PREDICT standard {lang} patterns → FIND package.json/pyproject.toml/go.mod → REPORT deviations only")

background_task(agent="explore", prompt="Entry points: PREDICT typical (main.py, index.ts) → FIND actual → REPORT non-standard organization")

background_task(agent="explore", prompt="Conventions: FIND .cursor/rules, .cursorrules, eslintrc, pyproject.toml → REPORT project-specific rules DIFFERENT from defaults")

background_task(agent="explore", prompt="Anti-patterns: FIND comments with 'DO NOT', 'NEVER', 'ALWAYS', 'LEGACY', 'DEPRECATED' → REPORT forbidden patterns")

background_task(agent="explore", prompt="Build/CI: FIND .github/workflows, Makefile, justfile → REPORT non-standard build/deploy patterns")

background_task(agent="explore", prompt="Test patterns: FIND pytest.ini, jest.config, test structure → REPORT unique testing conventions")
\`\`\`

</parallel-tasks>

**Collect all results. Mark "p1-analysis" as completed.**

---

## Phase 2: Complexity Scoring & Location Decision

**Mark "p2-scoring" as in_progress.**

### Scoring Matrix

| Factor | Weight | Threshold | Source |
|--------|--------|-----------|--------|
| File count | 3x | >20 files = high | bash |
| Subdirectory count | 2x | >5 subdirs = high | bash |
| Code file ratio | 2x | >70% code = high | bash |
| Unique patterns | 1x | Has own config | explore |
| Module boundary | 2x | Has __init__.py/index.ts | bash |
| **Symbol density** | 2x | >30 symbols = high | LSP |
| **Export count** | 2x | >10 exports = high | LSP |
| **Reference centrality** | 3x | Symbols with >20 refs | LSP |

<lsp-scoring>
**LSP-Enhanced Scoring** (if available):

\`\`\`
For each directory in candidates:
  symbols = lsp_document_symbols(dir/index.ts or dir/__init__.py)
  
  symbol_score = len(symbols) > 30 ? 6 : len(symbols) > 15 ? 3 : 0
  export_score = count(exported symbols) > 10 ? 4 : 0
  
  # Check if this module is central (many things depend on it)
  for each exported symbol:
    refs = lsp_find_references(symbol)
    if refs > 20: centrality_score += 3
  
  total_score += symbol_score + export_score + centrality_score
\`\`\`
</lsp-scoring>

### Decision Rules (applies to BOTH modes)

| Score | Update Mode | Create New Mode |
|-------|-------------|-----------------|
| **Root (.)** | Update existing or create if missing | Always create |
| **High (>15)** | Update existing OR create new | Always create |
| **Medium (8-15)** | Update if exists, create if distinct domain | Create if distinct domain |
| **Low (<8)** | Keep existing as-is, don't create new | Skip |

### Comparing Against Existing Coverage

\`\`\`
# From Phase 0.5:
existing_dirs = EXISTING_COVERAGE.documented_directories

# From Phase 2 scoring:
warranted_dirs = [d for d in candidates if d.score > 15 or (d.score > 8 and d.is_distinct_domain)]

# Identify gaps and overlaps:
GAPS = warranted_dirs - existing_dirs  // New AGENTS.md needed
OVERLAP = warranted_dirs ∩ existing_dirs  // Update existing
OBSOLETE = existing_dirs - warranted_dirs  // May no longer be needed (warn only)
\`\`\`

### Output Format

\`\`\`
AGENTS_LOCATIONS = [
  { path: ".", type: "root", action: "update" },
  { path: "src/api", score: 18, reason: "high complexity, 45 files", action: "create" },
  { path: "src/hooks", score: 12, reason: "distinct domain, unique patterns", action: "update" },
]

COVERAGE_REPORT = {
  to_create: ["src/api"],
  to_update: [".", "src/hooks"],
  obsolete_warning: []  // Directories with existing AGENTS.md but low score
}
\`\`\`

**Mark "p2-scoring" as completed.**

---

## Phase 3: Generate Root AGENTS.md

**Mark "p3-root" as in_progress.**

Root AGENTS.md gets **full treatment** with Predict-then-Compare synthesis.

<existing-context>
**For Update Mode**: Review EXISTING_AGENTS["./AGENTS.md"] first.
- Preserve valid insights that still apply
- Update outdated information
- Add new findings from Phase 1 analysis
- Maintain document structure if already well-organized
</existing-context>

### Required Sections

\`\`\`markdown
# PROJECT KNOWLEDGE BASE

**Generated:** {TIMESTAMP}
**Commit:** {SHORT_SHA}
**Branch:** {BRANCH}

## OVERVIEW

{1-2 sentences: what project does, core tech stack}

## STRUCTURE

\\\`\\\`\\\`
{project-root}/
├── {dir}/      # {non-obvious purpose only}
└── {entry}     # entry point
\\\`\\\`\\\`

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add feature X | \\\`src/x/\\\` | {pattern hint} |

## CODE MAP

{Generated from LSP analysis - shows key symbols and their relationships}

| Symbol | Type | Location | Refs | Role |
|--------|------|----------|------|------|
| {MainClass} | Class | \\\`src/index.ts\\\` | {N} | {Central orchestrator} |
| {createX} | Function | \\\`src/utils.ts\\\` | {N} | {Factory pattern} |
| {Config} | Interface | \\\`src/types.ts\\\` | {N} | {Configuration contract} |

### Module Dependencies

\\\`\\\`\\\`
{entry} ──imports──> {core/}
   │                    │
   └──imports──> {utils/} <──imports── {features/}
\\\`\\\`\\\`

<code-map-note>
**Skip CODE MAP if**: LSP unavailable OR project too small (<10 files) OR no clear module boundaries.
</code-map-note>

## CONVENTIONS

{ONLY deviations from standard - skip generic advice}

- **{rule}**: {specific detail}

## ANTI-PATTERNS (THIS PROJECT)

{Things explicitly forbidden HERE}

- **{pattern}**: {why} → {alternative}

## UNIQUE STYLES

{Project-specific coding styles}

- **{style}**: {how different}

## COMMANDS

\\\`\\\`\\\`bash
{dev-command}
{test-command}
{build-command}
\\\`\\\`\\\`

## NOTES

{Gotchas, non-obvious info}
\`\`\`

### Quality Gates

- [ ] Size: 50-150 lines
- [ ] No generic advice ("write clean code")
- [ ] No obvious info ("tests/ has tests")
- [ ] Every item is project-specific
- [ ] KEY_INSIGHTS_FROM_EXISTING preserved where still valid

**Mark "p3-root" as completed.**

---

## Phase 4: Generate Subdirectory AGENTS.md

**Mark "p4-subdirs" as in_progress.**

For each location in AGENTS_LOCATIONS (except root), launch **parallel document-writer agents**:

\`\`\`typescript
for (const loc of AGENTS_LOCATIONS.filter(l => l.path !== ".")) {
  // Determine if this is an update or create based on COVERAGE_REPORT
  const isUpdate = COVERAGE_REPORT.to_update.includes(loc.path)
  const existingContent = isUpdate ? EXISTING_AGENTS[loc.path + "/AGENTS.md"]?.content : null
  
  background_task({
    agent: "document-writer",
    prompt: \\\`
      \${isUpdate ? "UPDATE" : "CREATE"} AGENTS.md for: \${loc.path}
      
      CONTEXT:
      - Complexity reason: \${loc.reason}
      - Action: \${isUpdate ? "update" : "create"}
      - Parent AGENTS.md: ./AGENTS.md (already covers project overview)
      \${existingContent ? "- EXISTING CONTENT TO PRESERVE/UPDATE:\\n" + existingContent : ""}
      
      CRITICAL RULES:
      1. Focus ONLY on this directory's specific context
      2. NEVER repeat parent AGENTS.md content
      3. Shorter is better - 30-80 lines max
      4. Telegraphic style - sacrifice grammar
      \${isUpdate ? "5. PRESERVE valid insights from existing content" : ""}
      
      REQUIRED SECTIONS:
      - OVERVIEW (1 line: what this directory does)
      - STRUCTURE (only if >5 subdirs)
      - WHERE TO LOOK (directory-specific tasks)
      - CONVENTIONS (only if DIFFERENT from root)
      - ANTI-PATTERNS (directory-specific only)
      
      OUTPUT: Write to \${loc.path}/AGENTS.md
    \\\`
  })
}
\`\`\`

**Wait for all agents. Mark "p4-subdirs" as completed.**

---

## Phase 5: Review & Deduplicate

**Mark "p5-review" as in_progress.**

### Validation Checklist

For EACH generated AGENTS.md:

| Check | Action if Fail |
|-------|----------------|
| Contains generic advice | REMOVE the line |
| Repeats parent content | REMOVE the line |
| Missing required section | ADD it |
| Over 150 lines (root) / 80 lines (subdir) | TRIM |
| Verbose explanations | REWRITE telegraphic |
| Lost key insight from existing | RESTORE it |

### Cross-Reference Validation

\`\`\`
For each child AGENTS.md:
  For each line in child:
    If similar line exists in parent:
      REMOVE from child (parent already covers)
\`\`\`

### Verify Key Insights Preserved

\`\`\`
For each insight in KEY_INSIGHTS_FROM_EXISTING:
  If insight is still valid (verified in Phase 1):
    Ensure it appears in appropriate AGENTS.md
  If insight is outdated:
    Document why it was removed in commit message
\`\`\`

**Mark "p5-review" as completed.**

---

## Final Report

\`\`\`
=== init-deep Complete ===

Mode: {update | create-new}

Files {Created | Updated}:
  ✓ ./AGENTS.md (root, {N} lines) [{created | updated}]
  ✓ ./src/hooks/AGENTS.md ({N} lines) [{created | updated}]
  ✓ ./src/tools/AGENTS.md ({N} lines) [{created | updated}]

Directories Analyzed: {N}
AGENTS.md Created: {N}
AGENTS.md Updated: {N}
Total Lines: {N}

Key Insights Preserved: {N}
Key Insights Updated: {N}

Hierarchy:
  ./AGENTS.md
  ├── src/hooks/AGENTS.md
  └── src/tools/AGENTS.md
\`\`\`

---

## Anti-Patterns for THIS Command

- **Skipping Discovery**: NEVER skip Phase 0.5 - always read existing first
- **Ignoring Existing Content**: Even with --create-new, READ before removing
- **Over-documenting**: Not every directory needs AGENTS.md
- **Redundancy**: Child must NOT repeat parent
- **Generic content**: Remove anything that applies to ALL projects
- **Sequential execution**: MUST use parallel agents
- **Deep nesting**: Rarely need AGENTS.md at depth 4+
- **Verbose style**: "This directory contains..." → just list it
- **Ignoring LSP**: If LSP available, USE IT - semantic analysis > text grep
- **LSP without fallback**: Always have explore agent backup if LSP unavailable
- **Over-referencing**: Don't trace refs for EVERY symbol - focus on exports only
- **Losing institutional knowledge**: Preserve valid insights from existing files`
