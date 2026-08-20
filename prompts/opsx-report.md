---
description: "Generate self-reflection on an archived OpenSpec change"
argument-hint: "[<change-name>]"
---

Generate self-reflection (meditation) on an archived OpenSpec change.

**Input**: Optionally specify the archived change name. If omitted, uses the latest archived change.
**Provided arguments**: ${@:-latest archived change}

**Steps**

1. **Find archive**

   Archives have date prefixes (e.g., `2026-08-18-add-central-datastore`). Search intelligently:

   **Step 1: Try exact match**
   ```bash
   ls openspec/changes/archive/<name>/ 2>/dev/null
   ```

   **Step 2: If not found, fuzzy search**
   ```bash
   ls openspec/changes/archive/ | grep -i "<name>"
   ```

   **Step 3: Handle results**
   - If exactly one match → use it (strip date prefix for display)
   - If multiple matches → show list and ask user to select
   - If no matches → error with available archives:
   ```bash
   ls openspec/changes/archive/ 2>/dev/null || echo "No archives found"
   ```
   
   **Always announce which archive was found:**
   - Exact match: "Found: <name>"
   - Fuzzy match: "Found: <full-archive-name> (matched '<name>')"

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

4. **Create report directory**

   Create `openspec/reports/<name>/` (no subdirectories — just report.md and assessment.md).

5. **Generate report.md**

   Create `openspec/reports/<name>/report.md` using template at `assets/templates/report.md.template`.

   Fill in template placeholders with actual values from the archive.

   **Report sections (meditation):**
   
   ```markdown
   # Report: <change-name>
   
   *Self-reflection on archived change: <archive-path>*
   
   ## What Happened
   [Brief summary referencing archive - not copied content]
   
   ## What I Learned
   [Insights, patterns, key takeaways]
   
   ## What I'd Do Differently
   [Improvements, alternative approaches]
   
   ## Key Decisions
   [Distilled from design.md - what was decided and why]
   
   | Decision | Choice | Rationale |
   |----------|--------|-----------|
   | <name> | <choice> | <rationale> |
   
   ## Trade-offs Made
   [From design.md - what was sacrificed]
   
   | Risk | Mitigation |
   |------|------------|
   | <risk> | <mitigation> |
   
   ## Follow-ups
   [Deferred work, future considerations]
   
   - [ ] <follow-up item>
   
   ## Archive Reference
   - **Location**: `<archive-path>`
   - **Date**: <YYYY-MM-DD>
   - **Schema**: <schema-name>
   ```

6. **Generate assessment.md**

   Create `openspec/reports/<name>/assessment.md` with AI agent meditation.

   **Frontmatter template:**
   ```yaml
   ---
   type: Assessment
   title: "Assessment: <change-name>"
   description: "AI agent meditation on the experience"
   generated:
     by: opsx-report/1.0
     at: <ISO-8601-timestamp>
   ---
   ```

   **Assessment sections (meditation):**
   
   ```markdown
   # Assessment: <change-name>
   
   *Meditation on the experience of this change.*
   
   ## How It Felt
   
   ### What Went Well
   <!-- Agent: What was smooth, satisfying, successful -->
   
   ### What Went Poorly
   <!-- Agent: What was frustrating, difficult, problematic -->
   
   ## Difficulty Ratings
   
   | Dimension | Rating (1-5) | Notes |
   |-----------|--------------|-------|
   | Overall | | |
   | Technical complexity | | |
   | Scope clarity | | |
   | Integration | | |
   | Time estimation | | |
   
   ## What I Was Lacking
   
   ### Knowledge gaps
   <!-- Agent: What I didn't know but needed to -->
   
   ### Skills gaps
   <!-- Agent: What I couldn't do well enough -->
   
   ## What Would Help Next Time
   
   ### Process improvements
   <!-- Agent: What to do differently -->
   
   ### Tool improvements
   <!-- Agent: What tools need to be better -->
   
   ### Documentation gaps
   <!-- Agent: What docs would have helped -->
   ```

7. **Validate report**

    Check generated report and assessment:
    
    **Report validation:**
    - All meditation sections present (What Happened, What I Learned, What I'd Do Differently)
    - No placeholder content (TODO/FIXME/N/A) unless legitimate
    - Frontmatter complete (type, title, description, generated)
    
    **Assessment validation:**
    - At least 2 items in "What Went Well"
    - At least 2 items in "What Went Poorly"
    - At least 1 knowledge gap identified
    
    If validation fails, auto-fix and re-validate.

8. **Display progress**

    During generation, display:
    - "Reading archive..."
    - "Generating report.md (self-reflection)..."
    - "Generating assessment.md (meditation)..."
    - "Validating report..."

9. **Display completion summary**

    After generation completes:
    ```markdown
    ## Self-Reflection Generated
    
    **Change:** <name>
    **Location:** openspec/reports/<name>/
    **Archive:** <archive-path>
    **Files:** report.md, assessment.md
    ```

**Content Relevance Guidance**

Populate sections based on archive content:
- If archive has `specs/` → populate "What Changed (Specs)" with requirements analysis
- If archive has `tasks.md` → populate "Implementation" with task completion status
- If archive has `design.md` → populate "Approach" with decisions and rationale
- If archive has `evals/` → populate "Validation" with test results

Leave sections empty only when the source artifact doesn't exist.

**Guardrails**
- Reference archive, don't copy content
- Archive is source of truth, report is self-reflection
- Report answers: What happened? What did I learn? What would I do differently?
- Assessment answers: How did it feel? What was lacking? What would help next time?
- Use ISO 8601 timestamps
- Use OKF actor convention: `opsx-report/1.0`
