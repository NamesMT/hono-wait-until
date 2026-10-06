# AGENTS.md

`hono-wait-until` is a small ESM-only Hono helper: `waitUntil()` and `waitUntilMiddleware()`
keep background async work alive after the response returns. With a native execution-context
`waitUntil` (Cloudflare Workers, Deno, Bun, ...) `waitUntil()` calls `c.executionCtx.waitUntil`
and the middleware is a no-op; without one (Node, AWS Lambda, ...) the middleware collects the
wrapped promises and blocks until they settle. `hono` is a required peer dependency; Node >= 22.

## Docs

Three tiers, so a reader loads only what the task needs:

1. **`AGENTS.md`** (this file) — orientation and the rules that prevent defects. Read every session.
2. **`.agentDocs/`** — depth that would bloat this file: module rationale, traps with their causes,
   compatibility rules. Read on demand.
3. **`README.md` / `docs/`** — for a person using the package, not for an agent.

**There is no `.agentDocs/` here yet and none is needed at this size.** Create one when a section
above outgrows a screen or two: move the *reasoning* out and keep the *rule* here with a pointer to
it — nobody reads a file they do not open. Each document opens with a one-line scope, and this file
links it.

## Commands

```sh
pnpm run lint             # eslint (@antfu/eslint-config) — it also owns formatting
pnpm run check            # lint + test:types + vitest run --coverage; the gate release.yml runs
pnpm run test             # vitest watch mode (CI=true runs it once)
pnpm run test:types       # tsc --noEmit
pnpm run build            # tsdown -> dist/index.mjs + dist/index.d.mts
pnpm run dev              # alias of `watch` -> NODE_ENV=dev tsx watch src/index.ts
pnpm run release:check    # validate a version against package.json: `pnpm run release:check 2.2.0`
pnpm run release:preview  # print the changelog the next release would get
```

## Structure

- `src/index.ts` — the whole package: `WaitUntilList`, `waitUntilMiddleware`, `waitUntil`.
- `test/index.test.ts` — the suite; imports the entry as `#src/index.js` (a `.js` suffix on a `.ts` file).
- `tsdown.config.ts` — build config; emits `dist/index.mjs` and `dist/index.d.mts`.
- `vitest.config.ts` — test config; only excludes `tsdown.config.ts` from coverage.
- `eslint.config.js` — `@antfu/eslint-config` with two relaxed style rules.
- `.github/workflows/` — `ci.yml` (push/PR: lint, types, test) and `release.yml` (manual, below).

## Conventions

- Conventional commits (`feat:`, `fix:`, `docs:`, `chore:`, ...) — the changelog is derived from them.
- ESLint via `@antfu/eslint-config` owns formatting: no Prettier, single quotes, 2-space indent.
- `package.json` points `source` at `./src/index.ts` and `main`/`module`/`types` at the `dist/` build.

## How to work here

- Check who calls it before you change it; say when impact is unclear rather than guessing.
- Never overwrite or delete a large section you have not understood.
- Don't invent requirements; surface what looks needed.
- Report the risk, not only the change — correctness, security, operational, integration.
- **Fix the root cause, not the instance.** One bug under many names (a copied helper, a rule stated
  twice, a bypassed guard) is one class: one implementation, one guard.
- **Verify before claiming, and say what you checked.** A green test proves only what it asserts — **break the thing it guards and watch it fail.** If it still passes, either the test is decoration or a different guard is running; find out which. Where a stub cannot answer the question, drive the real thing. Mark anything unverified as unverified.
- Missing recall of this project? Read this file + `git log` before acting.

## Conciseness

Prune verbose, keep correctness — code, comments, docs. A comment only for non-obvious intent; one
idea per sentence; cut what wouldn't change what a reader does; delete history `git log` already
holds — keep the rule, not the story. Never drop a caveat to save a line.

## User-facing docs

`README.md` is the only user-facing doc (no `docs/`, no media). Keep the first read short; put growing
detail behind **`<details>` spoilers**. Docs ship in the same commit as the change.

## Releasing

Version-first and manual: dispatch **Actions → Release → Run workflow** with the version; that
workflow is the only publish path, so a pushed tag publishes nothing. `dry-run` still writes
`CHANGELOG.md`, bumps `package.json` and creates the commit + tag on the runner — it only skips
push, GitHub release and npm publish. One-time trusted-publisher setup is in the README.

## Gotchas

- `ci.yml` (Node 22) runs `pnpm lint && pnpm test:types && pnpm test`, relying on `CI=true` to
  make vitest run once; `release.yml` uses Node 24 and the `pnpm run check` gate.
- `dist/` and `coverage/` are gitignored; a stale local `dist/` may exist.
- `prepublishOnly` runs the build, so `npm publish` rebuilds `dist/` itself.
- `waitUntilMiddleware({ continueWithoutSettled: true })` calls `next()` without creating the list, so on a runtime without native `waitUntil` a later `waitUntil()` throws — it is a migration aid for edge platforms, not a portable option.
- `waitUntil()` re-resolves the native execution context on every call, so it is safe without the middleware on edge runtimes.
- `waitUntil()` throws when there is no native execution context and the middleware was not applied.
- A rejected wrapped promise makes the middleware log the reasons and throw `HTTPException(500, 'Some async tasks were rejected')`, so the request fails after the response was produced.
- `WaitUntilList.waitUntilSettled()` marks the list settled and `waitUntil()` on a settled list throws `WaitUntilList is already settled`.
- `repository.url` must keep the canonical `NamesMT` casing — with `--provenance`, npm fails the publish when the URL owner does not match the GitHub owner.
