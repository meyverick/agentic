# Bun Dockerfile Template

## Multi-Stage Build

```dockerfile
# Build stage
FROM oven/bun:latest AS builder
WORKDIR /app

# Copy package files first (cache dependencies)
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# Copy source and build
COPY . .
RUN bun run build

# Production stage
FROM oven/bun:distroless
WORKDIR /app

# Copy only necessary files
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Expose port
EXPOSE 3000

# Run as non-root (distroless default)
CMD ["bun", "run", "build"]
```

## With TypeScript

```dockerfile
FROM oven/bun:latest AS builder
WORKDIR /app
COPY package.json bun.lock* tsconfig.json ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM oven/bun:distroless
WORKDIR /app
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 3000
CMD ["bun", "run", "build"]
```

## With Environment Variables

```dockerfile
FROM oven/bun:latest AS builder
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile
COPY . .

# Build-time args
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL

RUN bun run build

FROM oven/bun:distroless
WORKDIR /app
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 3000
CMD ["bun", "run", "build"]
```

## .dockerignore

```
node_modules
build
.git
.gitignore
README.md
.env
.env.local
.vscode
.idea
```
