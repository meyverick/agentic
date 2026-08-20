# Rust Dockerfile Templates

## Multi-Stage Build (musl static linking)

```dockerfile
# Build stage
FROM rust:latest AS builder
WORKDIR /app

# Install musl tools for static linking
RUN apt-get update && apt-get install -y musl-tools
RUN rustup target add x86_64-unknown-linux-musl

# Copy manifests first (cache dependencies)
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release --target x86_64-unknown-linux-musl
RUN rm -rf src

# Copy source and build
COPY src ./src
RUN touch src/main.rs && cargo build --release --target x86_64-unknown-linux-musl

# Production stage
FROM gcr.io/distroless/static-debian13:nonroot
COPY --from=builder /app/target/x86_64-unknown-linux-musl/release/worker /app/worker
CMD ["/app/worker"]
```

## Standard Build (glibc)

```dockerfile
# Build stage
FROM rust:latest AS builder
WORKDIR /app
COPY . .
RUN cargo build --release

# Production stage
FROM gcr.io/distroless/base-debian13:nonroot
COPY --from=builder /app/target/release/worker /app/worker
CMD ["/app/worker"]
```

## docker-compose.yml

```yaml
version: '3.8'

services:
  worker:
    build: .
    environment:
      - DATABASE_URL=postgres://user:pass@db:5432/mydb
      - QUEUE_TABLE=queue
      - WORKER_ID=worker-1
    depends_on:
      - db
    deploy:
      replicas: 3  # Horizontal scaling

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=mydb
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

## Best Practices

- Use musl for static linking (distroless compatibility)
- Multi-stage builds for minimal image size
- Non-root user (nonroot) for security
- Copy only necessary binaries
- No package manager in final image
