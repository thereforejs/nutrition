import { decimal } from "@thereforejs/decy";
import { describe, expect, test } from "vite-plus/test";
import { ENERGY_KEYS } from "../src/core/energy.ts";
import { shareOf } from "../src/core/share.ts";
import { sumNutrients } from "../src/core/sum.ts";
import type { Ingredient } from "../src/index.ts";
import { plain } from "./helpers/decimal.ts";

const energy = (per100g: Ingredient["per100g"], amount: number | string = 100) => {
  const totals = sumNutrients([{ amount, per100g }], ENERGY_KEYS);
  const { kJ, kcal } = shareOf(totals, decimal("100")).energy;
  return { kJ: plain(kJ), kcal: plain(kcal) };
};

const base = { fat: 0, carbohydrate: 0, protein: 0 };

// Regulation (EU) No 1169/2011, Annex XIV, unchanged in the consolidated text of 1.4.2025.
describe("each factor of Annex XIV, kJ and kcal on their own", () => {
  test.each<[string, Ingredient["per100g"], { kJ: string; kcal: string }]>([
    ["carbohydrate", { ...base, carbohydrate: 1 }, { kJ: "17", kcal: "4" }],
    ["polyols", { ...base, carbohydrate: 1, polyols: 1 }, { kJ: "10", kcal: "2.4" }],
    ["protein", { ...base, protein: 1 }, { kJ: "17", kcal: "4" }],
    ["fat", { ...base, fat: 1 }, { kJ: "37", kcal: "9" }],
    ["salatrims", { ...base, fat: 1, salatrims: 1 }, { kJ: "25", kcal: "6" }],
    ["alcohol", { ...base, alcohol: 1 }, { kJ: "29", kcal: "7" }],
    ["organic acid", { ...base, organicAcids: 1 }, { kJ: "13", kcal: "3" }],
    ["fibre", { ...base, fibre: 1 }, { kJ: "8", kcal: "2" }],
    ["erythritol", { ...base, carbohydrate: 1, polyols: 1, erythritol: 1 }, { kJ: "0", kcal: "0" }],
  ])("1 g of %s", (_, per100g, expected) => {
    expect(energy(per100g)).toEqual(expected);
  });
});

// Annex I: carbohydrate includes polyols, erythritol is a polyol, fat means total lipids.
describe("every gram meets exactly one factor", () => {
  test("50 g carbohydrate holding 10 g polyols holding 4 g erythritol", () => {
    // 40 × 17 + 6 × 10 + 4 × 0 = 740 kJ; 40 × 4 + 6 × 2.4 = 174.4 kcal
    expect(energy({ ...base, carbohydrate: 50, polyols: 10, erythritol: 4 })).toEqual({
      kJ: "740",
      kcal: "174.4",
    });
  });

  test("10 g fat holding 2 g salatrims", () => {
    // 8 × 37 + 2 × 25 = 346 kJ; 8 × 9 + 2 × 6 = 84 kcal
    expect(energy({ ...base, fat: 10, salatrims: 2 })).toEqual({ kJ: "346", kcal: "84" });
  });

  test("a wholemeal bread: 1.5 fat, 41 carbohydrate, 8 protein, 7 fibre, 0.3 organic acid", () => {
    // 55.5 + 697 + 136 + 56 + 3.9 = 948.4 kJ; 13.5 + 164 + 32 + 14 + 0.9 = 224.4 kcal
    expect(
      energy({ fat: "1.5", carbohydrate: 41, protein: 8, fibre: 7, organicAcids: "0.3" }),
    ).toEqual({ kJ: "948.4", kcal: "224.4" });
  });
});

describe("a part the data does not have counts as nothing", () => {
  test.each<[string, Ingredient["per100g"]]>([
    ["missing", { fat: 1, carbohydrate: 0, protein: 0 }],
    ["null", { fat: 1, carbohydrate: 0, protein: 0, fibre: null, alcohol: null }],
  ])("%s", (_, per100g) => {
    expect(energy(per100g)).toEqual({ kJ: "37", kcal: "9" });
  });

  test("null is reported, the energy is calculated without it", () => {
    const { report } = sumNutrients(
      [{ amount: 100, per100g: { fat: 1, fibre: null } }],
      ENERGY_KEYS,
    );
    expect(report).toEqual([{ code: "value.missing", nutrient: "fibre", ingredients: [0] }]);
  });
});
