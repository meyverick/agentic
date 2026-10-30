> *Architected and directed by Human Intelligence, **implemented by AI**.*

# {{project}} Codebase

This directory is the single codebase submodule: it holds the application source, the domain packages and the native toolchain.

## Execution Context

Every build, test, lint and packaging command runs with the working directory strictly inside this module.

## Pre-Push Verification

The module gate implements the six-slot contract. The native lane and the smoke check are unconfigured until this project's own commands are added.

| Slot | Lane | State in a fresh workspace |
| --- | --- | --- |
| 1 | Format | skipped until a formatter is configured |
| 2 | Lint | skipped until a linter is configured |
| 3 | Native lanes | fails until format to lint to test to build is filled in |
| 4 | Assets and docs | enforced: spotlight README and tracked wiki |
| 5 | Clean clone | enforced: clean-clone sandbox |
| 6 | Smoke | fails until an entrypoint check is filled in |
