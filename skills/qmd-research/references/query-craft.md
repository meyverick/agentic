# QMD Query Craft & Syntax Reference

This reference covers the structured query grammar, search mode selection, filtering AST, and practical examples across project corpora.

---

## 1. Query Grammar (`SYNTAX.md`)

A QMD query is either a single expand query or a multi-line query document.

```text
query          = expand_query | query_document ;
expand_query   = text | explicit_expand ;
explicit_expand= "expand:" text ;
query_document = [ intent_line ] { typed_line } ;
intent_line    = "intent:" text newline ;
typed_line     = type ":" text newline ;
type           = "lex" | "vec" | "hyde" ;
text           = quoted_phrase | plain_text ;
```

### Typed Lines Explained

- **`intent:`**: High-level task definition. Explains what the agent is looking for and what nearby-but-wrong concepts to avoid. (Used by rerankers and candidate filtering).
- **`lex:`**: Lexical / BM25 search. Supports exact quoted phrases (`"exact phrase"`), term negation (`-unwanted`), and keyword combinations.
- **`vec:`**: Dense vector embedding search. Translates conceptual paraphrase into semantic embedding space.
- **`hyde:`**: Hypothetical Document Embedding. A simulated passage answering the query to bridge vocabulary mismatch.

---

## 2. Mode Selection & Scoping

| Goal | Mode | CLI Pattern | Latency |
|---|---|---|---|
| Exact symbol, path, title, heading | `qmd search` | `qmd search '"<term>"' -c <collection>` | Fast (~3ms) |
| Conceptual / Paraphrased topic | `qmd query` (structured) | `qmd query $'intent: ...\nlex: ...\nvec: ...'` | Medium (~50-100ms) |
| Multi-document evidence gathering | `qmd multi-get` | `qmd multi-get "<docid1>,<docid2>" --json` | Fast (<10ms) |

### Scoping with `-c`

Always constrain search to target collections:
- `-c openspec`: Search specifications, active changes, and archived changes.
- `-c references`: Search external documentation, framework guides, and specifications.
- `-c pi-memory`: Search persistent session memory and daily developer notes.

---

## 3. Worked Examples on Project Corpora

### Example 1: Finding an Architectural Specification

Goal: Locate which capability specification governs submodule pointer sync.

```bash
qmd query $'intent: find the spec governing submodule pointer freshness and CI gates\nlex: "Submodule Pointer Sync" gitlink\nvec: committing updated submodule pointer in orchestrator' --json -n 5 -c openspec
```

### Example 2: Clustering Gotchas Across Archived Reports

Goal: Find past reports encountering borrow-checker or lifetime fights.

```bash
qmd query $'intent: cluster recurring knowledge gaps across reports\nlex: "lifetime" "borrow" "clippy"\nvec: difficulties with rust borrow checker and reference lifetimes' --json -n 10 -c openspec
```

### Example 3: Searching Shipped Skill Patterns

Goal: Inspect how validation loops are designed in existing skills.

```bash
qmd search '"validate-routing"' --json -n 5 -c references
```

---

## 4. Retrieval Verification (`qmd bench`)

Pin search quality benchmarks against a JSON fixture file:
```bash
qmd bench project/skills/openspec-learn/evals/retrieval-bench.json
```
Measures Precision@k, Recall@1/3/5, MRR, and latency across BM25, vector, hybrid, and full reranked backends.
