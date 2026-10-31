import { type Decimal, decimal, round } from "@thereforejs/decy";
import { describe, expect, test } from "vite-plus/test";
import { ENERGY_KEYS, type EnergyKey, energyOf } from "../src/core/energy.ts";
import { type Declared, roundOf } from "../src/core/rounding.ts";
import { shareOf } from "../src/core/share.ts";
import { sumNutrients } from "../src/core/sum.ts";
import { calculateNutrition, type Ingredient } from "../src/index.ts";
import { plain } from "./helpers/decimal.ts";

// Published declarations, recalculated from their own numbers. We calculate energy from the exact
// values (SPEC 10); a partner that calculates it from the rounded ones must come out the same when we
// do it their way.

const label = (key: Declared, value: Decimal) => plain(roundOf(key, value).rounded);

/** Energy from declared values, the way the partner calculates it. */
const energyFromDeclared = (values: Partial<Record<EnergyKey, string>>) => {
  const all = Object.fromEntries(
    ENERGY_KEYS.map((key) => [key, decimal(values[key] ?? "0")]),
  ) as Record<EnergyKey, Decimal>;
  const { kJ, kcal } = energyOf(all);
  return { kJ: label("energyKJ", kJ), kcal: label("energyKcal", kcal) };
};

// EuroFIR, "How to calculate nutrient content of foods", attachment "Bramborak", sheet MANDATORY
// (2015): fried potato pancakes, raw weight 607 g, weighed after frying 438 g. Expected exact values
// from Python's decimal module: sum of amount × value / 100, divided by 438 g, 12 decimals half up.
describe("EuroFIR, Bramborak (fried potato pancakes)", () => {
  const ingredient = (amount: string, values: string[]): Ingredient => {
    const [fat, saturates, carbohydrate, sugars, fibre, protein, sodium] = values;
    return { amount, per100g: { fat, saturates, carbohydrate, sugars, fibre, protein, sodium } };
  };
  const ingredients = [
    ingredient("382.5", ["0.3", "0", "17.2", "3", "1.6", "2.4", "0.016"]), // potatoes, raw
    ingredient("100", ["1.7", "0.22", "68.9", "2.1", "3.1", "11.9", "0.001"]), // wheat flour
    ingredient("50", ["1.5", "0.97", "4.8", "4.6", "0", "3.2", "0.041"]), // milk 1.5 %
    ingredient("20", ["9.5", "3.07", "0.6", "0.3", "0", "12.6", "0.135"]), // egg
    ingredient("4.5", ["0.4", "0.06", "28.9", "3.2", "2.8", "6.3", "0.013"]), // garlic
    ingredient("5", ["0", "0", "0", "0", "0", "0", "38.85"]), // salt
    ingredient("45", ["99.5", "43.69", "0", "0", "0", "0.2", "0.002"]), // lard absorbed
  ];
  const keys = [
    "fat",
    "saturates",
    "carbohydrate",
    "sugars",
    "fibre",
    "protein",
    "sodium",
    "salt",
  ] as const;
  const totals = sumNutrients(ingredients, keys);
  // EuroFIR divides by the weighed dish, not by the raw sum.
  const { nutrients, energy } = shareOf({ ...totals, weight: decimal("438") }, decimal("100"));
  const exact: Record<string, Decimal> = nutrients;

  test("the raw weight is EuroFIR's", () => {
    expect(plain(totals.weight)).toBe("607");
  });

  test.each<[string, string, number, string]>([
    ["fat", "11.481849315068", 1, "11.5"],
    ["saturates", "4.790456621005", 2, "4.79"],
    ["carbohydrate", "31.623401826484", 1, "31.6"],
    ["sugars", "3.67100456621", 1, "3.7"],
    ["fibre", "2.133789954338", 1, "2.1"],
    ["protein", "5.838698630137", 1, "5.8"],
    ["sodium", "0.468877853881", 3, "0.469"],
    ["salt", "1.172194634703", 2, "1.17"],
  ])("%s: exact %s, EuroFIR prints %s", (key, value, scale, printed) => {
    expect(plain(exact[key])).toBe(value);
    expect(plain(round(exact[key], { scale, mode: "halfAwayFromZero" }))).toBe(printed);
  });

  test.each<[Declared, string]>([
    ["saturates", "4.8"],
    ["carbohydrate", "32"],
    ["sugars", "3.7"],
    ["fibre", "2.1"],
    ["protein", "5.8"],
    ["sodium", "0.47"],
    ["salt", "1.2"],
  ])("%s on the label: %s, as EuroFIR", (key, declared) => {
    expect(label(key, exact[key])).toBe(declared);
  });

  // 11.48 is below 11.5, half up gives 11 (guidance, section 6: "12 g ... between 12.4 g and 11.5 g").
  // EuroFIR rounds its printed 11.5 a second time.
  test("fat on the label: 11, where EuroFIR rounds twice to 12", () => {
    expect(label("fat", exact.fat)).toBe("11");
    expect(plain(round(decimal("11.5"), { scale: 0, mode: "halfAwayFromZero" }))).toBe("12");
  });

  test("energy from the exact values: 1079 kJ / 257 kcal", () => {
    expect(plain(energy.kJ)).toBe("1078.754452054795");
    expect(plain(energy.kcal)).toBe("257.452625570776");
    expect(label("energyKJ", energy.kJ)).toBe("1079");
    expect(label("energyKcal", energy.kcal)).toBe("257");
  });

  // 37 × 12 + 17 × 32 + 17 × 5.8 + 8 × 2.1 = 1103.4; 9 × 12 + 4 × 32 + 4 × 5.8 + 2 × 2.1 = 263.4.
  test("their way, from their declared values: their 1103 kJ / 263 kcal", () => {
    expect(
      energyFromDeclared({ fat: "12", carbohydrate: "32", protein: "5.8", fibre: "2.1" }),
    ).toEqual({ kJ: "1103", kcal: "263" });
  });

  // 37 × 11 + 17 × 32 + 17 × 5.8 + 8 × 2.1 = 1066.4; with our fat of 11 the gap is the rounding of fat.
  test("their way, from our declared values: 1066 kJ / 254 kcal", () => {
    expect(
      energyFromDeclared({ fat: "11", carbohydrate: "32", protein: "5.8", fibre: "2.1" }),
    ).toEqual({ kJ: "1066", kcal: "254" });
  });
});

