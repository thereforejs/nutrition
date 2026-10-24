# Handoff: nutrition

Written 2026-10-24 by the Claude session that built `@thereforejs/foodlabel` with Flo. Read it once,
then turn the parts that stay true into `CLAUDE.md` and `SPEC.md`, and delete this file.

## What this library is

The nutrition declaration per 100 g (and per piece) of a finished food, computed from its recipe, under
Regulation (EU) No 1169/2011 (Art. 30 to 35, Annex XIV, Annex XV) and the Commission guidance on
tolerances (December 2012). Pure TypeScript, no I/O, MIT, part of ThereforeJS
(github.com/thereforejs). It started as section 6 of the foodlabel spec and was split off on purpose:

- **Data**: nutrition needs a nutrient database (BLS 4.0, 14 MB). Bundling it would multiply the size
  of foodlabel for users who only need the ingredient list.
- **Rules**: energy factors, salt from sodium, rounding and tolerances have nothing in common with
  allergens, brackets or QUID.
- **Use**: a nutrition calculator is useful without a label (diet apps, recipe sites), and the BLS
  updates on its own schedule.

## Decisions already made with Flo

1. **No dependency between foodlabel and nutrition**, in either direction. The app connects them.
2. **Input is a flat list**: per ingredient its amount and its values per 100 g, plus the weight of the
   finished product. The library calculates and rounds, nothing else. It does not resolve nested
   recipes (that is foodlabel's `createIngredientsList`).
3. **The BLS data is a separate, optional package** (e.g. `@thereforejs/bls`). The calculator works
   with values from a supplier's specification just as well.
4. **The library is the lowest layer**: deterministic, it calculates, it never estimates or guesses.
   A missing value is an error with a stable code and a path, never a default. Anything that needs
   interpretation is explicit input. Flo's words: if a "smart" library errs, every user breaks at once.
5. Name: Flo's call; `@thereforejs/nutrition` was suggested, not confirmed.

## Open before the first line of code

- **Which weights come in.** foodlabel takes amounts as they end up in the product (baking loss already
  removed by the caller, sum = product weight). For nutrition that is wrong: only water evaporates, so
  the nutrients of every ingredient stay while the weight shrinks (dough 100 kJ per 100 g, 20 % water
  lost: bread 125 kJ per 100 g). A shortcrust loses water from butter and eggs, not from added water.
  So nutrition most likely needs **amounts at the time of use plus the real weight after baking**,
  which means the flat list cannot simply be foodlabel's output. Discuss with Flo first.
- Spec open questions carried over (numbers from the foodlabel SPEC section 12):
  1. BLS 4.0 licence: the old imprint on blsdb.de says "private use only", the download page says
     CC BY 4.0. Written confirmation from the MRI (bls.karlsruhe@mri.bund.de) before the data ships.
  2. Must organic acids (sourdough) and fibre enter the energy when they are not declared?
  3. Rounding at the boundary: 9.96 g fat shows "10 g" or "10,0 g"? Meaning of the footnote "not
     applicable to sub-categories" in Table 4.
  4. Nutrition exemption for small craft businesses (Annex V No 19): current interpretation.

## The rules (from the foodlabel spec, section 6)

**Calculation (Art. 31(4)(b), (c))**: every ingredient's amount in kg times its values per 100 g; water
has 0 of everything. Sum, then divide by the weight after baking. EuroFIR check: the ingredient amounts
of 100 g of product, water included, add up to 97 to 103 g, otherwise warning `nutrition.massBalance`.
Mandatory nutrients are kept fully when baking (retention 1.0); vitamins are out of scope.

**Energy (Annex XIV)**: kJ and kcal each with their own factors, never converted into each other: fat
37 kJ / 9 kcal, carbohydrate (except polyols) 17 / 4, polyols 10 / 2.4, protein 17 / 4, fibre 8 / 2,
salatrims 25 / 6, alcohol 29 / 7, organic acid 13 / 3, erythritol 0 / 0.

**Salt**: sodium × 2.5 (Annex I No 11).

**Rounding (guidance 2012, Table 4)**: compute unrounded, round only for display, half up; energy from
the unrounded nutrients.

| Nutrient                                                   | per 100 g            | Rounding             |
| ---------------------------------------------------------- | -------------------- | -------------------- |
| Energy                                                     |                      | whole kJ and kcal    |
| Fat, carbohydrate, sugars, protein, fibre, polyols, starch | ≥ 10 g               | 1 g                  |
|                                                            | < 10 g and > 0.5 g   | 0.1 g                |
|                                                            | ≤ 0.5 g              | "0 g" or "< 0,5 g"   |
| Saturates, mono-, polyunsaturates                          | ≥ 10 g               | 1 g                  |
|                                                            | < 10 g and > 0.1 g   | 0.1 g                |
|                                                            | ≤ 0.1 g              | "0 g" or "< 0,1 g"   |
| Sodium                                                     | ≥ 1 g                | 0.1 g                |
|                                                            | < 1 g and > 0.005 g  | 0.01 g               |
|                                                            | ≤ 0.005 g            | "0 g" or "< 0,005 g" |
| Salt                                                       | ≥ 1 g                | 0.1 g                |
|                                                            | < 1 g and > 0.0125 g | 0.01 g               |
|                                                            | ≤ 0.0125 g           | "0 g" or "< 0,01 g"  |

Boundary cases are tests: exactly 10.0 g, 0.5 g, 9.96 g, 0.0125 g salt.

**Output**: per nutrient the exact value, the rounded value and the display text; per 100 g, and per
piece when the app passes the piece weight.

## Sources

- Flo's research: `~/projects/bfb/documents/deklaration/` (`recherche-daten.md` for BLS 4.0, Frida,
  Ciqual, licences and download URLs; `recherche-recht.md` for the law). Do not redo it, read it.
