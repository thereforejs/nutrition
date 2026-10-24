import { describe, expect, test } from "vite-plus/test";
import { sumNutrients } from "../src/core/sum.ts";
import type { Ingredient, NutrientKey } from "../src/index.ts";
import { diagnosticOf } from "./helpers/diagnostic.ts";

const run = (per100g: Ingredient["per100g"], keys: NutrientKey[] = ["fat"]) =>
  sumNutrients(
    [
      { amount: 100, per100g: { fat: 0 } },
      { amount: 100, per100g },
    ],
    keys,
  );

// SPEC 3.2: the library refuses only what is impossible. Annex XV: carbohydrate of which sugars,
// polyols, starch; fat of which saturates, mono-, polyunsaturates. Annex I No 9: erythritol is a polyol.
describe("a part larger than its whole refuses the result", () => {
  test.each<[NutrientKey, NutrientKey, Ingredient["per100g"]]>([
    ["sugars", "carbohydrate", { carbohydrate: 10, sugars: "10.1" }],
    ["starch", "carbohydrate", { carbohydrate: 10, starch: 11 }],
    ["polyols", "carbohydrate", { carbohydrate: 1, polyols: 2 }],
    ["erythritol", "polyols", { carbohydrate: 5, polyols: 1, erythritol: 2 }],
    ["saturates", "fat", { fat: 5, saturates: 6 }],
    ["monounsaturates", "fat", { fat: 5, monounsaturates: 6 }],
    ["polyunsaturates", "fat", { fat: 5, polyunsaturates: 6 }],
    ["salatrims", "fat", { fat: 1, salatrims: 2 }],
    ["sugars", "carbohydrate", { sugars: 1 }],
  ])("%s above %s", (part, whole, per100g) => {
    expect(diagnosticOf(() => run(per100g))).toMatchObject({
      code: "value.partExceedsWhole",
      path: `ingredients[1].per100g.${part}`,
      params: { part, whole },
      source: "Regulation (EU) No 1169/2011, Annex XV (of which); Annex I No 7 and 9",
    });
  });

  test.each<[string, Ingredient["per100g"]]>([
    ["equal is possible", { carbohydrate: 10, sugars: 10, fat: 5, saturates: 5 }],
    [
      "every part on its own within its whole",
      { fat: 10, saturates: 4, monounsaturates: 4, polyunsaturates: 4 },
    ],
    ["an unknown whole is not compared", { carbohydrate: null, sugars: 5 }],
    ["an unknown part is not compared", { carbohydrate: 1, sugars: null }],
  ])("%s", (_, per100g) => {
    expect(() => run(per100g)).not.toThrow();
  });
});

describe("more than 100 g in 100 g refuses the result", () => {
  test.each<[NutrientKey, Ingredient["per100g"]]>([
    ["fat", { fat: "100.1" }],
    ["protein", { protein: 101 }],
    ["fibre", { fibre: 120 }],
    ["sodium", { sodium: 101 }],
  ])("%s", (key, per100g) => {
    expect(diagnosticOf(() => run(per100g))).toMatchObject({
      code: "value.above100",
      path: `ingredients[1].per100g.${key}`,
    });
  });

  test("100 g is possible: oil", () => {
    expect(() => run({ fat: 100, saturates: 10 })).not.toThrow();
  });

  // Salt is sodium × 2.5, a calculated equivalent, not a mass (Annex I No 11).
  test("salt may exceed 100 g: solid sodium hydroxide for pretzels, 57.5 g sodium", () => {
    expect(() => run({ sodium: "57.5" }, ["salt"])).not.toThrow();
    expect(() => run({ salt: "143.75" }, ["salt"])).not.toThrow();
  });

  test("checked even when the nutrient is not requested", () => {
    expect(diagnosticOf(() => run({ protein: 101 }, ["fat"])).code).toBe("value.above100");
  });
});