// getstorefleet.com, "EU nutrition declaration format", worked example of a biscuit per 100 g:
// "Calculate energy from the unrounded values, then round." 37 × 12.4 + 17 × 61.0 + 17 × 7.6 + 8 × 3.2
// = 1650.6 kJ; 9 × 12.4 + 4 × 61.0 + 4 × 7.6 + 2 × 3.2 = 392.4 kcal.
describe("Storefleet, biscuit: energy from the unrounded values, like us", () => {
  const { per100g } = calculateNutrition({
    ingredients: [
      {
        amount: 100,
        per100g: {
          fat: "12.4",
          saturates: "3.1",
          carbohydrate: "61.0",
          sugars: "24.7",
          fibre: "3.2",
          protein: "7.6",
          salt: "0.42",
        },
      },
    ],
  });

  test("energy 1651 kJ / 392 kcal", () => {
    expect(per100g.energy.kJ.rounded).toBe("1651");
    expect(per100g.energy.kcal.rounded).toBe("392");
  });

  test("their label", () => {
    expect({
      fat: per100g.fat.rounded,
      saturates: per100g.saturates.rounded,
      carbohydrate: per100g.carbohydrate.rounded,
      sugars: per100g.sugars.rounded,
      protein: per100g.protein.rounded,
      salt: per100g.salt.rounded,
    }).toEqual({
      fat: "12",
      saturates: "3.1",
      carbohydrate: "61",
      sugars: "25",
      protein: "7.6",
      salt: "0.42",
    });
  });
});

// etichettalo.it, "Nutrition declaration", grissini with olive oil and rosemary, per 100 g as
// declared: 1508 kJ / 358 kcal, fat 10, carbohydrate 57, fibre 2.0, protein 9.0. Only the rounded
// values are published; 37 × 10 + 17 × 57 + 17 × 9.0 + 8 × 2.0 = 1508.
describe("Etichettalo, grissini: only declared values published", () => {
  test("their way, from their declared values: their 1508 kJ / 358 kcal", () => {
    expect(
      energyFromDeclared({ fat: "10", carbohydrate: "57", protein: "9.0", fibre: "2.0" }),
    ).toEqual({ kJ: "1508", kcal: "358" });
  });
});
