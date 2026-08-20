# Rust Dockerfile Template

## Multi-Stage Build (musl static linking)

```dockerfile
# Build stage
FROM rust:latest AS builder
WORKDIR /app

# Install musl tools
RUN apt-get update && apt-get install -y musl-tools
RUN rustup target add x86_64-unknown-linux-musl

# Cache dependencies
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release --target x86_64-unknown-linux-musl
RUN rm -rf src

# Build application
COPY src ./src
RUN touch src/main.rs && cargo build --release --target x86_64-unknown-linux-musl

# Production stage
FROM gcr.io/distroless/static-debian13:nonroot
COPY --from=builder /app/target/x86_64-unknown-linux-musl/release/worker /app/worker
CMD ["/app/worker"]
```

## Standard Build (glibc)

```dockerfile
FROM rust:latest AS builder
WORKDIR /app
COPY . .
RUN cargo build --release

FROM gcr.io/distroless/base-debian13:nonroot
COPY --from=builder /app/target/release/worker /app/worker
CMD ["/app/worker"]
```

## With Multiple Binaries

```dockerfile
FROM rust:latest AS builder
WORKDIR /app
COPY . .
RUN cargo build --release

FROM gcr.io/distroless/static-debian13:nonroot
COPY --from=builder /app/target/release/worker1 /app/worker1
COPY --from=builder /app/target/release/worker2 /app/worker2
CMD ["/app/worker1"]
```

## .dockerignore

```
target
.git
.gitignore
README.md
LICENSE
*.md
```
