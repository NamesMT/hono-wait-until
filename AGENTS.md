# AGENTS.md

`hono-wait-until` is a small ESM-only Hono helper: `waitUntil()` and `waitUntilMiddleware()`
keep background async work alive after the response returns. With a native execution-context
`waitUntil` (Cloudflare Workers, Deno, Bun, ...) `waitUntil()` calls `c.executionCtx.waitUntil`
and the middleware is a no-op; without one (Node, AWS Lambda, ...) the middleware collects the
wrapped promises and blocks until they settle. `hono` is a required peer dependency; Node >= 22.

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
- `waitUntil()` throws when there is no native execution context and the middleware was not applied.
