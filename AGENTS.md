# AGENTS.md

Project and stack conventions. Read together with `CLAUDE.md` (universal rules). This file wins on conflict.

> **Fill in §1 per repo.** Everything below it is stack guidance that holds across projects. Delete the framework sections you don't use — an agent reading rules for a framework you don't have is wasted context.

---

## 1. This Project — FILL IN

**Stack:** <!-- e.g. Next.js 15 (App Router) + NestJS 11 + PostgreSQL 16 + Prisma + pnpm workspaces -->
**Node:** <!-- e.g. 22.x, see .nvmrc --> · **Package manager:** <!-- pnpm@9 — never mix with npm/yarn -->

### Commands

| Purpose | Command |
|---|---|
| Install | `<!-- pnpm install --frozen-lockfile -->` |
| Dev (all) | `<!-- pnpm dev -->` |
| Build | `<!-- pnpm build -->` |
| Test (all) | `<!-- pnpm test -->` |
| **Test (single file)** | `<!-- pnpm test -- path/to/file.spec.ts -->` |
| Test (watch) | `<!-- pnpm test:watch -->` |
| E2E | `<!-- pnpm e2e -->` |
| Lint | `<!-- pnpm lint -->` |
| Typecheck | `<!-- pnpm typecheck -->` |
| Format | `<!-- pnpm format -->` |
| DB migrate (dev) | `<!-- pnpm db:migrate -->` |
| DB generate client | `<!-- pnpm db:generate -->` |

**Prefer the single-test command while iterating.** Run the full suite once at the end.

### Layout

```
<!--
apps/web        Next.js app         apps/admin   Angular app
apps/api        NestJS service      packages/ui  shared components
packages/types  shared contracts    packages/config  eslint/ts/tailwind presets
-->
```

### Environment

- Copy `.env.example` → `.env.local`. Never commit `.env*`.
- Required services to run locally: <!-- Postgres + Redis via `docker compose up -d` -->
- <!-- Integration tests need Docker running. -->

### Landmines — do not touch without asking

- <!-- `packages/types/src/generated/**` is codegen output. Change the source schema, re-run `pnpm db:generate`. -->
- <!-- `apps/api/src/billing/**` is money-handling. Guardrail: ask first. -->
- <!-- Anything under `legacy/` is frozen pending migration. -->

---

## 2. TypeScript — All Packages

- **`strict: true`. No `any`.** If a type is genuinely unknown, use `unknown` and narrow. `as` casts need a comment explaining why the compiler can't see it.
- No `@ts-ignore`. `@ts-expect-error` only with a reason on the same line.
- Don't export types just to satisfy a test. Test through the public surface.
- Derive, don't duplicate: `z.infer<typeof schema>`, `Prisma.UserGetPayload<...>`, `ReturnType<...>`. One source of truth per shape.
- Discriminated unions over optional-field soup. Make illegal states unrepresentable.
- Shared request/response types live in `packages/types` (or the equivalent) and are imported by **both** sides. Never hand-redeclare an API shape in the frontend.

## 3. Universal Web Rules

- **Validate at the boundary** with a schema (Zod / class-validator), then trust the parsed value inward. Every HTTP handler, queue consumer, and webhook validates its input. Never trust client-sent `userId`, `role`, `price`, or `isAdmin`.
- **Never put secrets in client bundles.** Anything reachable from browser code is public: `NEXT_PUBLIC_*`, Angular `environment.ts`, any Vite/webpack define. Server-only secrets stay in server-only modules.
- **Errors:** no empty `catch`. Either handle it meaningfully, or let it propagate to the framework's error boundary/filter. Log with context (ids, operation), never with tokens, passwords, full request bodies, or PII.
- **Async:** no floating promises — `await` or explicitly `void` with a comment. Use `Promise.all` for independent work, sequential `await` only when order matters. Always set a timeout and abort signal on outbound HTTP.
- **Dates/money:** store UTC, format at the edge. Money in integer minor units, never floats.
- **Dependencies:** don't add one. If you think the task needs a new package, stop and ask, with what it replaces and why the stdlib or an existing dep won't do. Never upgrade unrelated packages; never regenerate the lockfile wholesale.

