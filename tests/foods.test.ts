import * as foods from "@thereforejs/foods";
import type { Food } from "@thereforejs/foods";
import { describe, expect, expectTypeOf, test } from "vite-plus/test";
import { calculateNutrition, type Ingredient } from "../src/index.ts";

const all: Food[] = Object.values(foods);

// SPEC 8: `per100g` of @thereforejs/foods goes in as it is.
describe("@thereforejs/foods", () => {
  test("its per100g is an ingredient's per100g", () => {
    expectTypeOf<Food["per100g"]>().toExtend<Ingredient["per100g"]>();
  });

  test("every food calculates without an error", () => {
    expect(all.length).toBeGreaterThan(7000);
    const failed = all.filter((food) => {
      try {
        calculateNutrition({ ingredients: [{ amount: 100, per100g: food.per100g }] });
        return false;
      } catch {
        return true;
      }
    });
    expect(failed.map((food) => food.code)).toEqual([]);
  });
});
