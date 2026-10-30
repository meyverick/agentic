---
name: framework-engine-stacks
description: Recommend and enforce the preferred three-tier architecture, engine pairings, and domain stacks for full-stack, simulation, and native targets. Use when scaffolding new modules, choosing technical stacks, evaluating frontend or backend frameworks, or configuring Rust-Axum-SvelteKit integration.
---

# Framework & Engine Stacks

## Summary
Guidance and selection rules for scaffolding the workspace's preferred three-tier stack across web, backend compute, and graphics/simulation workloads. Every tier prioritizes native performance, static runtime delivery, and end-to-end type safety.

## Core Mental Model & Preferred Tiers
- **UI & Web Tier**: SvelteKit static SPA via `@sveltejs/adapter-static` (`fallback: 'index.html'`) styled with Tailwind v4 and Svelte 5 Runes, served directly by Axum `tower-http`.
- **State Coordinator & Storage**: Axum and Tokio in Rust managing database schema via SQLx migrations in `project/api/migrations/`, backed by PostgreSQL. Shared contracts export via `ts-rs` directly to `project/web/src/lib/types/bindings/`.
- **Compute & In-Process ML**: Pure Rust utilizing Tokio work-stealing, Rayon worker pools for heavy background execution, and Candle for zero-Python local GGUF/Safetensors inference.
- **Client Simulation & Graphics**: Miniplex client-side ECS for dynamic entity lifecycles paired with modular rendering adapters: Threlte for declarative 3D, Babylon.js for WebGPU/Havok physics, PixiJS for high-density 2D (>1,000 nodes), or Phaser for turnkey arcade systems.
- **Cross-Platform Shell**: Tauri v2 packaging the compiled static SPA for desktop and mobile targets.

## Architectural Selection Matrix

| Workload Domain | Recommended Architecture & Engine | Rationale & Trade-offs |
| :--- | :--- | :--- |
| Full-Stack Web SPA | SvelteKit + Tailwind v4 + Axum `tower-http` | Eliminates SSR node fragmentation by serving static SPA routes from the Axum binary. |
| Relational Persistence | PostgreSQL + SQLx (`project/api/migrations/`) | Compile-time query verification via `sqlx-data.json` and strict expand-contract migrations. |
| High-Density 2D (>1,000 nodes) | Miniplex ECS + PixiJS | Zero-allocation frame queries paired with batched WebGL 2D rendering. |
| Complete 2D Arcade Engine | Miniplex ECS + Phaser | Turnkey physics, tilemaps, and audio managers decoupled from domain logic. |
| Declarative 3D Scenes | Miniplex ECS + Threlte | Reactive Svelte 5 component trees integrated with Three.js viewports. |
| Advanced 3D & WebGPU Physics | Miniplex ECS + Babylon.js | Native WebGPU shaders and Havok rigid-body simulation. |
| Multi-Core Background Compute | Rust (Axum + Rayon) | Dedicated worker pools preventing async Tokio reactor blocking. |
| In-Process ML & Vector Search | Rust + Candle | Embedded model execution without Python runtimes or external dependencies. |
| Desktop & Mobile Targets | Tauri v2 | Minimalist native webview wrapping the pre-built static export. |

## Operational Workflow
1. **Scope Intake & Contract Definition**
   - Identify whether the deliverable is a web client, spatial simulation, compute job, or desktop shell.
   - Define backend domain events and derive `TS` types via `ts-rs` into `project/web/src/lib/types/bindings/` before authoring views.
2. **Mounting & Fallback Configuration**
   - Configure `@sveltejs/adapter-static` with `fallback: 'index.html'`.
   - Mount Axum API, WebSocket, and gRPC endpoints strictly before attaching the `tower-http` static fallback handler.
3. **Local Tooling & CI Verification**
   - Proxy `/api` and `/ws` in `vite dev` to `cargo watch -x run` during active iteration.
   - Commit updated query metadata using `cargo sqlx prepare` to guarantee hermetic CI verification.

## Anti-Patterns & Edge Cases
- **SSR Monoliths**: Avoid Node.js-dependent SSR engines; deploy purely static SPA distributions served from Axum.
- **Request-Blocking Compute**: Never run heavy calculations or Candle inference inside request handlers; route jobs to Rayon workers.
- **Client Polling**: Do not poll APIs for dynamic updates; use PostgreSQL LISTEN/NOTIFY and Axum WebSockets/SSE channels.
- **Filesystem Coupling**: Avoid cross-tier relative directory traversal (`../`) at runtime; share data solely via typed network protocols.