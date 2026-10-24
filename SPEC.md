# nutrition: specification

The nutrition declaration of a food, calculated from its recipe under the EU food information
regulation (Regulation (EU) No 1169/2011, Art. 30 to 35, Annex XIV, Annex XV) and the Commission
guidance on tolerances (December 2012). Pure TypeScript, open source, MIT.

**Where this document and a secondary source disagree, this document wins; where it is unsure, it says
so.** Open points are listed in section 11, never guessed.

---

## 1. What it is, and what it is not

**It is** a library that takes the ingredients of a finished food with their amounts and their values
per 100 g, and returns:

1. the **nutrition declaration** per 100 g, and per piece when a piece weight is given;
2. per nutrient the **exact value**, the **rounded value** and the **display text**;
3. **diagnostics**: every refusal and every warning with a stable code and the path to the cause.

It works with values from any source: a supplier's specification, a lab report, or a food composition
database such as the optional data package (section 8).

**It is not:**

- a recipe resolver. Nested recipes, baking loss, water loss and dough leftovers are resolved before
  the library is called. Its input is a flat list in final grams (section 3.1);
- an estimator. A missing value is an error, never a default and never a guess;
- a label layout, a printer or a network client;
- a part of [foodlabel](https://github.com/thereforejs/foodlabel). Neither library depends on the other;
  an application connects them.

---

## 2. Principles

- **Exact decimals everywhere** with [`@thereforejs/decy`](https://github.com/thereforejs/decy). Never
  JavaScript `number` arithmetic for amounts or nutrients. Round only for the output, with the named
  rounding of section 4.4.
- **It calculates, it never interprets.** Anything that needs judgement is explicit input. If a library
  that guesses is wrong, every user is wrong at once.
- **Rules are data with their source.** Every energy factor, conversion and rounding step names its
  regulation, article or annex. A rule without a source does not exist.
- **Errors refuse the whole result**, warnings travel with it. No half output.
- **Pure and deterministic.** Same input, same output, in Node and in every browser. No I/O.
- **Tree-shakable** (section 7). An application pays only for the languages and data it imports.

---

## 3. Input

### 3.1 Ingredients

A flat list. Per ingredient:

- `amount`: grams as they end up in the finished product. The caller has already applied baking loss
  or any other change of weight.
- `per100g`: its nutrient values per 100 g (section 3.2).

**The sum of all amounts is the weight of the finished product.** There is no second weight input that
could disagree with it.

Numbers come in as decimal strings and are parsed exactly at the boundary.

### 3.2 Nutrients

Mandatory in the declaration (Art. 30(1)): energy, fat, saturates, carbohydrate, sugars, protein, salt.
Voluntary (Art. 30(2)): mono-unsaturates, polyunsaturates, polyols, starch, fibre.

- **Energy is never input.** It is calculated from the nutrients (section 4.2), so there is only one
  truth.
- A nutrient that the declaration needs must be present in every ingredient. A missing value is an
  error with the path to the ingredient. Water is passed with explicit zeros.
- **Sodium or salt**, per ingredient, whichever the source provides. Both are allowed only when they
  agree exactly (salt = sodium × 2.5); otherwise it is an error.
- Which voluntary nutrients appear in the output is an explicit choice of the caller, never derived
  from which values happen to be present.

### 3.3 Piece weight

Optional, in grams. When given, the output also contains the values per piece. One input form only; an
application that counts pieces divides the product weight itself.

### 3.4 Options and locales

Options follow the pattern of foodlabel: a flat options object with defaults, merged and validated in
one place. A matter of taste goes through an option (e.g. "0 g" or "< 0,5 g" below the threshold of
Table 4); a behaviour everybody wants is the default.

Locales (the display texts such as "Fett", "davon gesättigte Fettsäuren") are imported, not named:

```ts
import { de } from "@thereforejs/nutrition/locales";
calculateNutrition(input, { locales: [de] });
```

Only imported locales reach a bundle (section 7). German and English ship from the start.

---

## 4. Calculation

### 4.1 Sum (Art. 31(4)(b))

For every nutrient: the sum of `amount × value / 100` over all ingredients. This sum is exact; it
needs no division by anything but 100.

Per 100 g = sum × 100 / product weight. Per piece = sum × piece weight / product weight. These are the
only divisions, and they live in one place.

### 4.2 Energy (Annex XIV)

kJ and kcal each with their own factors, never converted into each other:

| Component                     | kJ/g | kcal/g |
| ----------------------------- | ---: | -----: |
| Carbohydrate (except polyols) |   17 |      4 |
| Polyols                       |   10 |    2.4 |
| Protein                       |   17 |      4 |
| Fat                           |   37 |      9 |
| Salatrims                     |   25 |      6 |
| Alcohol (ethanol)             |   29 |      7 |
| Organic acid                  |   13 |      3 |
| Fibre                         |    8 |      2 |
| Erythritol                    |    0 |      0 |

Energy is calculated from the unrounded nutrients.

### 4.3 Salt (Annex I No 11)

Salt = sodium × 2.5. Internally every ingredient is held as sodium (salt × 0.4, exact); salt is
derived from the total.

### 4.4 Rounding (Commission guidance on tolerances, December 2012, Table 4)

Calculated unrounded, rounded only for the output, half up.

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

**Boundaries are decided without division.** Whether a value per 100 g reaches a threshold is
`sum × 100 ≥ threshold × product weight`, compared exactly. A quotient that does not terminate (a
product weight of 300 g) can never land on the wrong side of a boundary.

**The text keeps the step's decimals**, trailing zeros included: 2.0 g fat rounded to 0.1 g reads
"2,0 g", never "2 g". Units follow Annex XV (kJ, kcal, g).

---

## 5. Output

- Per 100 g, and per piece when a piece weight is given.
- Per nutrient: `exact`, `rounded`, `text` (in every imported locale).
- Salt and sodium are both always in the result; the mandatory declaration shows salt (Art. 30(1)(b)).
  What an application displays is its choice.
- Diagnostics (section 6) alongside.

---

## 6. Diagnostics

One module, one catalogue of stable codes. Each diagnostic: `{ code, level, path, params, source }`.

- `level`: `"error"` refuses the whole result; `"warning"` travels with it.
- `path`: into the input, e.g. `ingredients[2].per100g.fat` or `options.locales`.
- `source`: the regulation, article or annex when a rule is the reason.
- Every throw goes through one `fail(code, path, params)`.

The catalogue grows with the rules; each code arrives with its test.

---

## 7. Tree-shaking

- `"sideEffects": false`, named exports only.
- **No module holds a collection of all locales or all data groups.** A map such as `{ de, en }` pulls
  every entry into every bundle. This was verified with Rolldown: importing `de` alone ships only
  German; adding the map ships both.
- The core never imports data. Data reaches it only as input.

---

## 8. Data package `@thereforejs/bls`

A separate, optional package with the Bundeslebensmittelschlüssel (BLS 4.0, Max Rubner-Institut). The
calculator does not depend on it.

**Source:** 7,140 foods, 138 nutrients, values per 100 g of the edible part, a German and an English
name per food.

**Split by main food group.** The leading letter of the BLS code names the main food group (BLS 4.0
documentation, section 2.4). Each group is its own entry point, so an application that calculates
confectionery imports only that group. With the nutrients of the declaration and both names, all groups
together are about 2.2 MB (about 390 KB gzip); a single group is 4 to 75 KB gzip.

**Preparation**, by a build script from the original file, reproducible:

- Only the nutrients the declaration and the energy need, plus water.
- Values as exact decimal strings. The spreadsheet stores binary floating point (`9.3000000000000007`,
  `1.4999999999999999E-2`); the script writes the shortest decimal that reads back to the same number
  (`9.3`, `0.015`).
- Sodium is converted from mg to g.
- A missing value (`-`) becomes `null`, never 0 (BLS 4.0 documentation, section 4.3).
- Values below the limit of detection or quantification and traces (`<LOD`, `<LOQ`, `TR`) are kept as
  what they are; how the calculation treats them is open question 6.

**License:** CC BY 4.0, the Max Rubner-Institut named as publisher, changes marked. Citation:
Max Rubner-Institut (2025): Bundeslebensmittelschlüssel (BLS), Version 4.0, Karlsruhe.
DOI: 10.25826/Data20251217-134202-0. The PDF documentation is not redistributed, only linked.

---

## 9. Tests (the oracle)

Every rule gets a red test before the code and a sabotage probe after.

1. **Rounding boundaries** of Table 4: exactly 10.0 g, 0.5 g, 0.1 g, 9.96 g, 1 g sodium, 0.005 g sodium,
   0.0125 g salt.
2. **Boundaries under division:** product weights that give non-terminating quotients (300 g, 700 g)
   with sums placed exactly on a threshold.
3. **Energy** per factor of Annex XIV, kJ and kcal independently.
4. **Salt and sodium**: either input, both agreeing, both disagreeing (error).
5. **Missing values**: every required nutrient missing in one ingredient gives its error and path.
6. **Properties** (fast-check, seeds kept once they failed):
   - scaling every amount by the same factor does not change the values per 100 g;
   - the order of the ingredients does not change the result;
   - splitting an ingredient into two with the same values does not change the result;
   - an ingredient of pure water lowers every value per 100 g and never raises one.

---

## 10. Decisions

- No dependency between foodlabel and nutrition, in either direction (2026-10-24).
- Input is a flat list in final grams; their sum is the product weight. No baking loss, no water model
  (2026-10-24).
- Energy is calculated, never input (2026-10-24).
- Sodium or salt per ingredient; both only when they agree exactly (2026-10-24).
- Optional piece weight in grams (2026-10-24).
- Locales are imported, not named in an option (2026-10-24).
- Data in a separate package, split by BLS main food group; German and English names (2026-10-24).
- Rounding half up, calculated unrounded, energy from unrounded nutrients.
- The text keeps trailing zeros of its rounding step: "2,0 g", not "2 g" (2026-10-24).
- License MIT.

---

## 11. Open questions

1. **BLS 4.0 license:** the imprint of blsdb.de still carries an old "private use only" notice for web
   documents; the download page puts the data under CC BY 4.0. A written confirmation from the Max
   Rubner-Institut settles it before the data package is published.
2. **Energy:** must organic acids (e.g. from sourdough) and fibre enter the energy when they are not
   declared?
3. **Rounding at the boundary:** does 9.96 g fat read "10 g" or "10,0 g"? And the meaning of the footnote
   "not applicable to sub-categories" in Table 4.
4. **Rounding per piece:** does Table 4 apply to values per piece as it does per 100 g?
5. **Exact value of a non-terminating quotient:** `exact` per 100 g of 1 g in 300 g is 0.333...; which
   representation the output carries (a fixed scale, or a fraction).
6. **`<LOD`, `<LOQ`, `TR` in the data:** neither zero nor missing. The library does not pick a reading;
   the question is what the caller must state.
7. **Polyols, erythritol and salatrims as input fields:** whether "polyols" includes erythritol and
   "fat" includes salatrims, so that each gram meets exactly one factor of Annex XIV. The BLS sums
   polyols as mannitol, sorbitol and xylitol.
8. **Exemption for small businesses (Annex V No 19):** the current interpretation. It decides whether a
   declaration is needed at all, which is the application's question, but the documentation should
   name it.

---

## 12. Sources

- Regulation (EU) No 1169/2011, consolidated text:
  [EUR-Lex 02011R1169](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:02011R1169)
- European Commission, Guidance document for competent authorities for the control of compliance with
  EU legislation with regard to the setting of tolerances for nutrient values declared on a label,
  December 2012:
  [PDF](https://food.ec.europa.eu/system/files/2016-10/labelling_nutrition-vitamins_minerals-guidance_tolerances_1212_en.pdf)
- EuroFIR, How to calculate nutrient content of foods (recipe calculation guideline):
  [PDF](https://www.eurofir.org/wp-admin/wp-content/uploads/2015/12/EUROFIR-RECIPE-GUIDELINE_FINAL.pdf)
- Max Rubner-Institut, Bundeslebensmittelschlüssel 4.0: [blsdb.de](https://www.blsdb.de),
  DOI 10.25826/Data20251217-134202-0
