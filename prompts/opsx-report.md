---
description: "Generate a comprehensive report from an archived OpenSpec change"
argument-hint: "<change-name>"
---

Generate a comprehensive, self-contained, OKF-compliant report from an archived OpenSpec change.

**Input**: Specify the archived change name (e.g., `/opsx-report skill-creator`).
**Provided arguments**: $@

**Steps**

1. **Validate archive exists**

   Check if `openspec/changes/archive/<name>/` exists.
   If not found, error: "Archive '<name>' not found. Available archives: [list]"
   
   List available archives:
   ```bash
   ls openspec/changes/archive/ 2>/dev/null || echo "No archives found"
   ```

2. **Read archive metadata**

   Read `.openspec.yaml` from archive directory to extract:
   - Schema used
   - Change name
   - Any custom metadata

3. **Read all planning artifacts**

   Read from archive directory:
   - `proposal.md` (if exists)
   - `design.md` (if exists)
   - `specs/**/*.md` (if exists)
   - `tasks.md` (if exists)

4. **Detect implementation files**

   Scan archive directory for implementation files beyond planning artifacts:
   - `scripts/` — executable code
   - `references/` — documentation
   - `evals/` — evaluation data
   - `assets/` — templates, resources
   - `templates/` — output shapes
   - Any other directories or files that improve the report

5. **Create report directory**

   Create `openspec/reports/<name>/` with subdirectories:
   - `artifacts/` — copies of planning artifacts
   - Implementation directories (as detected)

6. **Copy planning artifacts**

   Copy all planning artifacts to `artifacts/`:
   ```bash
   cp openspec/changes/archive/<name>/proposal.md openspec/reports/<name>/artifacts/
   cp openspec/changes/archive/<name>/design.md openspec/reports/<name>/artifacts/
   cp -r openspec/changes/archive/<name>/specs/ openspec/reports/<name>/artifacts/
   cp openspec/changes/archive/<name>/tasks.md openspec/reports/<name>/artifacts/
   ```

7. **Copy implementation files**

   Copy detected implementation files to report directory:
   ```bash
   # Example for skill/tool changes
   cp -r openspec/changes/archive/<name>/scripts/ openspec/reports/<name>/scripts/
   cp -r openspec/changes/archive/<name>/references/ openspec/reports/<name>/references/
   cp -r openspec/changes/archive/<name>/evals/ openspec/reports/<name>/evals/
   cp -r openspec/changes/archive/<name>/assets/ openspec/reports/<name>/assets/
   ```

8. **Generate report.md**

   Create `openspec/reports/<name>/report.md` with OKF-compliant frontmatter and comprehensive sections.

   **Frontmatter template:**
   ```yaml
   ---
   type: OpenSpec Report
   title: "Report: <change-name>"
   description: "<one-line summary from proposal>"
   status: stable
   tags: [openspec, <schema-name>, <capability-path>]
   generated:
     by: opsx-report/1.0
     at: <ISO-8601-timestamp>
   sources:
     - id: proposal
       resource: artifacts/proposal.md
       title: Proposal
     - id: design
       resource: artifacts/design.md
       title: Design
     - id: specs
       resource: artifacts/specs/
       title: Specifications
     - id: tasks
       resource: artifacts/tasks.md
       title: Tasks
     - id: archive
       resource: "openspec/changes/archive/<name>/"
       title: Original archive location
   stale_after: <90-days-from-now>
   ---
   ```

   **Report sections:**
   
   ```markdown
   # Report: <change-name>
   
   ## Problem Statement
   [From proposal.md - Why section]
   
   ## Motivation
   [From proposal.md - What Changes section]
   
   ## Approach
   [From design.md - Decisions section with rationale]
   
   ### Decision: <name>
   **Choice**: <what was chosen>
   **Alternatives**: <what was considered>
   **Rationale**: <why this choice>
   
   ## What Changed (Specs)
   [From specs/ - delta spec analysis]
   
   ### Added Requirements
   - <requirement-name>: <summary>
   
   ### Modified Requirements
   - <requirement-name>: <what changed>
   
   ### Removed Requirements
   - <requirement-name>: <reason>
   
   ## Implementation
   [From tasks.md - completed tasks grouped by phase]
   
   ### Tasks Complete (N/N)
   - [x] <task description>
   
   ### Files Created
   - `<path>`: <purpose>
   
   ### Files Modified
   - `<path>`: <what changed>
   
   ## Validation
   [From evals/ - if exists, otherwise "No evaluation performed"]
   
   ## Key Decisions
   [Distilled from design.md]
   
   | Decision | Choice | Rationale |
   |----------|--------|-----------|
   | <name> | <choice> | <rationale> |
   
   ## Trade-offs
   [From design.md - Risks/Trade-offs]
   
   | Risk | Mitigation |
   |------|------------|
   | <risk> | <mitigation> |
   
   ## Follow-ups
   [Any deferred work, future considerations]
   
   - [ ] <follow-up item>
   
   ## Archive Metadata
   - **Location**: `<archive-path>`
   - **Date**: <YYYY-MM-DD>
   - **Schema**: <schema-name>
   - **Root**: `<planningHome.root>`
   
   ## Additional Sections
   [Freedom for change-specific content]
   ```

