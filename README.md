<p align="center">
  <img src="./assets/logo.svg" alt="nutrition" width="128" height="128">
</p>

<h1 align="center">nutrition</h1>

<p align="center">
  The nutrition declaration of a food, calculated from its recipe under the EU food information<br>
  regulation (Regulation (EU) No 1169/2011, known as FIC, LMIV in German, INCO in French).<br>
  It calculates, it never guesses.
</p>

> [!WARNING]
> Early development (0.x). The API may still change. The library is no legal advice: the label stays
> the responsibility of the food business.

## Install

```sh
npm install @thereforejs/nutrition
```

## At a glance

Bread rolls: the recipe in grams as it comes out of the oven, values from
[`@thereforejs/foods`](https://github.com/thereforejs/foods). The baking loss is taken off the water.

```ts
import { calculateNutrition } from "@thereforejs/nutrition";
import { de, en } from "@thereforejs/nutrition/locales";
import { C214200, N110000, R111000, R459000 } from "@thereforejs/foods";

const { per100g, perPiece, report } = calculateNutrition(
  {
    ingredients: [
      { amount: 1000, per100g: C214200.per100g }, // wheat flour type 550
      { amount: 420, per100g: N110000.per100g }, // water: 600 g less 180 g baking loss
      { amount: 40, per100g: R459000.per100g }, // fresh yeast
      { amount: 20, per100g: R111000.per100g }, // salt
    ],
    pieceWeight: 60,
  },
  { locales: [de, en] },
);
```

The declaration, each value as `text` in every locale you import:

|                              | pro 100 g          | pro Brötchen (60 g) |
| ---------------------------- | ------------------ | ------------------- |
| Energie                      | 1016 kJ / 240 kcal | 609 kJ / 144 kcal   |
| Fett                         | 0,8 g              | <0,5 g              |
| davon: gesättigte Fettsäuren | <0,1 g             | <0,1 g              |
| Kohlenhydrate                | 48 g               | 29 g                |
| davon: Zucker                | <0,5 g             | <0,5 g              |
| Eiweiß                       | 8,5 g              | 5,1 g               |
| Salz                         | 1,3 g              | 0,78 g              |

|                    | per 100 g          | per roll of 60 g  |
| ------------------ | ------------------ | ----------------- |
| energy             | 1016 kJ / 240 kcal | 609 kJ / 144 kcal |
| fat                | 0.8 g              | <0.5 g            |
| of which saturates | <0.1 g             | <0.1 g            |
| carbohydrate       | 48 g               | 29 g              |
| of which sugars    | <0.5 g             | <0.5 g            |
| protein            | 8.5 g              | 5.1 g             |
| salt               | 1.3 g              | 0.78 g            |

Every value also comes as data: `exact`, `rounded`, `negligible`, `atMost`. What the calculation went
on without is in `report`: the BLS has no value for polyols of fresh yeast, so the energy is
calculated without them and the report says so.

More recipes from easy to hard (voluntary nutrients, % reference intake, a supplier's sheet, a
refused input) are in [`examples/recipes.ts`](./examples/recipes.ts): `vp run example`.

**Checked against published declarations** ([`tests/oracle.test.ts`](./tests/oracle.test.ts)): the
EuroFIR recipe example, and the worked examples of two labelling guides. Same sums, same rounding;
the energy differs only where a partner calculates it from the rounded values (we use the exact
ones, SPEC 10).

## Usage

```ts
import { calculateNutrition } from "@thereforejs/nutrition";
import { de } from "@thereforejs/nutrition/locales";

const { per100g, perPiece, report } = calculateNutrition(
  {
    ingredients: [
      {
        amount: 1000,
        per100g: { fat: 1, saturates: 0.2, carbohydrate: 70, sugars: 1, protein: 10, fibre: 4 },
      },
      { amount: 980, per100g: {} }, // water
      { amount: 20, per100g: { salt: 100 } },
    ],
    pieceWeight: 50, // optional
  },
  { locales: [de], voluntary: ["fibre"] },
);

per100g.energy.kJ; // { exact: "714.5", rounded: "715", negligible: false, atMost: false, text: { "de-DE": "715 kJ" } }
per100g.fat; //       { exact: "0.5", rounded: "0.5", negligible: true, atMost: true, text: { "de-DE": "<0,5 g" } }
```

Amounts are grams as they end up in the product; their sum is the product weight. Values are grams
per 100 g, as a number or decimal text. Energy is always calculated, never passed.

| Option            | Default  | Meaning                                                                                                                                                                              |
| ----------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `locales`         | `[]`     | imported locales, each adds its `text`; import only what you need                                                                                                                    |
| `negligible`      | `"auto"` | a negligible amount (Table 4): `"auto"` reads `"0 g"` when there is none and `"<0,5 g"` (`atMost: true`) when there is some; `"lessThan"` always `"<0,5 g"`, `"zero"` always `"0 g"` |
| `voluntary`       | `[]`     | voluntary nutrients to declare: `monounsaturates`, `polyunsaturates`, `polyols`, `starch`, `fibre`                                                                                   |
| `referenceIntake` | `false`  | adds `referenceIntake: { exact, rounded, text }` (percent, whole, half up) to energy and the nutrients of Annex XIII Part B, and `referenceIntakeStatement` per locale (Art. 32(5))  |

## Data

Values of over 7,100 foods come with [`@thereforejs/foods`](https://github.com/thereforejs/foods),
and [`@thereforejs/food-finder`](https://github.com/thereforejs/food-finder) finds them by what people
type. Both are optional:

```sh
npm install @thereforejs/foods @thereforejs/food-finder
```

```ts
import { calculateNutrition } from "@thereforejs/nutrition";
import { C131000 } from "@thereforejs/foods"; // Oat whole grain, raw

calculateNutrition({ ingredients: [{ amount: 100, per100g: C131000.per100g }] });
```

A `null` in foods is unknown here and lands in the report; its `marks` say whether it is below a
limit of detection.

## Your values, your responsibility

The library knows no foods, only the values you pass. It checks that they are possible, not that they
are right. What a value means is decided by what you send:

| You send | Meaning       | The library                                    |
| -------- | ------------- | ---------------------------------------------- |
| `0`      | there is none | calculates with 0                              |
| no key   | nothing said  | calculates with 0                              |
| `null`   | unknown       | calculates without it and lists it in `report` |

## Report

Everything the calculation went on without, grouped by code and nutrient, so it reads
"2 ingredients without fibre". `ingredients` are positions in your input list.

```ts
report: [{ code: "value.missing", nutrient: "fibre", ingredients: [3, 7] }];
```

| Code            | Meaning                                        | What you can do                                                                  |
| --------------- | ---------------------------------------------- | -------------------------------------------------------------------------------- |
| `value.missing` | these ingredients have `null` for the nutrient | find the value (supplier, another database, a lab), or send `0` if there is none |

## Errors

Errors refuse the whole result and come as a `DiagnosticError` whose `diagnostics` carry a stable
`code`, the `path` into your input and typed `params`; checking `code` narrows `params`.

```ts
try {
  calculateNutrition(input);
} catch (error) {
  if (error instanceof DiagnosticError) {
    for (const d of error.diagnostics) {
      if (d.code === "value.unknownKey") console.log(d.path, d.params.key);
    }
  }
}
```

| Code                     | Params           | When                                                      |
| ------------------------ | ---------------- | --------------------------------------------------------- |
| `input.invalid`          |                  | the input is not `{ ingredients: [{ amount, per100g }] }` |
| `options.invalid`        | `value`          | an option has a value it cannot have                      |
| `value.invalid`          | `value`          | not a number or decimal text of at least 0                |
| `value.unknownKey`       | `key`            | a key in `per100g` that is no nutrient (a typo, `energy`) |
| `value.above100`         |                  | more than 100 g in 100 g (salt: more than 250 g)          |
| `value.partExceedsWhole` | `part`, `whole`  | e.g. sugars above carbohydrate (Annex XV)                 |
| `salt.sodiumMismatch`    | `salt`, `sodium` | both given and salt is not sodium × 2.5 (Annex I No 11)   |
| `weight.zero`            |                  | the product weighs 0 g                                    |
| `pieceWeight.zero`       |                  | a piece of 0 g                                            |

## License

[MIT](./LICENSE)
