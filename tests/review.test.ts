import fc from "fast-check";
import { describe, expect, test } from "vite-plus/test";
import { calculateNutrition, type Ingredient } from "../src/index.ts";
import { de } from "../src/locales/index.ts";
import { diagnosticOf } from "./helpers/diagnostic.ts";

const per100g = (ingredients: Ingredient[]) => calculateNutrition({ ingredients }).per100g;

// Findings of the review of 2026-10-24, each reproduced before the fix.
describe("energy takes each part out of its own ingredient's whole", () => {
  test("carbohydrate unknown, polyols known: the polyols count, nothing is subtracted", () => {
    // 50 × 10 = 500 kJ; 50 × 2.4 = 120 kcal (was -350 kJ)
    const { energy } = per100g([{ amount: 100, per100g: { carbohydrate: null, polyols: 50 } }]);
    expect([energy.kJ.exact, energy.kcal.exact]).toEqual(["500", "120"]);
  });

  test("fat unknown, salatrims known", () => {
    // 10 × 25 = 250 kJ; 10 × 6 = 60 kcal
    const { energy } = per100g([{ amount: 100, per100g: { fat: null, salatrims: 10 } }]);
    expect([energy.kJ.exact, energy.kcal.exact]).toEqual(["250", "60"]);
  });

  test("cocoa with maltitol whose carbohydrate is unknown", () => {
    // 36 × 17 + 24 × 37 + 39.6 × 10 = 1896 kJ; 36 × 4 + 24 × 9 + 39.6 × 2.4 = 455.04 kcal
    const { energy } = per100g([
      { amount: 60, per100g: { carbohydrate: 60, fat: 40, protein: 0, sugars: 0 } },
      { amount: 40, per100g: { carbohydrate: null, polyols: 99 } },
    ]);
    expect([energy.kJ.exact, energy.kcal.exact]).toEqual(["1896", "455.04"]);
  });
});

describe("salt is derived from sodium at the very end, so both always agree", () => {
  test("a salt just above its threshold: sodium is just above its own", () => {
    const { salt, sodium } = per100g([{ amount: 100, per100g: { salt: "0.012500000001" } }]);
    expect(salt.negligible).toBe(sodium.negligible);
  });

  test("property: salt is sodium × 2.5 and both are negligible together (0.0125 g = 0.005 g × 2.5)", () => {
    const value = fc
      .tuple(
        fc.integer({ min: 0, max: 39 }),
        fc.string({ unit: fc.integer({ min: 0, max: 9 }).map(String), maxLength: 12 }),
      )
      .map(([whole, fraction]) => (fraction ? `${whole}.${fraction}` : `${whole}`));
    fc.assert(
      fc.property(value, fc.integer({ min: 1, max: 5000 }), (salt, water) => {
        const result = per100g([
          { amount: 100, per100g: { salt } },
          { amount: water, per100g: {} },
        ]);
        expect(Number(result.salt.exact)).toBeCloseTo(Number(result.sodium.exact) * 2.5, 10);
        expect(result.salt.negligible).toBe(result.sodium.negligible);
      }),
    );
  });

  test("sodium and salt given together at 12 decimals agree", () => {
    expect(() =>
      per100g([{ amount: 100, per100g: { sodium: "0.000000000001", salt: "0.0000000000025" } }]),
    ).not.toThrow();
  });
});

describe("sums are exact; only the total is rounded to 12 decimals", () => {
  test("splitting a tiny ingredient changes nothing", () => {
    const whole = per100g([
      { amount: "0.000000000002", per100g: { fat: 50 } },
      { amount: 1, per100g: {} },
    ]);
    const split = per100g([
      { amount: "0.000000000001", per100g: { fat: 50 } },
      { amount: "0.000000000001", per100g: { fat: 50 } },
      { amount: 1, per100g: {} },
    ]);
    expect(split.fat.exact).toBe(whole.fat.exact);
  });
});

describe("salt above 250 g means more than 100 g sodium: impossible", () => {
  test("250 g salt is possible, 250.1 g is not", () => {
    expect(() => per100g([{ amount: 100, per100g: { salt: 250 } }])).not.toThrow();
    expect(
      diagnosticOf(() => per100g([{ amount: 100, per100g: { salt: "250.1" } }])),
    ).toMatchObject({ code: "value.above100", path: "ingredients[0].per100g.salt" });
  });
});

describe("options and input are checked, never a foreign error", () => {
  const ingredients: Ingredient[] = [{ amount: 100, per100g: { fat: 1 } }];

  test("an option given as undefined takes its default", () => {
    const result = calculateNutrition(
      { ingredients },
      { voluntary: undefined, locales: undefined, negligible: undefined },
    );
    expect(result.per100g.fat.text).toEqual({});
  });

  test.each<[string, object, string]>([
    ["voluntary not a list", { voluntary: "fibre" }, "options.voluntary"],
    ["locales not a list", { locales: de }, "options.locales"],
    [
      "a locale without a valid tag",
      { locales: [{ ...de, locale: "xx_bad" }] },
      "options.locales[0]",
    ],
    ["a locale without labels", { locales: [{ locale: "de-DE" }] }, "options.locales[0]"],
    [
      "a locale missing one label",
      { locales: [{ ...de, labels: { ...de.labels, salt: undefined } }] },
      "options.locales[0]",
    ],
  ])("%s", (_, options, path) => {
    expect(diagnosticOf(() => calculateNutrition({ ingredients }, options as never))).toMatchObject(
      {
        code: "options.invalid",
        path,
      },
    );
  });

  test.each<[string, unknown, string]>([
    ["no ingredients list", {}, "ingredients"],
    ["an ingredient that is null", { ingredients: [null] }, "ingredients[0]"],
    ["an ingredient without per100g", { ingredients: [{ amount: 1 }] }, "ingredients[0].per100g"],
  ])("%s", (_, input, path) => {
    expect(diagnosticOf(() => calculateNutrition(input as never))).toMatchObject({
      code: "input.invalid",
      path,
    });
  });
});

describe("an ingredient of 0 g leaves nothing out", () => {
  test("its unknown values are not reported", () => {
    const { report } = calculateNutrition({
      ingredients: [
        { amount: 100, per100g: { fat: 1 } },
        { amount: 0, per100g: { fibre: null } },
      ],
    });
    expect(report).toEqual([]);
  });
});