- EUR-Lex blocks scripts. The EU publications server serves texts with
  `curl -H "Accept: application/xhtml+xml" -H "Accept-Language: deu" http://publications.europa.eu/resource/celex/<CELEX>`
  (works for original acts, not for consolidated versions). For a consolidated version ask Flo to
  download the PDF in the browser into `docs/` (gitignored) and use `pdftotext -layout`.
- foodlabel (`~/projects/lmiv`, github.com/thereforejs/foodlabel) shows every convention below in
  practice: `src/diagnostics/` for errors, `scripts/additives-de.ts` for building data from a legal text.

## Conventions of ThereforeJS

- **Vite+** (`vp check`, `vp test`, `vp pack`; `vp add` for dependencies, never pnpm or npm directly).
  The starter left `bumpp` in `package.json`; uppt replaces it, remove it.
- **Exact decimals only** via `@thereforejs/decy` (github.com/thereforejs/decy, written by Flo): no
  JavaScript `number` arithmetic for amounts or nutrients. `fromNumber` at the input boundary,
  `round(value, { scale, mode })`, `format(value, "de-DE")` never rounds, `compare`/`equals` by value.
  Compare without dividing where you can (a × 1000 > limit × b).
- **Diagnostics**: one module, one catalogue of stable codes (`code`, `level`, `path` into the input,
  `params`, `source` when a regulation is the reason). Errors refuse the whole result; warnings travel
  with it. Every throw goes through one `fail(code, path, params)`.
- **Rules are data with a citation**: every rule names its regulation, article or annex; the citation is
  the comment where the rule is enforced.
- **Releases with uppt** (danielroe/uppt): conventional commits open a release PR; under 1.0 `feat`
  bumps the patch and breaking bumps the minor (edit `version` on the release branch to choose).
  npm trusted publishing with `npm stage publish`: publish a stub first
  (`vp dlx setup-trusted-publishing`), then
  `npm trust github <pkg> --file release.yml --repo thereforejs/<repo> --env npm --allow-stage-publish`,
  then approve each staged version on npmjs.com with 2FA. Pitfall seen: a typo in the workflow file name
  (`releasee.yml`) gives a bare `E401` on publish; check with `npm trust list <pkg>`.
- **Branches only**: never commit to `main`; every change on its own branch, Flo pushes and merges.
- Logo family: background #111, white, gold #C9A227, round line caps, "JS" in the corner
  (`~/projects/lmiv/docs/therefore/` holds the ThereforeJS and foodlabel logos and the build scripts'
  output; gitignored).

## How Flo works (this matters more than the rest)

Flo's global rules in `~/.claude/CLAUDE.md` and the skill `code-like-flo` apply. What this session
learned the hard way:

- **Small slices, and stop after each.** Name the slice in one line, show the shape before a change that
  touches several files, build it, report, wait. Even when he says "go for it". The diagnostics module
  went in as one big batch and he said: "the code is good, but this is slowly becoming your library".
- **Red test first, then code, then a sabotage probe on a copy** (break the rule, see a test fail,
  restore from the copy; never `git checkout`/`stash`/`reset` to undo). Check that a sabotage replacement
  actually applied; a "no match" means the run proves nothing.
- **Never guess the law.** Look it up in his research or the legal text; if it stays unclear, say so and
  let him decide. When real data exists (he has supplier sheets and a backup of 1,530 real ingredient
  texts from a retailer, local only, never in a repo), check how practice does it before proposing.
- **Do not over-build.** He pushed back on features the library should not have (detecting QUID from the
  product name, catching every badly written name): that belongs in the app. Ask "is this calculating or
  interpreting?" before proposing anything.
- **Do not stack questions.** One real decision at a time, with a recommendation. Self-made preconditions
  are not blockers.
- **If something blocks you, tell him** (a blocked download, a missing file); he would rather click once
  than have you work around it in silence.
- Chat in German; code, comments, docs and commits in English; no em or en dashes anywhere.
- Never commit, push, open PRs or release unless he runs a goal; suggest a one-line commit message.
