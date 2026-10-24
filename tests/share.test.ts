import { decimal } from "@thereforejs/decy";
import fc from "fast-check";
import { describe, expect, test } from "vite-plus/test";
import { shareOf } from "../src/core/share.ts";
import { sumNutrients } from "../src/core/sum.ts";
import type { Ingredient } from "../src/index.ts";
import { plain } from "./helpers/decimal.ts";
import { diagnosticOf } from "./helpers/diagnostic.ts";
import { per100g } from "./helpers/nutrition.ts";

const fatIn = (ingredients: Ingredient[], grams: string | number = 100) =>
  plain(shareOf(sumNutrients(ingredients, ["fat"]), decimal(String(grams))).nutrients.fat);

// A product of the given weight with `fat` grams of pure fat, the rest water.
const product = (fat: number, weight: number): Ingredient[] => [
  { amount: fat, per100g: { fat: 100 } },
  { amount: weight - fat, per100g: { fat: 0 } },
];

// Expected values from Python's decimal module (quantize to 1e-12, ROUND_HALF_UP).
describe("per 100 g and per piece: sum × grams / product weight, 12 decimals half up", () => {
  test.each<[string, Ingredient[], string | number, string]>([
    ["1 g in 300 g", product(1, 300), 100, "0.333333333333"],
    ["2 g in 300 g rounds up", product(2, 300), 100, "0.666666666667"],
    ["1 g in 700 g", product(1, 700), 100, "0.142857142857"],
    ["5 g in 700 g", product(5, 700), 100, "0.714285714286"],
    ["a piece of 54.7 g, 1 g in 300 g", product(1, 300), "54.7", "0.182333333333"],
    [
      "odd recipe: 12.345678 g in 333.333 g",
      [
        { amount: "12.345678", per100g: { fat: 100 } },
        { amount: "320.987322", per100g: { fat: 0 } },
      ],
      100,
      "3.703707103707",
    ],
  ])("%s", (_, ingredients, grams, expected) => {
    expect(fatIn(ingredients, grams)).toBe(expected);
  });
});

describe("a product without weight refuses the result", () => {
  test.each<[string, Ingredient[]]>([
    ["no ingredients", []],
    ["all amounts 0", [{ amount: 0, per100g: { fat: 5 } }]],
  ])("%s", (_, ingredients) => {
    expect(diagnosticOf(() => fatIn(ingredients))).toMatchObject({
      code: "weight.zero",
      path: "ingredients",
    });
  });
});

const ingredient = fc.record({
  amount: fc.integer({ min: 1, max: 100000 }).map((milligrams) => milligrams / 1000),
  per100g: fc.record({ fat: fc.integer({ min: 0, max: 100000 }).map((value) => value / 1000) }),
});

describe("properties of per 100 g", () => {
  test("scaling every amount by the same factor changes nothing", () => {
    fc.assert(
      fc.property(
        fc.array(ingredient, { minLength: 1, maxLength: 8 }),
        fc.integer({ min: 2, max: 50 }),
        (list, k) => {
          const scaled = list.map((item) => ({ ...item, amount: item.amount * k }));
          expect(fatIn(scaled)).toBe(fatIn(list));
        },
      ),
    );
  });

  test("the order of the ingredients changes nothing", () => {
    fc.assert(
      fc.property(fc.array(ingredient, { minLength: 1, maxLength: 8 }), (list) => {
        expect(fatIn([...list].reverse())).toBe(fatIn(list));
      }),
    );
  });

  test("splitting an ingredient in two changes nothing", () => {
    fc.assert(
      fc.property(fc.array(ingredient, { minLength: 1, maxLength: 8 }), (list) => {
        const [first, ...rest] = list;
        const half = { ...first, amount: first.amount / 2 };
        expect(fatIn([half, half, ...rest])).toBe(fatIn(list));
      }),
    );
  });

  test("adding water never raises a value per 100 g", () => {
    fc.assert(
      fc.property(
        fc.array(ingredient, { minLength: 1, maxLength: 8 }),
        fc.integer({ min: 1, max: 1000 }),
        (list, water) => {
          const diluted = fatIn([...list, { amount: water, per100g: { fat: 0 } }]);
          expect(Number(diluted)).toBeLessThanOrEqual(Number(fatIn(list)));
        },
      ),
    );
  });
});

// Expected values from Python's decimal module: ROUND_HALF_UP and ROUND_HALF_EVEN differ on a 5.
describe("every 12-decimal rounding is half up, never half even", () => {
  test("the division: 2.5e-12 per 100 g reads 3e-12", () => {
    const { fat } = per100g([
      { amount: 100, per100g: { fat: "0.000000000005" } },
      { amount: 100, per100g: {} },
    ]);
    expect(fat.exact).toBe("0.000000000003");
  });

  test("the total: 2.5e-12 g fat in 1 g reads 3e-12 g, so 3e-10 per 100 g", () => {
    expect(per100g([{ amount: 1, per100g: { fat: "0.00000000025" } }]).fat.exact).toBe(
      "0.0000000003",
    );
  });
});
