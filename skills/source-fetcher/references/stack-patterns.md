# Stack Detection Patterns

How to detect project stack from configuration files.

## Node/Bun

| Indicator | Location | Stack |
|-----------|----------|-------|
| package.json | Root | Node/Bun |
| bun.lockb | Root | Bun |
| yarn.lock | Root | Yarn |
| pnpm-lock.yaml | Root | pnpm |
| .nvmrc | Root | Node |
| .node-version | Root | Node |

## Rust

| Indicator | Location | Stack |
|-----------|----------|-------|
| Cargo.toml | Root | Rust |
| Cargo.lock | Root | Rust |
| rust-toolchain.toml | Root | Rust |

## Python

| Indicator | Location | Stack |
|-----------|----------|-------|
| requirements.txt | Root | Python |
| pyproject.toml | Root | Python |
| setup.py | Root | Python |
| Pipfile | Root | Python (pipenv) |
| poetry.lock | Root | Python (poetry) |

## Go

| Indicator | Location | Stack |
|-----------|----------|-------|
| go.mod | Root | Go |
| go.sum | Root | Go |

## Frameworks

| Indicator | Location | Framework |
|-----------|----------|-----------|
| svelte.config.js | Root | SvelteKit |
| vite.config.ts | Root | Vite |
| vite.config.js | Root | Vite |
| tailwind.config.js | Root | TailwindCSS |
| tailwind.config.ts | Root | TailwindCSS |
| drizzle.config.ts | Root | Drizzle ORM |
| next.config.js | Root | Next.js |
| nuxt.config.js | Root | Nuxt |

## Runtime

| Indicator | Location | Runtime |
|-----------|----------|---------|
| bun.lockb | Root | Bun |
| package.json engines.bun | Root | Bun |
| package.json engines.node | Root | Node |
