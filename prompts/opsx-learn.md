---
description: "Analyze reports and generate OpenSpec proposals for skill/prompt improvements"
argument-hint: "[<report-name>]"
---

Analyze reports from `./openspec/reports/` and generate OpenSpec proposals for improvements.

**Input**: Optionally specify a report name. If omitted, processes ALL reports.
**Provided arguments**: ${@:-all reports}

**Steps**

1. **Verify reports directory exists**

   Check if `./openspec/reports/` exists:
   ```bash
   ls ./openspec/reports/ 2>/dev/null || echo "NOT_FOUND"
   ```
   
   If not found, error: "Reports directory not found. Generate reports first with `/opsx-report`."
   
2. **Determine processing mode**

   If report name provided:
   - Process single report: `./openspec/reports/<name>/`
   
   If no argument:
   - Process ALL reports: `./openspec/reports/*/` (excluding `archives/`)

3. **For each report to process**

   **3a. Read report and assessment**

   Read `./openspec/reports/<name>/report.md` and extract:
   - OKF frontmatter (type, title, description, tags, generated, sources)
   - Problem Statement
   - Motivation
   - Approach with decisions
   - What Changed (specs)
   - Implementation (tasks)
   - Validation (evals)
   - Key Decisions
   - Trade-offs
   - Follow-ups

   If `./openspec/reports/<name>/assessment.md` exists, read and extract:
   - Knowledge gaps identified
   - What could have helped
   - Difficulty ratings
   - Tool/document improvements suggested

   **3b. Analyze report content**

   Determine what was built:
   - Check `tags` in frontmatter for skill/prompt names
   - Check `capability-path` in tags
   - Check implementation files mentioned in report
   - Check artifacts/ directory for skill/prompt files

   **3c. Determine tool type**

   Based on analysis, determine what to create:

   | Report Content | Tool Type | Action |
   |----------------|-----------|--------|
   | New skill files | New skill | Create proposal for new skill |
   | Existing skill improvement | Skill update | Create proposal for skill update |
   | New prompt files | New prompt | Create proposal for new prompt |
   | Both skill and prompt | Combo | Create proposal for both |
   | Knowledge gaps in assessment | Reference/docs | Create proposal for reference materials |

   **3d. Check for conflicts**

   If multiple reports affect the same tool:
   - Merge improvements into single proposal
   - Include all suggestions from each report
   - Note which report contributed which improvement

4. **Generate OpenSpec proposals**

   For each determined tool, generate an OpenSpec proposal:

   **Step 1: Create change**
   ```bash
   openspec new change "<proposal-name>"
   ```

   **Step 2: Generate artifacts**
   - proposal.md: What to build and why (from report analysis)
   - specs/: Requirements (from report specs + assessment gaps)
   - design.md: How to build it (from report approach + decisions)
   - tasks.md: Implementation steps

   **Step 3: Display proposal location**
   ```
   ./openspec/changes/<proposal-name>/
   ├── proposal.md
   ├── specs/
   ├── design.md
   └── tasks.md
   ```

5. **Display summary**

   After processing all reports:
   ```markdown
   ## Reports Processed
   
   **Reports analyzed:** <count>
   **Proposals generated:** <count>
   
   **Proposals:**
   - <proposal-1>: <tool-type> — <brief-description>
   - <proposal-2>: <tool-type> — <brief-description>
   - ...
   
   **Next step:** Review proposals with `/opsx-explore <proposal-name>` or implement with `/opsx-apply <proposal-name>`.
   ```

**Guardrails**
- Read reports from `./openspec/reports/` (project's own reports)
- Verify `./openspec/reports/` exists before reading
- Process one report at a time (sequential, not parallel)
- Generate OpenSpec proposals, not skills-todo files
- Merge improvements for same tool into single proposal
- Each proposal is self-contained
- User reviews proposals before implementation
- Use existing opsx-propose workflow for proposal generation
