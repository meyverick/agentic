---
name: rust-worker-setup
description: Create Rust compute workers with Axum + Rayon for parallelized workloads. Use when building stateless workers for queue consumption or parallel computation.
version: "1.0.0"
license: MIT
metadata:
  author: agentic
---

# Rust Worker Setup

Create Rust compute workers with Axum + Rayon.

## Quick Start

When you need to create a Rust compute worker:

1. Create Rust project with `cargo init`
2. Add Axum for HTTP endpoints
3. Add Rayon for parallel computation
4. Implement queue consumption
5. Create Dockerfile for distroless deployment

## Workflow

### Step 1: Create Project

```bash
cargo init <project-name>
cd <project-name>
```

### Step 2: Configure Cargo.toml

```toml
[package]
name = "<project-name>"
version = "0.1.0"
edition = "2021"

[dependencies]
axum = "0.7"
tokio = { version = "1", features = ["full"] }
rayon = "1.8"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tower-http = { version = "0.5", features = ["cors"] }
tracing = "0.1"
tracing-subscriber = "0.3"

[profile.release]
opt-level = 3
lto = true
```

### Step 3: Create Axum Server

Create `src/main.rs`:

```rust
use axum::{routing::post, Json, Router};
use rayon::prelude::*;
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;

#[derive(Deserialize)]
struct WorkRequest {
    items: Vec<String>,
}

#[derive(Serialize)]
struct WorkResult {
    processed: Vec<String>,
    count: usize,
}

async fn process_work(Json(payload): Json<WorkRequest>) -> Json<WorkResult> {
    // Parallel processing with Rayon
    let processed: Vec<String> = payload
        .items
        .par_iter()
        .map(|item| format!("processed: {}", item))
        .collect();

    let count = processed.len();

    Json(WorkResult { processed, count })
}

#[tokio::main]
async fn main() {
    tracing_subscriber::init();

    let app = Router::new().route("/process", post(process_work));

    let addr = SocketAddr::from(([0, 0, 0, 0], 3001));
    println!("Worker listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
```

### Step 4: Implement Queue Consumption

For queue-based workers, add queue client:

```rust
use sqlx::postgres::PgPoolOptions;

async fn consume_queue(pool: &sqlx::PgPool) {
    loop {
        // Fetch work from PostgreSQL queue
        let work = sqlx::query_as::<_, WorkItem>(
            "UPDATE queue SET status = 'running', worker_id = $1 
             WHERE status = 'queued' 
             RETURNING id, payload"
        )
        .bind(worker_id)
        .fetch_optional(pool)
        .await;

        match work {
            Ok(Some(item)) => {
                // Process with Rayon
                let result = process_parallel(item.payload);
                // Update queue status
                update_status(pool, &item.id, "succeeded").await;
            }
            Ok(None) => {
                // No work available, wait
                tokio::time::sleep(Duration::from_secs(1)).await;
            }
            Err(e) => {
                tracing::error!("Queue error: {}", e);
            }
        }
    }
}
```

### Step 5: Create Dockerfile

```dockerfile
# Build stage
FROM rust:latest AS builder
WORKDIR /app
COPY . .
RUN apt-get update && apt-get install -y musl-tools
RUN rustup target add x86_64-unknown-linux-musl
RUN cargo build --release --target x86_64-unknown-linux-musl

# Production stage
FROM gcr.io/distroless/static-debian13:nonroot
COPY --from=builder /app/target/x86_64-unknown-linux-musl/release/worker /app/worker
CMD ["/app/worker"]
```

### Step 6: Build and Test

```bash
# Local build
cargo build --release

# Docker build
docker build -t worker .

# Test endpoint
curl -X POST http://localhost:3001/process \
  -H "Content-Type: application/json" \
  -d '{"items": ["a", "b", "c"]}'
```

## Gotchas

- **Use musl target** for static linking (distroless compatibility)
- **Workers MUST be stateless** — no local state, no in-memory caches
- **Lost worker → work re-queued** — at-least-once delivery
- **Use single-flight + timeout** for any polling (never blind intervals)
- **Heartbeat required** — report progress to coordinator

## Queue Pattern

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Coordinator │────▶│    Queue     │────▶│    Worker    │
│  (SvelteKit) │     │ (PostgreSQL) │     │  (Rust)      │
└──────────────┘     └──────────────┘     └──────────────┘
       ▲                                          │
       └──────────────────────────────────────────┘
                    Results via API/WebSocket
```

## Reference Files

- `references/queue-worker-pattern.md` — Queue + worker pattern details
- `references/axum-template.rs` — Full Axum server template
- `references/dockerfile-rust.md` — Rust Dockerfile template
