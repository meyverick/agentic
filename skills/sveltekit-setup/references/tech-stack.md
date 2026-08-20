# Tech Stack

## Default Architecture (3-Tier Separation)

| Tier | Technology | Purpose |
|------|------------|---------|
| Web | SvelteKit + Bun | Full-stack web & job manager |
| Styling | Tailwind CSS v4 | Zero-runtime utility layout |
| Database | PostgreSQL + Drizzle ORM | Relational datastore |
| Compute | Rust + Axum + Rayon | Parallelized workloads |
| Graphics | Threlte, PixiJS, Phaser | In-browser rendering |

## Web Tier

- **Framework**: SvelteKit with `svelte-adapter-bun`
- **Runtime**: Bun (native WebSocket support)
- **Styling**: Tailwind CSS v4 via `@tailwindcss/vite`
- **State**: Svelte 5 Runes
- **Deployment**: `oven/bun:distroless`

## Compute Tier

- **Language**: Rust
- **HTTP**: Axum
- **Parallelism**: Rayon
- **Deployment**: `gcr.io/distroless/static-debian13:nonroot`

## Graphics Tier

| Use Case | Technology |
|----------|------------|
| Standard DOM | Svelte + Tailwind |
| 3D | Threlte + Three.js |
| 2D (Performance) | PixiJS |
| 2D (Game Engine) | Phaser |

## Database

- **Engine**: PostgreSQL
- **ORM**: Drizzle ORM
- **Migrations**: drizzle-kit
- **Schema**: `src/lib/server/db/schema.ts`

## Containerization

| Tier | Base Image |
|------|------------|
| Web | `oven/bun:distroless` |
| Compute | `gcr.io/distroless/static-debian13:nonroot` |
