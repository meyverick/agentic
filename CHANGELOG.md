# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 0.8.1 - 2026-10-31

### Fixed
- `skills/hypermedia-engine-stacks/SKILL.md` frontmatter parses as YAML again: the unquoted `description` held a `simulation shell: a Rama gateway` colon-space, which YAML reads as a nested mapping, so a strict loader rejected the whole block and the skill failed to load. The colon is an em dash now.
- `scripts/gates.ts` Gate 2 parses every skill frontmatter with `Bun.YAML.parse` and fails the package gate on a parse error, so a hand-rolled `name:` regex can no longer pass a block that the installer's reader refuses.

## 0.8.0 - 2026-10-31

### Added
- `skills/framework-engine-stacks/SKILL.md` returns to the catalog, byte-identical to the copy retired before `0.7.0`: the three-tier SvelteKit-static/Axum-SQLx stack, the Candle in-process inference tier, the Miniplex ECS with Threlte, Babylon.js, PixiJS, and Phaser adapters, the Tauri v2 shell, and the workload selection matrix. The install lane ships 18 skills instead of 17.

### Changed
- Registry carrier: `0.5.0` through `0.7.2` never reached `@meyverick/agentic`, so this release publishes those lines as well.

## 0.7.2 - 2026-10-31

### Changed
- Publishes `0.5.0` through `0.7.1` to the registry for the first time. `0.4.0` was the last release that reached `@meyverick/agentic`, so this patch is the carrier for the four-version line rather than a change of its own.

## 0.7.1 - 2026-10-31

### Added
- `skills/hypermedia-engine-stacks/SKILL.md` gains a `## Verification` section with five application tests — an SSE route asserting `text/event-stream` and a patch frame, `#[sqlx::test]` for a migration plus a `query_as!` round trip, a Maud snapshot, a headless Bevy `App::update`, and a `rama` WSS client round trip — each with its `cargo test` command.
- Syllabus invariants for `Extensions` fork-versus-clone isolation, `PathMatchPolicy` matching, and the `CsrfLayer` fetch-metadata contract.
- The skill verifier asserts that the frontmatter description names the six pillars and the SvelteKit/Axum negative boundary, sweeps `datastar-retries-failed` and `.only_if_missing(`, and resolves every lifecycle step's owner archive on disk.
- `scripts/content-invariants.test.ts` regression cases for the admission mapping, `Extensions` copy, CSRF conditions, routing policy, unkeyed `data-bind`, and the local Datastar actions.
- `scripts/verify-archives-lib.ts`, the verifier's shared rule module, keeping `verify-archives.ts` under the 300-line cohesive-module band; `scripts/gate-verifier.test.ts` gains cases for the description-content, retired-token, and owner-link assertions.

### Changed
- `skills/hypermedia-engine-stacks/references/rama.md` documents the admission contract as a mapping: `LimitReached` implements no `IntoResponse`, so the stream route answers `503` + `Retry-After` itself (or via `LimitLayer::with_error_into_response_fn`), while `ConcurrentPolicy` request concurrency keeps the corpus `429`.
- `references/rama.md` states that `Extensions::fork()` creates an isolated child store while a clone shares it, and names `with_base`, `insert(&self)`, `get_ref_or_insert`, and `AddInputExtensionLayer::overwrite(false)`.
- `references/rama.md` documents the five `CsrfLayer` allow conditions, `with_insecure_bypass`, the proxy caveat, and that `TRACE` and `QUERY` are not exempt; adds `PathMatchPolicy` and the route-layering methods; and documents `Sse::with_keep_alive` (no keep-alive by default, 15 s `KeepAlive` interval) and `Event::with_retry`.
- `references/datastar.md` documents `@setAll`, `@toggleAll`, and `@peek`, replaces the plugin list with a contract table (keyed and unkeyed forms plus the `__ifmissing`/`__prop`/`__event`/`__duration`/`__leading`/`__threshold`/`__full`/`__half`/`__exit`/`__once`/`__terse`/`__delay` modifiers), and states that the unkeyed `data-bind` value is the signal name.
- `references/rama.md` states that `with_endpoint_layer` applies to every route registered after the call and `with_sub_router_make_fn` builds the nested router once at registration; the drain wrapper returns `RouterError` rather than `Infallible`.
- `references/datastar.md` uses `data-on-signal-patch:filter` and a concrete unkeyed `data-computed` form.

### Fixed
- `references/rama.md` no longer claims an over-budget stream is answered `503` without showing how the policy error becomes that answer.
- `references/rama.md` no longer claims a parent never sees a child extension insert without qualifying that a clone shares the store.
- `references/rama.md` no longer presents `CsrfLayer` as a trusted-origin allow-list alone.
- `references/datastar.md` no longer marks the unkeyed `data-bind` form absent, and qualifies the engine size as compressed (`~12 KiB` brotli, 13 KiB gzip, 33 KiB raw).
- `references/datastar.md` states the missing retries-failed event without naming the retired token outside its migration table.
- `SKILL.md` describes `#[sqlx::test]` against a test database created from `DATABASE_URL`, not the `.sqlx/` compile-time cache, and the fidelity summary names the description-content and owner-link assertions.

