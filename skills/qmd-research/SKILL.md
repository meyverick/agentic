---
name: qmd-research
description: >
  Research project knowledge, specifications, and architecture using the
  project-local QMD index and maintain index collections. Use when searching
  project markdown, researching specifications or past reports, or managing
  local QMD index collections and embeddings. Do NOT use when looking up exact
  file paths, symbols, or code lines (use grep or Read), or creating a new change.
allowed-tools: Bash(qmd:*)
license: MIT
compatibility: Requires qmd CLI and local .qmd index.
metadata:
  author: agentic
  version: "1.0.0"
positive_triggers:
  - "research project specifications and architecture with qmd"
  - "search project documentation and past reports conceptually"
  - "manage and update local qmd collections and embeddings"
anti_triggers:
  - "look up exact file path or code symbol"
  - "grep exact string in source code"
---

# QMD Research

Research project knowledge bases and manage project-local QMD index collections.

## Activation Boundary

- **Use when:** Searching project documentation, researching specifications, exploring past change reports, or managing the project-local index and embeddings.
- **Do NOT use when:** Locating exact file paths, line numbers, headings, or code symbols (use `grep` and `Read` instead); or executing code implementations.

## Project-Local Index Law

- **Strict Project Locality:** All index operations bind strictly to the project repository root (`<repo>/.qmd/index.sqlite`, gitignored).
- **No Global Indexing:** NEVER create, populate, query, or fall back to a global or shared index (such as `~/.qmd`).
- **Initialization:** When `.qmd/` is missing during a task, run `qmd init` at the repository root before querying.

## Read Path

### Mode Selection

- **Exact Terms & Symbols:** Keyword search via BM25 (no LLM latency):
  ```bash
  qmd search '"<exact phrase>"' --json -n 10 -c <collection>
  ```
- **Conceptual & Paraphrased Recall:** Multi-line query document authored by the agent:
  ```bash
  qmd query $'intent: <goal and concepts to avoid>\nlex: <lexical anchors>\nvec: <semantic paraphrase>' --json -n 10 -c <collection>
  ```
  Author the query fields deliberately from task context; never pass raw user text to bare `qmd query`.

### Retrieval Discipline

- **Retrieve Before Claiming:** Always fetch full document contents using `qmd get` or `qmd multi-get` before asserting facts:
  ```bash
  qmd get "#<docid>"
  qmd multi-get "<docid1>,<docid2>" --json
  ```
- **Evidence Citation:** Cite the `#docid` or document path together with exact line numbers for any claim.
- **Document Slicing:** Slice ranges using `qmd get "<path:from:count>"` or `-l <count>`, never by piping through `head`, `tail`, or `sed`.
- **Collection Scoping:** Restrict queries to relevant collections using `-c <collection>` (e.g., `-c openspec`, `-c references`).

## Mutation Path (Gated)

Index mutations modify files and vector state. They are strictly gated:
- **Available Mutations:** `qmd init`, `qmd collection add/remove/rename`, `qmd context add/rm`, `qmd embed`, `qmd update`, `qmd cleanup`.
- **Explicit Gate:** Mutations SHALL run ONLY when the user explicitly requests index setup, collection updates, embedding refresh, or repairs.
- **Never on Search:** Read-only searches MUST NOT invoke `collection`, `embed`, `update`, or `cleanup` as a side effect.
- **Embedding Command:**
  ```bash
  qmd update && qmd embed --chunk-strategy auto
  ```
- **Health Inspection:**
  ```bash
  qmd status
  ```

## Gotchas and Anti-Examples

- **Anti-Example (Bare Expand):** Do NOT run `qmd query "how does auth work"`. This delegates query expansion to the model. Instead author `intent:`, `lex:`, and `vec:` lines explicitly.
- **Anti-Example (Output Piping):** Do NOT pipe `qmd get` into `grep`, `sed`, or `awk`. Use QMD's native `path:from:count` range slicing.
- **Anti-Example (External Paths):** Do NOT add home-directory collections (`qmd collection add ~/docs`). All collection paths must reside inside the project tree.
- **Loud Degradation:** If `qmd status` fails or daemon is absent, report that QMD is unavailable and note any `grep` fallback explicitly with retrieved evidence.

## References

- [references/query-craft.md](references/query-craft.md) — Query grammar, multi-line fusion, metadata AST filters, and worked examples.
- [references/index-management.md](references/index-management.md) — Project-local initialization, collection management, context attachment, and maintenance.
