import { add, type Decimal, decimal, multiply } from "@thereforejs/decy";
import { fail } from "../diagnostics/fail.ts";
import type { Ingredient, NutrientKey } from "../types/index.ts";
import { toDecimal } from "./value.ts";

const PER_GRAM = decimal("0.01");

export interface Totals<K extends NutrientKey> {
  /** The finished product: the sum of all amounts. */
  weight: Decimal;
  /** Grams of each nutrient in the whole product. */
  nutrients: Record<K, Decimal>;
}

// Regulation (EU) No 1169/2011, Art. 31(4)(b): calculated from the values of the ingredients.
export function sumNutrients<K extends NutrientKey>(
  ingredients: Ingredient[],
  keys: readonly K[],
): Totals<K> {
  let weight = decimal("0");
  const nutrients = Object.fromEntries(keys.map((key) => [key, decimal("0")])) as Record<
    K,
    Decimal
  >;
  ingredients.forEach((ingredient, index) => {
    const at = `ingredients[${index}]`;
    const amount = toDecimal(ingredient.amount, `${at}.amount`);
    weight = add(weight, amount);
    for (const key of keys) {
      const value = ingredient.per100g[key];
      if (value == null) fail("value.missing", `${at}.per100g.${key}`);
      const grams = multiply(multiply(amount, toDecimal(value, `${at}.per100g.${key}`)), PER_GRAM);
      nutrients[key] = add(nutrients[key], grams);
    }
  });
  return { weight, nutrients };
}
