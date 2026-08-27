---
description: "Analyze reports and generate OpenSpec proposals for skill/prompt improvements"
argument-hint: "[<report-name>]"
---

Load the `openspec-learn` skill and follow its workflow to analyze ${@:-all reports} in `./openspec/reports/` and generate OpenSpec proposals for improvements.

**Store handling:** If a store is selected, pass `--store <id>` on all openspec commands (sticky). **Remaining args:** ${@}
