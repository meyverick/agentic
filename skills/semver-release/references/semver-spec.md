# Semantic Versioning 2.0.0

## Summary

Given a version number MAJOR.MINOR.PATCH, increment the:

1. **MAJOR** version when you make incompatible API changes
2. **MINOR** version when you add functionality in a backward compatible manner
3. **PATCH** version when you make backward compatible bug fixes

## Specification

1. A normal version number MUST take the form X.Y.Z where X, Y, and Z are non-negative integers.

2. MAJOR version MUST be incremented when you make incompatible API changes.

3. MINOR version MUST be incremented when you add functionality in a backward compatible manner.

4. PATCH version MUST be incremented when you make backward compatible bug fixes.

5. A pre-release version MAY be denoted by appending a hyphen and a series of dot-separated identifiers.

6. A build metadata version MAY be denoted by appending a plus sign and a series of dot-separated identifiers.

## Examples

```
1.0.0 → 1.0.1 (patch: bug fix)
1.0.0 → 1.1.0 (minor: new feature)
1.0.0 → 2.0.0 (major: breaking change)
```

## Pre-release Versions

```
1.0.0-alpha.1
1.0.0-beta.1
1.0.0-rc.1
```

## Why SemVer?

- Predictable version numbers
- Clear communication of changes
- Safe dependency upgrades
- Machine-readable compatibility

## References

- [semver.org](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/)
