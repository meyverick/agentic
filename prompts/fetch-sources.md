---
description: "Download all source code from project dependencies for AI agent reference"
argument-hint: "[<project-path>] [--cleanup]"
---

Download all source code from project dependencies to `./references/src/` for AI agent reference.

**Input**: Optionally specify project path and/or --cleanup flag.
**Provided arguments**: ${@:-current directory}

**Modes:**
- Default: Download sources
- `--cleanup`: Remove unused sources

**Steps**

1. **Detect project stack**

   Scan for configuration files:
   ```bash
   ls package.json Cargo.toml requirements.txt go.mod 2>/dev/null
   ```

   Run stack detection:
   ```bash
   node .pi/skills/source-fetcher/scripts/detect-stack.mjs <project-path>
   ```

2. **Scan dependencies**

   Parse configuration files for dependencies:
   ```bash
   node .pi/skills/source-fetcher/scripts/scan-deps.mjs <project-path>
   ```

3. **Download source**

   For each dependency:
   ```bash
   node .pi/skills/source-fetcher/scripts/download-src.mjs <package-name> ./references/src
   ```

4. **Verify download**

   Check that source was downloaded:
   ```bash
   ls ./references/src/
   ```

5. **Display summary**

   ```markdown
   ## Source Downloaded
   
   **Stack detected:** <list>
   **Dependencies found:** <count>
   **Source downloaded to:** ./references/src/
   
   **Packages:**
   - <package-1>: <source-location>
   - <package-2>: <source-location>
   - ...
   ```

**Cleanup Mode**

If `--cleanup` flag is provided:

1. Scan current dependencies (package.json, Cargo.toml, etc.)
2. Scan ./references/src/ for existing packages
3. Find packages in src/ NOT in current dependencies
4. Display list of unused packages
5. Ask user: "Remove these? [y/n]"
6. On confirmation: remove unused src/ directories and sources.json entries

```bash
/fetch-sources --cleanup
```

**Guardrails**
- Download latest version only
- Download all source files (no filtering)
- Preserve directory structure
- Reference only (not for execution)
- Cleanup requires user confirmation