## 0.7.0 - 2026-10-31

### Added
- `skills/hypermedia-engine-stacks/scripts/provenance.lock`, the single machine-readable record of the five upstream repositories, their commits, their verification dates, and the local-corpus digest.
- `bun scripts/docs-corpus.ts --lock <path>`, which refreshes that record from the local corpus.
- `scripts/gate-verifier.test.ts`, a wiring test proving that a failing skill verifier fails the package gate and that its findings survive the failure path.
- `wiki/adr/0004-version-free-provenance.md`, recording why provenance left the syllabus and how the lock replaces it.

### Changed
- **BREAKING**: `skills/hypermedia-engine-stacks/SKILL.md` and its five archives no longer carry release version numbers, commit pins, `Source:` headers, or the corpus digest. Provenance moved to `scripts/provenance.lock`; a consumer that read the `## Pins and Upgrades` matrix now reads the lock instead.
- The skill verifier's `provenance` and `digest` rules are replaced by `unpinned` — a fenced-code-exempt sweep for `Source:` headers, digests, `repo@sha` pins, and release numbers — and `lock`, which asserts the schema, the five repositories, the commit and date shapes, and exactly one digest. The ceilings, archive links, description cap, transport parity, section order, retired-token sweep, and lifecycle spine are unchanged.
- `scripts/gates.ts` invokes `skills/hypermedia-engine-stacks/scripts/verify-archives.ts`, so archive drift fails the package gate instead of waiting for a manual run.
- The archives now document the verified API surface: `PatchSignals::with_only_if_missing`/`set_only_if_missing`, `ExtensionsRef`/`ExtensionsMut`/`FromExtensions` with the static-versus-dynamic state rule, the `service_fn`/`with_connect`/`set_enable_connect_protocol` WSS registration with a bounded outbound queue, `PgListener::recv` versus `try_recv`, the `SqlSafeStr` simple-query path behind `after_connect`, `sanitize_json` returning `PreEscaped<String>`, `impl maud::Render`, a `204`-scoped Datastar terminal row, `#[component(storage = "SparseSet")]`, and the bounded `wasm-bindgen` queue drained through `MessageWriter::write_batch`.

### Removed
- The `## Pins and Upgrades` matrix and the `Corpus provenance` digest paragraph in `SKILL.md`, both replaced by `scripts/provenance.lock`.

### Fixed
- `references/rama.md` no longer teaches `.only_if_missing(true)`, which is the field name rather than a builder; it names `.with_only_if_missing(true)` and `.set_only_if_missing(true)`.
- `references/datastar.md` no longer claims every non-`200` terminal answer is silent: `204 No Content` is silent, while `4xx`/`5xx` dispatch `datastar-fetch` `error` and `retrying` follows the retry mode.
- `references/maud.md` defines `sanitize_json` before using it, so the `<script>` example is no longer an undefined symbol.
- `references/sqlx.md` no longer reads `Ok(None)` as an empty poll: `recv()` returns a notification, and only `try_recv()` returns the option that signals a lost connection.
- `references/rama.md` and `references/bevy.md` name the WSS inbound loop and the bounded browser queue instead of implying either is unnecessary.

## 0.6.0 - 2026-10-31

### Added
- Five per-pillar reference archives for the `hypermedia-engine-stacks` skill: `references/rama.md`, `references/datastar.md`, `references/maud.md`, `references/sqlx.md`, and `references/bevy.md`, each carrying its upstream pin, a `Re-verify when:` trigger, and the verified API surface for that pillar.
- `skills/hypermedia-engine-stacks/scripts/verify-archives.ts`, a zero-dependency fidelity gate for both Markdown ceilings, archive-link resolution, provenance headers, the single corpus digest, and the retired-token sweep.
- `wiki/adr/0003-hypermedia-reference-archive-split.md`, recording the split, the five pins, and the report corrections that motivated it.

### Changed
- **BREAKING**: the `hypermedia-engine-stacks` reference archive paths changed. The two mixed bridge files are gone; every `references/<name>.md` link must point at one of the five pillar archives.
- The `hypermedia-engine-stacks` syllabus is rewritten around a six-pillar matrix, one transport-status table, the stream-owned connection budget, the bounded principal contract, the retained/retired invariant table, and the telemetry gauges. The corpus digest is recorded once in `SKILL.md`; each archive records its own pin.

### Removed
- `skills/hypermedia-engine-stacks/references/postgres-listen-notify.md` and `skills/hypermedia-engine-stacks/references/bevy-datastar-bridge.md`, superseded by `references/sqlx.md`, `references/rama.md`, and `references/bevy.md`.

