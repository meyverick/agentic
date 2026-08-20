// Axum Server Template
// Full working example with health check and process endpoint

use axum::{
    extract::State,
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
use rayon::prelude::*;
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use tokio::sync::RwLock;

// Shared state
type AppState = RwLock<WorkerState>;

struct WorkerState {
    processed: u64,
}

// Request/Response types
#[derive(Deserialize)]
struct ProcessRequest {
    items: Vec<String>,
}

#[derive(Serialize)]
struct ProcessResponse {
    processed: Vec<String>,
    count: u64,
}

#[derive(Serialize)]
struct HealthResponse {
    status: String,
    processed: u64,
}

// Handlers
async fn health(State(state): State<AppState>) -> Json<HealthResponse> {
    let state = state.read().await;
    Json(HealthResponse {
        status: "healthy".to_string(),
        processed: state.processed,
    })
}

async fn process(
    State(state): State<AppState>,
    Json(payload): Json<ProcessRequest>,
) -> Result<Json<ProcessResponse>, StatusCode> {
    // Parallel processing with Rayon
    let processed: Vec<String> = payload
        .items
        .par_iter()
        .map(|item| format!("processed: {}", item))
        .collect();

    let count = processed.len() as u64;

    // Update state
    let mut state = state.write().await;
    state.processed += count;

    Ok(Json(ProcessResponse { processed, count }))
}

#[tokio::main]
async fn main() {
    // Initialize tracing
    tracing_subscriber::init();

    // Create shared state
    let state = AppState::new(RwLock::new(WorkerState { processed: 0 }));

    // Build router
    let app = Router::new()
        .route("/health", get(health))
        .route("/process", post(process))
        .with_state(state);

    // Start server
    let addr = SocketAddr::from(([0, 0, 0, 0], 3001));
    tracing::info!("Worker listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .unwrap();

    axum::serve(listener, app).await.unwrap();
}
