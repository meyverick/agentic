# QMD Contextualization Guide

## Why Context Matters

Context helps QMD's reranking accuracy. Without context, QMD relies only on content similarity, which can miss relevant documents.

## Adding Context

### Collection-Level Context

Describe the overall purpose of the collection:

```bash
qmd context add qmd://api-docs "REST API documentation for the user management service. Includes endpoints for authentication, user CRUD, and profile management."
```

### File-Level Context

Add specific context to individual files:

```bash
qmd context add qmd://api-docs/auth.md "Authentication endpoints including login, logout, and token refresh. Uses JWT tokens."
```

### Best Practices

1. **Be specific**: "User authentication endpoints" not "API docs"
2. **Include domain terms**: Use terms users would search for
3. **Mention relationships**: "Part of the user management system"
4. **Keep it concise**: One to two sentences max

## Context Examples

### Documentation

```bash
qmd context add qmd://guides "Step-by-step tutorials for common tasks. Includes setup guides, migration guides, and best practices."
qmd context add qmd://guides/quickstart.md "Quick start guide for new users. Covers installation, configuration, and first run."
```

### Code

```bash
qmd context add qmd://src "Application source code. TypeScript with SvelteKit framework."
qmd context add qmd/src/lib/db "Database layer using Drizzle ORM with PostgreSQL. Contains schema definitions and query helpers."
```

### Configuration

```bash
qmd context add qmd://config "Configuration files for the application. Includes environment variables, feature flags, and deployment settings."
```

## Updating Context

When content changes, update the context:

```bash
# Re-add context (overwrites previous)
qmd context add qmd://<name> "<updated description>"
```

## Verifying Context

```bash
# List all contexts
qmd context list

# Check context for specific collection
qmd context list --collection <name>
```

## Common Mistakes

| ❌ Bad | ✅ Good |
|--------|---------|
| "Documentation" | "REST API docs for user management" |
| "Source code" | "SvelteKit web app with Drizzle ORM" |
| "Config files" | "Docker compose and env configs" |

## Impact on Search

Better context → better reranking → more relevant results.

Without context, a search for "user authentication" might return any file mentioning "user" or "auth". With context, QMD knows to prioritize the authentication module.
