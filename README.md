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
> Early development (0.x). Nothing is published yet and the API will change. The library is no legal
> advice: the label stays the responsibility of the food business.

## Install

```sh
npm install @thereforejs/nutrition
```

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

per100g.energy.kJ; // { exact: "714.5", rounded: "715", negligible: false, text: { "de-DE": "715 kJ" } }
per100g.fat; //       { exact: "0.5", rounded: "0", negligible: true, text: { "de-DE": "<0,5 g" } }
```

Amounts are grams as they end up in the product; their sum is the product weight. Values are grams
per 100 g, as a number or decimal text. Energy is always calculated, never passed.

| Option            | Default      | Meaning                                                                                                                                                                             |
| ----------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `locales`         | `[]`         | imported locales, each adds its `text`; import only what you need                                                                                                                   |
| `negligible`      | `"lessThan"` | a negligible amount reads `"<0,5 g"`, or `"0 g"` with `"zero"`                                                                                                                      |
| `voluntary`       | `[]`         | voluntary nutrients to declare: `monounsaturates`, `polyunsaturates`, `polyols`, `starch`, `fibre`                                                                                  |
| `referenceIntake` | `false`      | adds `referenceIntake: { exact, rounded, text }` (percent, whole, half up) to energy and the nutrients of Annex XIII Part B, and `referenceIntakeStatement` per locale (Art. 32(5)) |

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
