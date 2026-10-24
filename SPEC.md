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
3. a **report** of everything the calculation went on without, and errors with a stable code and the
   path to the cause.

It works with values from any source: a supplier's specification, a lab report, or a food composition
database such as the optional data package (section 8).

**It is not:**

- a recipe resolver. Nested recipes, baking loss, water loss and dough leftovers are resolved before
  the library is called. Its input is a flat list in final grams (section 3.1);
- an estimator. It never fills a gap with a guess (section 3.2);
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
- **Errors refuse the whole result**; what the calculation went on without travels with it in the
  report. No half output.
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

Values come in as a JavaScript number or as plain decimal text (`"1.2"`); callers never need decy.
They are read exactly at the boundary: a number by its shortest decimal (`0.1` is 0.1, not the binary
0.1000000000000000055...). More than 12 decimals are rounded half up to 12, so a computed
`0.1 + 0.2` (0.30000000000000004) reads as 0.3. 12 decimals keep every intermediate product within
decy's 30, and the output rounding (at most 3 decimals) never sees what lies beyond them.

### 3.2 Nutrients

Mandatory in the declaration (Art. 30(1)): energy, fat, saturates, carbohydrate, sugars, protein, salt.
Voluntary (Art. 30(2)): mono-unsaturates, polyunsaturates, polyols, starch, fibre.

- **Energy is never input.** It is calculated from the nutrients (section 4.2), so there is only one
  truth.
- **What a value says** is decided by what the source sends, never by the library, which knows no
  foods:
  - `0`: the source says there is none. Calculated with 0.
  - `null`: the source says the value is unknown (the BLS marks such gaps, section 8). Calculated
    without it, listed in the report as `value.missing` (section 6).
  - key missing: the source says nothing. Calculated with 0. The library cannot tell "there is none"
    from "forgotten"; a forgotten value is the caller's responsibility like any wrong value.
- **The caller vouches for the values; the library only checks that they are possible.** It refuses
  only what is impossible or contradicts itself: no valid number, a negative value, salt that is not
  sodium × 2.5, a product of 0 g, a part larger than its whole, more than 100 g of a nutrient in
  100 g:
  - Parts and wholes after Annex XV ("of which"): sugars, polyols, starch in carbohydrate;
    saturates, mono-, polyunsaturates in fat. Annex I No 9: erythritol in polyols. Salatrims in fat by
    the reading of open question 7. Each part on its own: a sum of parts that
    were rounded by Table 4 may exceed its rounded whole (3.35 + 3.35 + 3.25 g of 9.95 g fat read
    3.4 + 3.4 + 3.3 of 10.0), so sums are not compared. An unknown (`null`) whole is not compared.
  - Salt may exceed 100 g: it is sodium × 2.5, an equivalent, not a mass. Solid sodium hydroxide for
    pretzels has 57.5 g sodium, 143.75 g salt per 100 g. Its limit is 250 g, which is 100 g sodium.
  - An ingredient of 0 g leaves nothing out: its unknown values are not reported.
  - A key that is not a nutrient (`fats`, `energy`, `note`) is refused with `value.unknownKey`: as
    a missing key it would count as 0, a silent wrong number.
- **Input and options that are not what the types say** (plain JavaScript, JSON) are refused with
  `input.invalid` or `options.invalid` and the path, never with a foreign error. An option given as
  `undefined` takes its default.
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

Only imported locales reach a bundle (section 7, verified on the built package). German and English
ship from the start. The labels are the words of Annex XV in each language (consolidated 1.4.2025);
sodium, not in Annex XV, is named as in Annex I No 11. German reads "Energie" as Annex XV does, though
Art. 30 to 32 say "Brennwert"; an application that wants "Brennwert" overrides that one label:
`{ ...de, labels: { ...de.labels, energy: "Brennwert" } }`.

The text keeps number and unit on one line (no-break space) and never groups thousands ("1431 kJ").

---

## 4. Calculation

### 4.1 Sum (Art. 31(4)(b))

For every nutrient: the sum of `amount × value / 100` over all ingredients, exact. Only the total is
rounded half up to 12 decimals: per piece multiplies it again by a weight of up to 12 decimals, and
decy holds 30. So splitting an ingredient in two never changes a result. For a product of less than
1 g this rounding can show in the last decimals per 100 g; nobody declares such a product.

Per 100 g = sum × 100 / product weight. Per piece = sum × piece weight / product weight. These are the
only divisions, and they live in one place. The quotient is rounded half up to 12 decimals, like the
input (3.1): 1 g of fat in 300 g is 0.333333333333 g per 100 g. Everything after it (energy, rounding,
thresholds) works with this one value, so a threshold and a displayed value can never disagree.

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

Energy is calculated per ingredient and then summed, so that a part is only ever taken out of its own
ingredient's whole: an ingredient whose carbohydrate is unknown (`null`) still counts its polyols at
10 kJ, and nothing of another ingredient is subtracted for them. It is calculated from the unrounded
nutrients, and from every component the data has, whether
the table shows it or not: the factors apply to "the energy value to be declared", not only to
declared nutrients. Fibre in a wholemeal bread counts even when the label shows only the mandatory
nutrients.

Each gram meets exactly one factor. The values are given as declared, so the parts are taken out of
their wholes (Annex I: carbohydrate "includes polyols", erythritol is a polyol by the definition of
polyols, fat means "total lipids"):

