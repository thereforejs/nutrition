# nutrition

The nutrition declaration of a food, calculated from its recipe under EU Regulation 1169/2011 (LMIV):
energy, nutrients, salt, rounding, per 100 g and per piece, diagnostics. Pure TypeScript library, open
source, no I/O.

**`SPEC.md` is the source of truth.** Read the relevant section before touching a rule. Where the
spec is unsure it says so (section 11, open questions): never guess an answer, raise it with Flo.
Decisions in section 10 are not reopened without him.

## Non-negotiables (from the spec)

- **Exact decimals only**, via `@thereforejs/decy`. No JavaScript `number` arithmetic for amounts or
  nutrients. Round only at the output, with the rounding of SPEC 4.4.
- **It calculates, it never interprets.** A missing value is an error with a stable code and the path
  to the cause. Before proposing a feature, ask: is this calculating or interpreting?
- **Rules are data with a citation** (regulation, article or annex, number). A rule without a source
  does not exist. Where a rule is enforced, its citation is the comment.
- **Pure and deterministic:** same input, same output, in Node and every browser. No network, no fs.
- **Tree-shakable:** no module holds a collection of all locales or all data groups (SPEC 7).
- **Errors refuse the whole result**, warnings travel with it. One diagnostics channel:
  `{ code, level, path, params, source }`, every throw through one `fail(code, path, params)`.

## Language

- Code, identifiers, comments, docs, commits, GitHub: English.
- Locale texts in their language (German, English).
- Chat with Flo: German.

## Code rules

- Layout: `src/core/` holds the calculation, everything around it stays plain and easy to read.
- Comments: few and short, senior style. The why (a legal reason, a trap), never the what or how.
- No em dashes or en dashes anywhere. Use a plain hyphen.
- Small focused files, flat structure, every rule in exactly one place. Abstraction grows with use.
- No `any`, no `as never`, no dead guards.
- Imports from `vite-plus` / `vite-plus/test`, never from `vite` or `vitest`.

## Working with Flo

- Small slices. Name the slice in one line, show the shape before a change across several files,
  build it, report, wait.
- One question at a time, with a recommendation.
- If something blocks you (a download, a missing file), say so instead of working around it.

## Verification (library tier)

- **Oracle first:** a red test before each rule, from the spec's cases (SPEC 9), then the code.
- **Sabotage probe** after each rule: break it on a copy, confirm a test fails, restore the copy.
  Check that the sabotage actually applied. Never undo work with `git checkout`, `git stash` or
  `git reset`.
- **Property tests** with `fast-check`; a seed that once failed stays in the suite.
- Before reporting: `vp check` and `vp test` green. Report failures with their output.

## Git

- Collaboration mode by default: never commit, push, open or merge PRs, or release. Flo owns git.
  Leave changes in the working tree and suggest a one-line commit message.
- Goal run only when a `/goal` is active or Flo says so: commit locally, small and meaningful; never
  push, never release.
- Commit messages: one line, Conventional Commits, Nuxt style, e.g. `feat(rounding): add salt steps`.
  No body, no Co-Authored-By, no trailers.
- Check the branch before the first change; on `main`, branch first.
- Releases run through uppt from conventional commits (`.github/workflows/release.yml`). Under 1.0
  `feat` bumps the patch and a breaking change the minor.

## Toolchain: Vite+

Vite+ (`vp`) wraps the package manager (pnpm), Vitest, Oxlint, Oxfmt and tsdown. `vp help` and
`vp <command> --help` list everything.

- `vp install` after pulling, `vp add` / `vp remove` for dependencies. Never call pnpm or npm directly.
- `vp check` (format, lint, type check), `vp test`, `vp pack` (build the library).
- Build with the local binary (`./node_modules/.bin/vp pack`): the global `vp` does not find the
  project's TypeScript 7 for the declaration files. CI uses the local one.
- `vp dlx` for one-off binaries, `vp run <script>` for package scripts that share a built-in's name.
- Never install Vitest, Oxlint, Oxfmt or tsdown directly; type-aware linting is built in.
- The pre-commit hook runs `vp staged` (`vp check --fix` on staged files).