9. **Generate assessment.md**

   Create `openspec/reports/<name>/assessment.md` with AI agent self-reflection.

   **Frontmatter template:**
   ```yaml
   ---
   type: Assessment
   title: "Assessment: <change-name>"
   description: "AI agent self-reflection on the change"
   generated:
     by: opsx-report/1.0
     at: <ISO-8601-timestamp>
   ---
   ```

   **Assessment sections:**
   
   ```markdown
   # Assessment: <change-name>
   
   ## Reflection
   
   ### What Went Well
   <!-- Agent: List successes, smooth parts, good decisions -->
   
   ### What Went Poorly
   <!-- Agent: List failures, difficulties, bad decisions -->
   
   ## Difficulty Ratings
   
   | Dimension | Rating (1-5) | Notes |
   |-----------|--------------|-------|
   | Overall | | |
   | Technical complexity | | |
   | Scope clarity | | |
   | Integration | | |
   | Time estimation | | |
   
   ## Knowledge Gaps
   
   ### What knowledge and skills were you lacking?
   <!-- Agent: Specific gaps identified during the change -->
   
   ### What could have helped?
   <!-- Agent: Reference materials, examples, documentation -->
   
   ## Suggestions for Future Changes
   
   ### Process improvements
   <!-- Agent: What to do differently next time -->
   
   ### Tool improvements
   <!-- Agent: What tools/skills need improvement -->
   
   ### Documentation gaps
   <!-- Agent: What documentation should be created -->
   ```

10. **Display progress**

   During generation, display:
   - "Reading proposal.md..."
   - "Reading design.md..."
   - "Scanning specs/..."
   - "Reading tasks.md..."
   - "Detecting implementation files..."
   - "Copying artifacts..."
   - "Copying implementation files..."
   - "Generating report.md..."
   - "Generating assessment.md..."

10. **Display completion summary**

    After generation completes:
    ```markdown
    ## Report Generated
    
    **Change:** <name>
    **Location:** openspec/reports/<name>/report.md
    **Sections:** 11 base + N additional
    **Files referenced:** N
    **Artifacts copied:** N
    **Implementation files copied:** N
    ```

**Guardrails**
- Read artifacts from archive, not from active changes
- Preserve original content (don't rewrite proposal/design)
- Include full spec content (not summaries)
- No external links (self-contained)
- No line numbers (portable)
- Always generate all base sections (even if empty)
- Add additional sections only when relevant content exists
- Copy implementation files that improve understanding
- Use ISO 8601 timestamps
- Use OKF actor convention: `opsx-report/1.0`