---

## 4. Frontend — Shared (React, Next, Angular)

- Server state ≠ client state. Server data goes through the data layer (TanStack Query / RTK Query / Angular resource or service), not `useState` + `useEffect` hand-rolled fetching.
- Every async view handles **four** states: loading, empty, error, success. Empty and error are not optional.
- Accessibility is not a follow-up: semantic elements, labelled inputs, keyboard reachable, visible focus, `alt` text. Don't put `onClick` on a `div`.
- Keys from stable ids, never array index for reorderable lists.
- No layout shift: reserve space for images and async content.
- Styling: follow whatever the repo already uses (Tailwind / CSS Modules / SCSS). Don't introduce a second system.

### React / Next.js

- Function components and hooks only. Rules of hooks are non-negotiable — no conditional hooks.
- **Server Components by default** in the App Router. Add `"use client"` only at the leaf that actually needs interactivity, state, or browser APIs. Never put it at the top of a page to make an import work.
- Data fetching belongs in Server Components or Route Handlers/Server Actions. Keep secrets, DB clients, and SDK keys out of anything a client component imports.
- `useEffect` is for synchronising with external systems, not for deriving state. Compute derived values during render; use the `key` prop to reset state.
- Memoize (`useMemo`/`useCallback`/`memo`) only to fix a measured problem.
- Caching is explicit in Next: be deliberate about `revalidate`, `cache`, `dynamic`, and `revalidateTag`/`revalidatePath` after a mutation. State the caching intent in the PR summary.
- Mutations go through Server Actions or Route Handlers that re-validate input server-side. Never trust the form payload.
- Prefer `next/image`, `next/link`, and `next/font` over hand-rolled equivalents.

### Angular

- **Standalone components.** No new NgModules.
- **Signals** for component state; `computed` for derived values; `effect` only for genuine side effects, never to write state another signal could compute.
- `ChangeDetectionStrategy.OnPush` on every new component.
- Use the `inject()` function over constructor parameter injection in new code.
- RxJS: `async` pipe over manual `subscribe`. If you must subscribe, use `takeUntilDestroyed()`. Every manual subscription needs a visible teardown.
- Use `switchMap` for request-replace (typeahead, route param changes) and `concatMap`/`exhaustMap` where ordering or dedupe matters. Avoid nested subscribes.
- Typed reactive forms over template-driven for anything non-trivial.
- Smart/container components fetch; presentational components take inputs and emit outputs.

---

## 5. Backend — Node, Express, NestJS

### Shared

- Layering is strict: **route/controller → service → repository**. Controllers do no business logic; repositories do no HTTP; services don't know about `req`/`res`.
- Controllers: parse + validate input, call a service, map to a response DTO. Nothing else.
- Return DTOs, never raw ORM entities. One leaked `passwordHash` is a breach.
- Status codes mean things: 400 malformed, 401 unauthenticated, 403 unauthorized, 404 missing, 409 conflict, 422 semantically invalid, 429 rate-limited, 5xx *our* fault.
- Error responses share one shape across the API: `{ error: { code, message, details? } }`. `code` is a stable machine string; `message` is safe for humans and leaks no internals or stack traces.
- Every request carries a correlation/request id into logs. Structured JSON logs (pino/winston), never `console.log` in production code paths.
- Config is read and validated **once** at startup, then injected. No `process.env` reads scattered through business logic — fail fast at boot if a required var is missing.
- Graceful shutdown: handle `SIGTERM`, stop accepting connections, drain in-flight work, close DB/queue connections.
- Health endpoints: liveness separate from readiness.
- Secure by default: `helmet`, CORS allowlist (never `*` with credentials), body size limits, rate limiting on auth and write endpoints.
- Auth: verify the token server-side on every request. Derive identity from the token, never from the body or a query param. Check *authorization* (can this user touch this resource?) in the service, not only at the route.

### Express

