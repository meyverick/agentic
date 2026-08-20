# Dockerfile Templates

## SvelteKit (Bun)

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

## Rust Worker

```dockerfile
# Build stage
FROM rust:latest AS builder
WORKDIR /app
COPY . .
RUN cargo build --release

# Production stage
FROM gcr.io/distroless/static-debian13:nonroot
COPY --from=builder /app/target/release/worker /app/worker
CMD ["/app/worker"]
```

## docker-compose.yml

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
      - db

  worker:
    build: ./worker
    environment:
      - DATABASE_URL=postgres://user:pass@db:5432/mydb
    depends_on:
      - db

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

volumes:
  pgdata:
```

## Best Practices

- Multi-stage builds for minimal attack surface
- distroless base images for production
- Non-root user execution
- Health checks for orchestrator
- Volume mounts for persistent data
