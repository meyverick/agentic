# Antipatterns

16 audited failure modes from agent builds. Self-audit checklist.

## A1: Phantom Tool Reference

**Pattern**: Prompt mentions tool agent can't call.

**BAD**: `call action_user_consumeFood` while agent tags exclude that gate.
**GOOD**: Prompt names only tools agent actually has; cross-role requests go via delegation.

## A2: Duplicated Invariant

**Pattern**: Same rule copy-pasted across files AND injected at runtime.

**BAD**: 24-char ID rule in 3 prompts + auto-injected.
**GOOD**: Single source — global rules injected once; role-specific rules in one file only.

## A3: Passive-Voice Triggers

**Pattern**: Role-job description instead of imperative trigger.

**BAD**: "You are the Mercenary. Evaluate auctions."
**GOOD**: "When `activeAuction != null AND payout_per_damage > market_avg` → call `bid_contract`."

## A4: Copy-Pasted Cheat-Sheet

**Pattern**: Shared lookup list duplicated per file, each copy drifting.

**BAD**: Orchestrator lists 6 procedures, analyst lists 1 — same access, different coverage.
**GOOD**: One canonical `procedures.md`, linked/injected by both.

## A5: Prose Bloat in Trigger Prompts

**Pattern**: Injecting prose-style rules into a tool-gate trigger prompt.

**BAD**: 21-rule style pack pasted into role file (role emits no human prose).
**GOOD**: Style pack injected only for prose-emitting roles.

## A6: Mismatched Delegation in Prompt

**Pattern**: Prompt asserts delegation path runtime forbids.

**BAD**: "assigned by Orchestrator OR Economist" when only orchestrator delegates.
**GOOD**: "I receive tasks from the Orchestrator"; runtime enforces constraints.

## A7: Stale-Data Trade

**Pattern**: Agent acts on memory past its `stale_after` without refetching.

**BAD**: Trades on a market note fetched 3h ago.
**GOOD**: Stale flag → refetch upstream before directive.

## A8: Trust-Without-Freshness

**Pattern**: Verified fact trusted regardless of age.

**BAD**: "It's verified, so trust the 6h-old price."
**GOOD**: Stale overrides verified; un-staled-but-unverified still needs confirmation.

## A9: Naive Context Truncation

**Pattern**: `slice(last N)` discards oldest messages, including relevant tool results.

**BAD**: 50-msg context → last 10.
**GOOD**: Summarize-older + preserve recents; or move settled facts to bundles.

## A10: Silent Upstream Failure

**Pattern**: Upstream errors extract `data ?? body` blindly; agent acts on `null`.

**BAD**: Gateway returns `{}` on 500 → bot reports success.
**GOOD**: Schema validate; circuit breaker; skip + log + escalate.

## A11: Hardcoded Fallback Credential

**Pattern**: When live auth fails, code substitutes leaked session id.

**BAD**: `vid` falls back to captured session token in source.
**GOOD**: Surface auth failure; never silently substitute; never commit credentials.

## A12: Infinite Delegation

**Pattern**: Two agents ping-pong without depth cap.

**BAD**: No recursion bound → tokens → runaway.
**GOOD**: Depth cap on handoff (e.g., ≤3); force back to hub.

## A13: One-Size-Fits-All Fragility

**Pattern**: Same gating strictness for creative writer and money transfer.

**BAD**: Article publisher gated like market sale.
**GOOD**: Tier guardrails by fragility class.

## A14: Single File Omnibus

**Pattern**: 4000-line system prompt mixing everything.

**BAD**: One omnibus per agent, copy-paste everywhere.
**GOOD**: Persona / instructions / templates / data as separate files, loaded on demand.

## A15: Vague "Professional" Success Bar

**Pattern**: Quality judged by adjectives, not scores.

**BAD**: Ship when prompts "look right."
**GOOD**: Trigger pass-rate + near-miss rate + output-lint violations.

## A16: Promises vs Runtime Lint Missing

**Pattern**: No build-time check that prompt-named tools exist.

**BAD**: Phantom tool ships to production.
**GOOD**: Lint: every tool name in prompt ∈ runtime toolset for that agent.

## Self-Audit Protocol

Before declaring skill complete:
1. Read every file
2. For each antipattern, confirm no file exhibits it
3. Confirm: single-source invariants, no vendor installs, no phantom tools
4. If any violation found, fix before shipping
