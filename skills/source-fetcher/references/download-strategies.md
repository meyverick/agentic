# Download Strategies

How to download source code from different sources.

## Priority Order

1. **GitHub** (if repo URL known) — Best source quality
2. **Package Registry** (npm, crates.io, PyPI) — Fallback
3. **Skip** — If nothing works

## GitHub Download

### Find Repository

```bash
# From npm package
curl -s https://registry.npmjs.org/<package> | jq '.repository.url'

# From GitHub API
curl -s https://api.github.com/repos/<org>/<repo>
```

### Download Source

```bash
# Download tarball
curl -L https://api.github.com/repos/<org>/<repo>/tarball -o source.tar.gz

# Extract
tar -xzf source.tar.gz
mv <org>-<repo>-* <package-name>
```

## npm Download

### Get Package Info

```bash
curl -s https://registry.npmjs.org/<package> | jq .
```

### Download Package

```bash
# Download tarball
curl -L https://registry.npmjs.org/<package>/-/<package>-<version>.tgz -o package.tgz

# Extract
tar -xzf package.tgz
mv package <package-name>
```

## crates.io Download

### Get Crate Info

```bash
curl -s https://crates.io/api/v1/crates/<crate> | jq .
```

### Download Crate

```bash
# Download tarball
curl -L https://crates.io/api/v1/crates/<crate>/download -o crate.tar.gz

# Extract
tar -xzf crate.tar.gz
```

## PyPI Download

### Get Package Info

```bash
curl -s https://pypi.org/pypi/<package>/json | jq .
```

### Download Package

```bash
# Download tarball
curl -L https://files.pythonhosted.org/packages/<path>/<package>-<version>.tar.gz -o package.tar.gz

# Extract
tar -xzf package.tar.gz
```

## What to Include

- Source code (src/, lib/, etc.)
- README.md
- Package metadata (package.json, Cargo.toml, etc.)
- Type definitions (*.d.ts)

## What to Exclude

- node_modules/
- target/ (Rust build)
- dist/ (build output)
- tests/
- examples/
