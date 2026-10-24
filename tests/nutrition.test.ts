import fc from "fast-check";
import { describe, expect, test } from "vite-plus/test";
import { calculateNutrition, type Ingredient } from "../src/index.ts";
import { de, en } from "../src/locales/index.ts";
import { diagnosticOf } from "./helpers/diagnostic.ts";

const NBSP = " ";

// 2000 g of dough: per 100 g that is fat 0.5, saturates 0.1, carbohydrate 35, sugars 0.5,
// protein 5, fibre 2, salt 1 (sodium 0.4). Energy: 0.5 × 37 + 35 × 17 + 5 × 17 + 2 × 8 = 714.5 kJ;
// 0.5 × 9 + 35 × 4 + 5 × 4 + 2 × 2 = 168.5 kcal. A piece of 50 g has half of each.
const bread: Ingredient[] = [
  {
    amount: 1000,
    per100g: { fat: 1, saturates: "0.2", carbohydrate: 70, sugars: 1, protein: 10, fibre: 4 },
  },
  { amount: 980, per100g: {} },
  { amount: 20, per100g: { salt: 100 } },
];

const text = (value: { text: Record<string, string> }) =>
  Object.fromEntries(Object.entries(value.text).map(([key, t]) => [key, t.replaceAll(NBSP, " ")]));

describe("calculateNutrition: per 100 g", () => {
  const { per100g } = calculateNutrition({ ingredients: bread }, { locales: [de] });

  test("energy, half up from the unrounded nutrients, fibre counted though not declared", () => {
    expect(per100g.energy.kJ).toMatchObject({ exact: "714.5", rounded: "715" });
    expect(per100g.energy.kcal).toMatchObject({ exact: "168.5", rounded: "169" });
    expect(text(per100g.energy.kJ)).toEqual({ "de-DE": "715 kJ" });
  });

  test.each<[string, string, string, boolean, string]>([
    ["fat", "0.5", "0", true, "<0,5 g"],
    ["saturates", "0.1", "0", true, "<0,1 g"],
    ["carbohydrate", "35", "35", false, "35 g"],
    ["sugars", "0.5", "0", true, "<0,5 g"],
    ["protein", "5", "5.0", false, "5,0 g"],
    ["salt", "1", "1.0", false, "1,0 g"],
    ["sodium", "0.4", "0.40", false, "0,40 g"],
  ])("%s", (key, exact, rounded, negligible, german) => {
    const value = per100g[key as keyof typeof per100g] as Parameters<typeof text>[0];
    expect(value).toMatchObject({ exact, rounded, negligible });
    expect(text(value)).toEqual({ "de-DE": german });
  });

  test("the mandatory nutrients and sodium in the order of Annex XV, voluntary only when asked", () => {
    expect(Object.keys(per100g)).toEqual([
      "energy",
      "fat",
      "saturates",
      "carbohydrate",
      "sugars",
      "protein",
      "salt",
      "sodium",
    ]);
  });
});

describe("calculateNutrition: options", () => {
  test("voluntary nutrients join in the order of Annex XV", () => {
    const { per100g } = calculateNutrition(
      { ingredients: bread },
      { voluntary: ["fibre", "starch", "monounsaturates"] },
    );
    expect(Object.keys(per100g)).toEqual([
      "energy",
      "fat",
      "saturates",
      "monounsaturates",
      "carbohydrate",
      "sugars",
      "starch",
      "fibre",
      "protein",
      "salt",
      "sodium",
    ]);
    expect(per100g.fibre).toMatchObject({ exact: "2", rounded: "2.0" });
  });

  test("no locales: no text", () => {
    const { per100g } = calculateNutrition({ ingredients: bread });
    expect(per100g.fat.text).toEqual({});
  });

  test("two locales, negligible as 0 g", () => {
    const { per100g } = calculateNutrition(
      { ingredients: bread },
      { locales: [de, en], negligible: "zero" },
    );
    expect(text(per100g.fat)).toEqual({ "de-DE": "0 g", "en-GB": "0 g" });
    expect(text(per100g.protein)).toEqual({ "de-DE": "5,0 g", "en-GB": "5.0 g" });
  });

  test.each<[string, object, string]>([
    ["negligible", { negligible: "none" }, "options.negligible"],
    ["voluntary", { voluntary: ["fat"] }, "options.voluntary"],
  ])("an unknown %s is refused", (_, options, path) => {
    expect(
      diagnosticOf(() => calculateNutrition({ ingredients: bread }, options as never)),
    ).toMatchObject({ code: "options.invalid", path });
  });
});

describe("calculateNutrition: per piece, from the exact sums, rounded by the same table", () => {
  const { perPiece } = calculateNutrition(
    { ingredients: bread, pieceWeight: 50 },
    { locales: [de] },
  );

  test("energy", () => {
    expect(perPiece?.energy.kJ).toMatchObject({ exact: "357.25", rounded: "357" });
    expect(perPiece?.energy.kcal).toMatchObject({ exact: "84.25", rounded: "84" });
  });

  test("nutrients", () => {
    expect(perPiece?.carbohydrate).toMatchObject({ exact: "17.5", rounded: "18" });
    expect(perPiece?.protein).toMatchObject({ exact: "2.5", rounded: "2.5" });
    expect(perPiece?.salt).toMatchObject({ exact: "0.5", rounded: "0.50" });
    expect(perPiece?.fat).toMatchObject({ exact: "0.25", negligible: true });
  });

  test("without a piece weight there is no perPiece", () => {
    expect(calculateNutrition({ ingredients: bread }).perPiece).toBeUndefined();
  });

  test("a piece of 0 g is refused", () => {
    expect(
      diagnosticOf(() => calculateNutrition({ ingredients: bread, pieceWeight: 0 })),
    ).toMatchObject({ code: "pieceWeight.zero", path: "pieceWeight" });
  });
});

describe("calculateNutrition: the report travels with the result", () => {
  test("unknown fibre in one ingredient", () => {
    const ingredients = [...bread, { amount: 10, per100g: { fibre: null } }];
    expect(calculateNutrition({ ingredients }).report).toEqual([
      { code: "value.missing", nutrient: "fibre", ingredients: [3] },
    ]);
  });
});

// Up to 2 integer and 12 fraction digits, never 0 for a weight.
const odd = (min: number) =>
  fc
    .tuple(
      fc.integer({ min, max: 99 }),
      fc.string({ unit: fc.integer({ min: 0, max: 9 }).map(String), maxLength: 12 }),
    )
    .map(([whole, fraction]) => (fraction ? `${whole}.${fraction}` : `${whole}`));

describe("calculateNutrition: odd numbers everywhere never exceed decy's 30 decimals", () => {
  test("12 decimals in amounts, values and the piece weight", () => {
    fc.assert(
      fc.property(odd(1), odd(0), odd(0), odd(1), (amount, fat, salt, pieceWeight) => {
        const ingredient = { amount, per100g: { fat, saturates: fat, carbohydrate: fat, salt } };
        expect(() =>
          calculateNutrition(
            { ingredients: [ingredient, ingredient], pieceWeight },
            { voluntary: ["fibre", "polyols"], locales: [de] },
          ),
        ).not.toThrow();
      }),
    );
  });
});
