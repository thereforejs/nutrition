import { describe, expect, test } from "vite-plus/test";
import { calculateNutrition, type Ingredient } from "../src/index.ts";
import { de, en } from "../src/locales/index.ts";
import { diagnosticOf } from "./helpers/diagnostic.ts";

const NBSP = " ";

// The bread of nutrition.test.ts: per 100 g fat 0.5, saturates 0.1, carbohydrate 35, sugars 0.5,
// protein 5, fibre 2, salt 1; energy 714.5 kJ / 168.5 kcal.
const bread: Ingredient[] = [
  {
    amount: 1000,
    per100g: { fat: 1, saturates: "0.2", carbohydrate: 70, sugars: 1, protein: 10, fibre: 4 },
  },
  { amount: 980, per100g: {} },
  { amount: 20, per100g: { salt: 100 } },
];

// Regulation (EU) No 1169/2011, Art. 32(4), Annex XIII Part B. Expected values from Python's decimal
// module: value × 100 / reference intake, 12 decimals half up, then whole percent half up.
describe("percent of the reference intake, from the exact value, whole percent half up", () => {
  const { per100g, perPiece } = calculateNutrition(
    { ingredients: bread, pieceWeight: 50 },
    { referenceIntake: true, voluntary: ["fibre"], locales: [de, en] },
  );

  test.each<[string, string, string]>([
    ["fat", "0.714285714286", "1"],
    ["saturates", "0.5", "1"],
    ["carbohydrate", "13.461538461538", "13"],
    ["sugars", "0.555555555556", "1"],
    ["protein", "10", "10"],
    ["salt", "16.666666666667", "17"],
  ])("%s", (key, exact, rounded) => {
    expect(per100g[key as keyof typeof per100g]).toMatchObject({
      referenceIntake: { exact, rounded },
    });
  });

  test("energy, kJ and kcal each against their own reference", () => {
    expect(per100g.energy.kJ.referenceIntake).toMatchObject({
      exact: "8.505952380952",
      rounded: "9",
    });
    expect(per100g.energy.kcal.referenceIntake).toMatchObject({ exact: "8.425", rounded: "8" });
  });

  test("only for the nutrients of Annex XIII Part B: not sodium, not fibre (Q&A 2018 No 3.3.4)", () => {
    expect(per100g.sodium.referenceIntake).toBeUndefined();
    expect(per100g.fibre?.referenceIntake).toBeUndefined();
  });

  test("the statement also comes with a piece weight", () => {
    expect(
      calculateNutrition(
        { ingredients: bread, pieceWeight: 50 },
        { referenceIntake: true, locales: [de] },
      ).referenceIntakeStatement,
    ).toEqual({
      "de-DE": "Referenzmenge für einen durchschnittlichen Erwachsenen (8 400 kJ/2 000 kcal)",
    });
  });

  test("per piece too (Art. 33(1)(c))", () => {
    expect(perPiece?.carbohydrate.referenceIntake).toMatchObject({
      exact: "6.730769230769",
      rounded: "7",
    });
  });

  test("text per locale", () => {
    expect(per100g.salt.referenceIntake?.text).toEqual({
      "de-DE": `17${NBSP}%`,
      "en-GB": `17${NBSP}%`,
    });
  });

  test("the statement of Art. 32(5) in every locale", () => {
    expect(
      calculateNutrition({ ingredients: bread }, { referenceIntake: true, locales: [de, en] })
        .referenceIntakeStatement,
    ).toEqual({
      "de-DE": "Referenzmenge für einen durchschnittlichen Erwachsenen (8 400 kJ/2 000 kcal)",
      "en-GB": "Reference intake of an average adult (8 400 kJ/2 000 kcal)",
    });
  });

  test("25 g fat: 35.7 % reads 36 %", () => {
    const result = calculateNutrition(
      { ingredients: [{ amount: 100, per100g: { fat: 25 } }] },
      { referenceIntake: true },
    );
    expect(result.per100g.fat.referenceIntake?.rounded).toBe("36");
  });
});

describe("without the option nothing changes", () => {
  test("no referenceIntake, no statement", () => {
    const result = calculateNutrition({ ingredients: bread }, { locales: [de] });
    expect(result.per100g.fat.referenceIntake).toBeUndefined();
    expect(result.referenceIntakeStatement).toBeUndefined();
  });

  test("the option must be true or false", () => {
    expect(
      diagnosticOf(() =>
        calculateNutrition({ ingredients: bread }, { referenceIntake: "yes" } as never),
      ),
    ).toMatchObject({ code: "options.invalid", path: "options.referenceIntake" });
  });
});
