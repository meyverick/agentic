---
description: "Harden an existing OpenSpec change for cold application — enrich artifacts with concrete file paths, code blocks, and verify steps"
argument-hint: "[<change-name>]"
---

Load the `openspec-harden` skill and follow its workflow to harden ${@:-the last change} for cold application by a fresh agent.

**Store handling:** If a store is selected, pass `--store <id>` on all openspec commands (sticky). **Remaining args:** ${@}