```
(carbohydrate - polyols) × 17 + (polyols - erythritol) × 10 + erythritol × 0
  + protein × 17 + (fat - salatrims) × 37 + salatrims × 25
  + alcohol × 29 + organic acids × 13 + fibre × 8          (kJ; kcal likewise)
```

Annex XIV and the definitions of Annex I are unchanged in the consolidated text of 1 April 2025.

### 4.3 Salt (Annex I No 11)

Salt = sodium × 2.5. Every ingredient is held as sodium (salt × 0.4, exact), and only sodium is
summed and divided. Salt is derived at the very end from the sodium per 100 g or per piece, so salt and
sodium always fall on the same side of every threshold of Table 4.

### 4.4 Rounding (Commission guidance on tolerances, December 2012, Table 4)

Calculated at 12 decimals (4.1), rounded only for the output, to the nearest step, half up. The
guidance shows the half up in its own example: a declared 12 g of protein "could represent a value
derived from calculation or analysis of between 12.4 g and 11.5 g" (section 6).

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

**Negligible amounts.** At or below the lowest threshold, or when no detectable amount is present, the
guidance lets the label read "0 g" or "< x g", or alternatively "contains negligible amounts of ..."
(section 6). The result marks such a value as negligible, so an application can choose any of the
three.

**The text keeps the step's decimals**, trailing zeros included: 2.0 g fat rounded to 0.1 g reads
"2,0 g", never "2 g". Units follow Annex XV (kJ, kcal, g).

---

## 5. Output

- Per 100 g, and per piece when a piece weight is given.
- Per nutrient: `exact`, `rounded`, `text` (in every imported locale).
- Salt and sodium are both always in the result; the mandatory declaration shows salt (Art. 30(1)(b)).
  What an application displays is its choice.
- The report (section 6) alongside.

---

## 6. Diagnostics

One module, one catalogue of stable codes. Each diagnostic: `{ code, level, path, params, source }`.

- `level`: `"error"` refuses the whole result.
- `path`: into the input, e.g. `ingredients[2].per100g.fat` or `options.locales`.
- `source`: the regulation, article or annex when a rule is the reason.
- Every throw goes through one `fail(code, path, params)`.

The catalogue grows with the rules; each code arrives with its test.

**The report** lists everything the calculation went on without, grouped by code and nutrient, so it
reads "2 ingredients without fibre": `{ code, nutrient, ingredients }`, `ingredients` being positions in
the input list. Every code that can appear in it is explained in the README (meaning, what to do).

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
2. **Non-terminating quotients:** product weights of 300 g and 700 g give 12 decimals, half up.
3. **Energy** per factor of Annex XIV, kJ and kcal independently.
4. **Salt and sodium**: either input, both agreeing, both disagreeing (error).
5. **Missing values**: `0`, `null` and a missing key, each with its result; `null` in the report
   and path. Every impossible input of 3.2 with its error.
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
- Rounding half up, calculated at 12 decimals, energy from the values before display rounding.
- Values per 100 g and per piece carry 12 decimals; nobody gains from the 124th (2026-10-24).
- German labels as Annex XV words them, "Energie" for energy (2026-10-24).
- Per piece: from the exact sums, rounded by the same steps of Table 4 (2026-10-24).
- Negligible amounts read "<x g" by default, "0 g" by option (2026-10-24).
- The rounding step follows the amount itself: 9.96 g fat reads "10,0 g" (Table 4, 2026-10-24).
- The text keeps trailing zeros of its rounding step: "2,0 g", not "2 g" (2026-10-24).
- Input values: number or decimal text, more than 12 decimals rounded half up to 12 (2026-10-24).
- `0` is none, `null` is unknown (calculated without, reported), a missing key is 0. Errors only for
  impossible or contradicting input; the caller vouches for the values (2026-10-24).
- Energy counts every component in the data, declared or not (Annex XIV, 2026-10-24).
- License MIT.

---

## 11. Open questions

1. **BLS 4.0 license:** the imprint of blsdb.de still carries an old "private use only" notice for web
   documents; the download page puts the data under CC BY 4.0. A written confirmation from the Max
   Rubner-Institut settles it before the data package is published.
2. ~~Energy of nutrients not declared~~: decided 2026-10-24, they count (4.2).
3. ~~Rounding at the boundary~~: decided 2026-10-24 by the wording of Table 4, whose step follows the
   amount itself: 9.96 g is "< 10 g", rounds to 0.1 g and reads "10,0 g". Still open: the meaning of
   the footnote "not applicable to sub-categories".
4. ~~Rounding per piece~~: decided 2026-10-24, the same steps of Table 4, applied to the value per
   piece, which comes from the exact sums, never from the rounded values per 100 g.
5. **A precise value below the threshold:** Table 4 says "0 g" or "< x g" "may be declared". Whether a
   precise value such as "0,3 g" fat may be declared instead is not stated.
6. **`<LOD`, `<LOQ`, `TR` in the data:** neither zero nor missing. The library does not pick a reading;
   the question is what the caller must state.
7. **Salatrims:** Annex XIV does not say "fat (except salatrims)". Until settled, fat is read as total
   lipids including salatrims (Annex I No 2), like carbohydrate including polyols. Polyols and
   erythritol are settled by Annex I (4.2).
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
