# Agent Skills Specification

Condensed from agentskills.io/specification.

## Directory Structure

```
skill-name/
├── SKILL.md          # Required: metadata + instructions
├── scripts/          # Optional: executable code
├── references/       # Optional: documentation
├── assets/           # Optional: templates, resources
└── ...               # Any additional files or directories
```

## SKILL.md Format

YAML frontmatter followed by Markdown content.

### Frontmatter Fields

| Field | Required | Constraints |
|-------|----------|-------------|
| `name` | Yes | 1-64 chars. Lowercase letters, numbers, hyphens. No leading/trailing hyphens. No consecutive hyphens. |
| `description` | Yes | 1-1024 chars. Non-empty. Describes what and when. |
| `license` | No | License name or reference to bundled file. |
| `compatibility` | No | Max 500 chars. Environment requirements. |
| `metadata` | No | Arbitrary key-value mapping (string → string). |
| `allowed-tools` | No | Space-separated list of pre-approved tools. Experimental. |

### Name Rules

- 1-64 characters
- Lowercase letters, numbers, hyphens only
- No leading/trailing hyphens
- No consecutive hyphens

Valid: `pdf-processing`, `data-analysis`, `code-review`
Invalid: `PDF-Processing`, `-pdf`, `pdf--processing`

### Description Best Practices

- Use imperative phrasing ("Use when...")
- Focus on user intent, not implementation
- Include specific keywords for triggering
- Be specific, not generic

Good: `Extracts text and tables from PDF files, fills PDF forms, and merges multiple PDFs. Use when working with PDF documents.`
Poor: `Helps with PDFs.`

## Progressive Disclosure

1. **Metadata** (~100 tokens): `name` and `description` loaded at startup
2. **Instructions** (<5000 tokens): Full SKILL.md body loaded when activated
3. **Resources** (as needed): Files in `scripts/`, `references/`, `assets/` loaded on demand

Keep SKILL.md under 500 lines. Move detailed content to references/.

## Validation

Pi validates skills against the Agent Skills standard:
- Name exceeds 64 chars or contains invalid characters → warning
- Name starts/ends with hyphen or has consecutive hyphens → warning
- Description exceeds 1024 chars → warning
- Missing description → not loaded
- Malformed SKILL.md → not loaded

## File References

Use relative paths from skill root:

```markdown
See [the reference guide](references/REFERENCE.md) for details.
Run the extraction script: scripts/extract.py
```

Keep file references one level deep from SKILL.md.