### Fixed
- The skill no longer teaches the nonexistent `ElementPatchMode::Morph` or `.into_sse_event()` conversions, the pre-v1 `data-on-click` attribute, `sqlx-data.json`, `SceneRoot`, the pre-0.4 `getrandom_backend` cfg, or the `idle_for()` method. It now names `try_into_sse_event()`, `data-on:click`, `.sqlx/`, `WorldAssetRoot`, the `wasm_js` feature, and the `meta.idle_for` field.
- The canvas boundary is documented as `data-ignore-morph` on the canvas and its container rather than `data-ignore`, and the SSE drain contract documents that a clean `200` close is not re-requested, so a final `PatchElements` re-anchor is required.

## 0.5.0 - 2026-10-30

### Changed
- Post-task learnings are staged in the machine-scoped inbox at `~/.agents/learnings/<domain>.md` instead of a directory inside each project, so one curation pass reads every project's struggles and repeated prevention rules collapse to one finding. The rulebook names `~/.agents/` as the agent home, the scaffold no longer ships a learnings directory, and the curator defaults to the new path. **Migration**: move an existing `learnings/*.md` into `~/.agents/learnings/` and delete the project directory; nothing reads the old location.

### Fixed
- The learning parser now reads the documented `### Field` headings as well as the older `**Field:**` form, which the corpus has always used. Field extraction previously returned empty text, so every entry fell back to its title for the deduplication fingerprint and repeats could never match.

## 0.4.0 - 2026-10-30

### Added
- `--init` gains a code graph lane: it updates the graph CLI globally, reports the executable the path resolves, and builds the workspace index in one non-interactive pass with the background watcher disabled, so nothing is left running. `--no-codegraph` skips it. The lane requires Node and warns when Node is newer than the range the tool declares.

### Changed
- The reference library's code graph clone is now a branch-tracking submodule, matching the rule that external repositories live under `references/` as submodules rather than raw clones.

## 0.3.0 - 2026-10-30

### Added
- `agentic --init`: scaffolds the two-tier workspace the rulebook describes into an empty directory — both gates, the documentation skeleton, two local repositories wired as a submodule, and `openspec init --tools none` unless `--no-openspec`.

## 0.2.0 - 2026-10-30

### Added
- `LICENSE` with the ISC license text, and the matching `ISC` identifier in the package manifest.
- `CONTRIBUTING.md` covering defect reports, skill changes, installer changes, release discipline, and the manual repository-publication steps.
- `.github/FUNDING.yml` and `DEPENDENCIES.md`, generated by the funding gate script rather than hand-authored.
- Progressive `wiki/` for the package and the orchestrator, each with an index, four mastery tiers, and Architecture Decision Records.
- An OpenSpec lane: every install updates the CLI with `bun add -g @fission-ai/openspec@latest`, verifies which executable the path resolves, purges `.openspec`-marked skills, and places the upstream skill set with a matching marker. `--no-openspec` skips the lane entirely.

### Changed
- **BREAKING**: the gate entry points are `scripts/check.ts` and `modules/scripts/check.ts`, invoked as `bun <path>`. `./scripts/check.sh` no longer exists, and no invocation depends on a file mode or a shebang.
- **BREAKING**: every script is TypeScript run by bun. Skill scripts are invoked as `bun scripts/<name>.ts`, and the funding ledger, wiki sync, performance harness, and catalog auditor are all rewritten.
- `README.md` is now a non-technical spotlight; the command surface, ownership marker rules, and rollback semantics moved into the wiki.
- The check gate now validates the funding ledger in the quick lane and resolves funding links in the full lane.
- The generated funding ledger lists the GitHub Sponsors page alongside thanks.dev in `custom:`, so the sponsor button does not depend on a Sponsors profile existing at generation time.
- A module a change touches is now measured: over 500 physical lines fails the gate and blocks completion, 301–500 warns, and an exemption requires a decision record. The rulebook mandates decomposition as an authorized refactor.

### Fixed
- The wiki sync script no longer requires `rsync`, which is absent on Windows and aborted the sync after the wiki had already been enabled and cloned; it mirrors with coreutils instead.
- The wiki sync script refreshes its derived home page and sidebar on every run, so a host-generated placeholder page can no longer survive a sync.

### Removed
- `FUNDING.yml` from the repository root, where GitHub does not read it.
- The shell gates (`scripts/check.sh`), the wiki sync script, and the four Python scripts, replaced by TypeScript equivalents.

## 0.1.0 - 2026-10-30

### Added
- `agentic` executable: a single command installs or updates the consumer rulebook (`.pi` and `.gemini` hosts) and the skill library owned by this package.
- Ownership marker `.agentic`, stamped at install time and never shipped, as the sole input to the skill deletion rule.
- `agentic status` drift report and `agentic install --dry-run` plan preview.
- Collision policy: unmarked directories at a shipped skill name abort the run; `--force` hands ownership over.
- `modules/package.json` with `bin`, `files`, and no build or lifecycle script, so the published TypeScript runs as installed under bun.
- Package gate validating untracked markers, skill frontmatter names, and packed artifact contents; the unit lane runs `bun test`.
- Initial project structure.
