import { type Decimal, toDecimalString } from "@thereforejs/decy";
import { describe, expect, test } from "vite-plus/test";
import { sumNutrients, type Totals } from "../src/core/sum.ts";
import type { Ingredient, NutrientKey } from "../src/index.ts";
import { diagnosticOf } from "./helpers/diagnostic.ts";

const flour: Ingredient = { amount: 1000, per100g: { fat: "1.2", protein: 10 } };
const water: Ingredient = { amount: "600", per100g: { fat: 0, protein: 0 } };

// decy keeps the scale of a product (1000 × 1.2 × 0.01 is "12.000"); compare by value.
const plain = (value: Decimal) =>
  toDecimalString(value)
    .replace(/(\.\d*?)0+$/, "$1")
    .replace(/\.$/, "");

const text = <K extends NutrientKey>(totals: Totals<K>) => ({
  weight: plain(totals.weight),
  nutrients: Object.fromEntries(
    Object.entries<Decimal>(totals.nutrients).map(([key, value]) => [key, plain(value)]),
  ),
});

describe("every ingredient adds amount × value / 100 (Art. 31(4)(b))", () => {
  test("flour and water", () => {
    expect(text(sumNutrients([flour, water], ["fat", "protein"]))).toEqual({
      weight: "1600",
      nutrients: { fat: "12", protein: "100" },
    });
  });

  test("exact where floating point is not: 0.1 g and 0.2 g of fat per 100 g", () => {
    const totals = sumNutrients(
      [
        { amount: 100, per100g: { fat: 0.1 } },
        { amount: 100, per100g: { fat: 0.2 } },
      ],
      ["fat"],
    );
    expect(text(totals).nutrients.fat).toBe("0.3");
  });

  test("only the requested nutrients", () => {
    expect(Object.keys(sumNutrients([flour], ["fat"]).nutrients)).toEqual(["fat"]);
  });
});

describe("a requested value missing in any ingredient refuses the result", () => {
  test("missing in the second ingredient", () => {
    expect(
      diagnosticOf(() =>
        sumNutrients([flour, { amount: 600, per100g: { fat: 0 } }], ["fat", "protein"]),
      ),
    ).toMatchObject({
      code: "value.missing",
      level: "error",
      path: "ingredients[1].per100g.protein",
    });
  });

  test("null is missing, never 0", () => {
    expect(
      diagnosticOf(() => sumNutrients([{ amount: 1, per100g: { fat: null } }], ["fat"])),
    ).toMatchObject({ code: "value.missing", path: "ingredients[0].per100g.fat" });
  });

  test("an invalid amount names its ingredient", () => {
    expect(
      diagnosticOf(() => sumNutrients([flour, { ...water, amount: -1 }], ["fat"])),
    ).toMatchObject({ code: "value.invalid", path: "ingredients[1].amount" });
  });

  test("an invalid value names its nutrient", () => {
    expect(
      diagnosticOf(() => sumNutrients([{ amount: 1, per100g: { fat: "1,2" } }], ["fat"])),
    ).toMatchObject({ code: "value.invalid", path: "ingredients[0].per100g.fat" });
  });
});