- Async handlers must forward errors: use a wrapper or `express-async-errors`, never an unhandled rejection.
- One central error-handling middleware `(err, req, res, next)`, registered last. It maps known error types to status codes and logs the rest as 5xx.
- Middleware order is load-bearing: security → parsers → correlation id → routes → 404 → error handler. Don't reorder casually.
- Keep `app` (wiring) separate from `server` (listen) so tests can import the app without binding a port.

### NestJS

- Use the framework rather than around it: modules, providers, DI, `ValidationPipe` with `whitelist: true` and `forbidNonWhitelisted: true`, exception filters, interceptors, guards.
- DTOs with `class-validator`/`class-transformer` (or a Zod pipe if that's the repo's choice) on every input. Separate request DTO from response DTO.
- Guards for authn/authz, interceptors for cross-cutting concerns (logging, timing, serialization). Don't hand-roll these per controller.
- Feature modules own their providers and export only what's genuinely shared. No god `SharedModule`.
- Use `ConfigModule` with a validation schema. Inject config, don't read `process.env`.
- Business logic lives in services so it can be unit-tested with no HTTP layer.

### Database

- All access through the project's ORM/query builder. Raw SQL only when needed, always parameterized.
- Migrations are the only way the schema changes. Never edit an applied migration — add a new one.
- Expand/contract for breaking changes: add nullable column → backfill → start writing → start reading → drop old, across separate deploys.
- Index what you filter, sort, and join on. Mention new indexes on large tables in the summary.
- **Watch for N+1** — eager-load or batch. Any list endpoint must have an explicit limit and pagination; no unbounded `findMany`.
- Multi-step writes that must agree go in a transaction.

---

## 6. Testing by Layer

| Layer | Tool | What to assert |
|---|---|---|
| Pure logic / services | Vitest / Jest | Behavior and edges, no mocks of your own code where real objects work |
| HTTP API | Supertest + Nest `TestingModule` | Status, body shape, authz (403 for wrong user), validation rejects |
| React components | Testing Library | What a user sees and does — roles and text, not internals |
| Angular components | TestBed + Testing Library | Same; prefer harnesses for Material |
| E2E | Playwright / Cypress | A few critical user journeys only |

- Query by role/label/text. No snapshot tests of whole components, no tests asserting on class names or internal state.
- Mock the network boundary (MSW / nock), not your own modules.
- Integration tests hit a real database (testcontainers or a dedicated test DB), not a mocked ORM.
- Fixed clock and seeded randomness. Each test creates its own data and cleans up — no cross-test order dependence.

## 7. Performance and Frontend Budget

- State complexity and expected scale for anything on a hot path or over a large dataset.
- Watch bundle size: dynamic-import heavy, rarely-used client components (charts, editors, maps). Don't import an entire library for one function.
- Cache deliberately and say what you did: HTTP cache headers, query-client `staleTime`, Next revalidation, Redis. An unexplained cache is a future incident.
- No unbounded loops, unbounded in-memory collections, or unbounded concurrency on I/O.

## 8. Git

- Branch: `feat|fix|chore|refactor|docs/<ticket>-<short-slug>`.
- Conventional Commits: `feat(api): reject expired invite tokens`. Body explains *why*. One logical change per commit.
- Never commit: `.env*`, build output, `node_modules`, editor configs, debug logs, commented-out code.
- Don't amend or rebase commits that are already pushed to a shared branch.
- PR description: what, why, how verified, what's risky or not done.

---

## 9. Pre-Flight Checklist

Before saying "done":

- [ ] `typecheck` run and clean
- [ ] `lint` run and clean
- [ ] Relevant tests run and passing (name which command you ran)
- [ ] No `any`, `console.log`, `@ts-ignore`, `.only`, `.skip`, or TODOs left behind
- [ ] No secrets in client-reachable code; no new env var undocumented in `.env.example`
- [ ] Input validated at every new boundary; authorization checked, not just authentication
- [ ] New queries checked for N+1 and bounded by pagination
- [ ] Loading / empty / error states handled in new UI
- [ ] Migrations reversible and not deployed alongside dependent destructive code
- [ ] Summary states what changed, why, how verified, what's risky