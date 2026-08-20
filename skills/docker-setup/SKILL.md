---
name: docker-setup
description: Create Dockerfiles and docker-compose.yml for projects. Use when containerizing applications, setting up local development environments, or configuring multi-service architectures.
version: "1.0.0"
license: MIT
metadata:
  author: agentic
---

# Docker Setup

Create Dockerfiles and docker-compose.yml for projects.

## Quick Start

When you need to containerize an application:

1. Create multi-stage Dockerfile
2. Use distroless base image
3. Configure docker-compose.yml
4. Set up health checks
5. Configure networks and volumes

## Workflow

### Step 1: Create Dockerfile

#### Bun/SvelteKit

```dockerfile
# Build stage
FROM oven/bun:latest AS builder
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

# Production stage
FROM oven/bun:distroless
WORKDIR /app
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 3000
CMD ["bun", "run", "build"]
```

#### Rust

```dockerfile
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
```

### Step 2: Create docker-compose.yml

```yaml
version: '3.8'

services:
  web:
    build: ./web
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgres://user:pass@db:5432/mydb
    depends_on:
      db:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  worker:
    build: ./worker
    environment:
      - DATABASE_URL=postgres://user:pass@db:5432/mydb
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=mydb
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d mydb"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

### Step 3: Configure Health Checks

Health checks are required for orchestrator:

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

### Step 4: Configure Networks

```yaml
networks:
  default:
    driver: bridge
    name: app-network
```

### Step 5: Configure Volumes

```yaml
volumes:
  pgdata:
    driver: local
  redis-data:
    driver: local
```

## Gotchas

- **Bun**: use `oven/bun:distroless`
- **Rust**: use `gcr.io/distroless/static-debian13:nonroot`
- **Health checks required** for orchestrator dependency resolution
- **No root user** in containers (use nonroot)
- **Multi-stage builds** for minimal attack surface
- **distroless** for production (no shell, no package manager)

## Best Practices

- Use `.dockerignore` to exclude unnecessary files
- Pin base image versions for reproducibility
- Use multi-stage builds to reduce image size
- Run as non-root user
- Use health checks for all services
- Use named volumes for persistent data

## Reference Files

- `references/dockerfile-bun.md` — Bun Dockerfile template
- `references/dockerfile-rust.md` — Rust Dockerfile template
- `references/docker-compose-template.yml` — Compose template
