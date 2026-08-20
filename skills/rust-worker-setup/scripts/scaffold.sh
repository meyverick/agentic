#!/usr/bin/env bash
# scaffold.sh — Scaffold a new Rust worker project with Axum + Rayon
# Usage: scaffold.sh <project-name> [directory]
# Output: JSON with created path

set -euo pipefail

PROJECT_NAME="${1:?Usage: scaffold.sh <project-name> [directory]}"
DIRECTORY="${2:-.}"

echo "=== Rust Worker Setup ==="
echo "Project: $PROJECT_NAME"
echo "Directory: $DIRECTORY"
echo ""

# Step 1: Create Rust project
echo "[1/4] Creating Rust project..."
cargo init "$DIRECTORY/$PROJECT_NAME"
cd "$DIRECTORY/$PROJECT_NAME"

# Step 2: Configure Cargo.toml
echo "[2/4] Configuring Cargo.toml..."
cat > Cargo.toml << EOF
[package]
name = "$PROJECT_NAME"
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
EOF

# Step 3: Create main.rs with Axum server
echo "[3/4] Creating Axum server..."
cat > src/main.rs << 'EOF'
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
EOF

# Step 4: Create Dockerfile
echo "[4/4] Creating Dockerfile..."
cat > Dockerfile << 'EOF'
# Build stage
FROM rust:latest AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y musl-tools
RUN rustup target add x86_64-unknown-linux-musl
COPY . .
RUN cargo build --release --target x86_64-unknown-linux-musl

# Production stage
FROM gcr.io/distroless/static-debian13:nonroot
COPY --from=builder /app/target/x86_64-unknown-linux-musl/release/worker /app/worker
CMD ["/app/worker"]
EOF

# Output JSON
cat << EOF
{
  "status": "created",
  "path": "$DIRECTORY/$PROJECT_NAME",
  "tech_stack": {
    "language": "Rust",
    "http": "Axum",
    "parallelism": "Rayon",
    "deployment": "gcr.io/distroless/static-debian13:nonroot"
  },
  "next_steps": [
    "Implement your worker logic in src/main.rs",
    "Run 'cargo build --release' to build",
    "Run 'docker build -t worker .' to build container"
  ]
}
EOF
