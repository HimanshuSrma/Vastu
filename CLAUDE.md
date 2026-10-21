# CLAUDE.md

Universal operating rules. Stack conventions, commands, and project specifics live in `@AGENTS.md`, which wins on conflict. Hard limits are enforced in `.claude/settings.json`, not here.

**Prime directive:** optimize for the next engineer reading this code at 2 a.m. during an incident. Boring, obvious, reversible beats clever.

**When rules collide, this is the order:** safety > correctness > scope discipline > speed.

**Skip the ceremony** for trivial work — typo, rename, one-line fix. Just do it well.

---

## 1. Before Writing Code

- Read the code you're about to change, and its tests, before changing it. Don't pattern-match from the file name.
- State load-bearing assumptions out loud. If one is wrong, the work is wasted.
- If the request has multiple valid readings, name them and recommend one. Don't pick silently.
- If a simpler approach exists, or the request solves the wrong problem, say so **before** writing code.
- Distinguish **reversible** decisions (decide fast, move on) from **one-way doors** — schema changes, public API shape, data deletion, auth, billing, anything already in production. Slow down for one-way doors.

For multi-step work, state the plan first, with a real check per step:

```
1. [step] -> verify: [command or assertion]
2. [step] -> verify: [command or assertion]
```

**Default to asking when unclear.** Assume a human is available and will answer. Only treat a run as autonomous if the prompt or CI context says so; then: write down the assumption, take the reversible option, flag it loudly in the summary — and still stop dead at §4.

## 2. Scope Discipline

**Minimum code that solves the stated problem. Touch only what you must.**

- No features, options, config, plugin points, or generics beyond what was asked.
- Prefer duplication over a speculative abstraction. Extract only when the repeated shape is already stable and identical.
- Match existing style, naming, and patterns even where you'd choose differently.
- Don't reformat, reorder imports, or "improve" adjacent code. Diff noise hides real bugs.
- Don't refactor working code as a side effect of a fix. Propose it separately.
- Remove imports, variables, and functions that **your** change orphaned. Leave pre-existing dead code alone, but mention it.
- If the diff passes ~300 lines or spans unrelated concerns, stop and propose a split.

Test: *every changed line traces directly to the request*, and *a reviewer wouldn't ask "why is this here?"*

## 3. Verification

**Never say "done" without running the check. If you couldn't run it, say exactly that.**

Pick a goal that can fail before it passes: a test that reproduces the bug, a measured baseline for a perf claim, a green suite before and after a refactor. Then run the project's test, lint, and typecheck commands from `AGENTS.md` and name which ones you ran.

- Test behavior, not implementation. Tests should survive a refactor.
- Cover failure paths and edges — empty, null, boundary, duplicate, malformed, unauthorized — not just the happy path.
- Never weaken, skip, or delete a failing test to get green. Fix the code, or explain why the test is wrong.
- No sleeps, real clocks, real network, or cross-test shared state. If you find a flaky test, report it instead of rerunning until green.

## 4. Stop and Confirm

Get explicit human confirmation before:

- Deleting or overwriting data, files, branches, or migrations
- Force-pushing, rewriting history, or touching protected branches
- Running anything against production or a shared environment
- Changing auth, permissions, payments, or security-sensitive logic
- Adding or upgrading a dependency
- Working outside the stated scope of the task
- Installing global tools or changing system/env config

These are hard stops in every mode. Several are also blocked in `.claude/settings.json`; the absence of a block is not permission.

## 5. Correctness and Safety

- **Never** hardcode, log, or commit secrets, tokens, or PII. Use the project's config/secrets mechanism.
- Treat all external input as hostile: validate at the boundary, parameterize queries, encode output, never build shell commands or SQL from raw strings.
- Fail loudly and early. No swallowed exceptions, no silent default returns, no catch-and-ignore.
- Handle the errors that can actually happen — network, I/O, parsing, concurrency, untrusted input. Consider idempotency and retries for anything touching I/O, queues, or shared state.
- Preserve backward compatibility for public APIs, event schemas, and persisted data unless told otherwise. Breaking changes need a migration path.
- Migrations must be reversible or explicitly flagged as not. Never ship a destructive migration in the same deploy as the code that depends on it.
- New failure modes get a useful log line: what failed, with what context, at the right level. No log spam, no secrets, no PII.

## 6. Communication

- Lead with the outcome, then details. No preamble, no filler.
- Every summary answers: what changed, why, how it was verified, what is **not** done or risky.
- Be honest about uncertainty. "I believe X but haven't verified Y" is useful; false confidence is expensive.
- List adjacent problems you noticed — bugs, dead code, debt — at the end. Don't silently fix them.
- Commits: imperative mood, explain *why*, reference the ticket, one logical change each.

---

**Working as intended when:** diffs are small and focused, overengineering rewrites are rare, regressions are caught by tests before review, and questions arrive before implementation rather than after mistakes.

@AGENTS.md