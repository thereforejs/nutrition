import { add, type Decimal, decimal, multiply } from "@thereforejs/decy";
import type { Ingredient, NutrientKey, ReportEntry } from "../types/index.ts";
import { saltOf, sodiumOf } from "./salt.ts";
import { toDecimal } from "./value.ts";

const PER_GRAM = decimal("0.01");

export interface Totals<K extends NutrientKey> {
  /** The finished product: the sum of all amounts. */
  weight: Decimal;
  /** Grams of each nutrient in the whole product. */
  nutrients: Record<K, Decimal>;
  report: ReportEntry[];
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
  const unknown = new Map<K, number[]>();
  ingredients.forEach((ingredient, index) => {
    const at = `ingredients[${index}]`;
    const amount = toDecimal(ingredient.amount, `${at}.amount`);
    weight = add(weight, amount);
    for (const key of keys) {
      const value = valueOf(ingredient.per100g, key, `${at}.per100g`);
      if (value === null) unknown.set(key, [...(unknown.get(key) ?? []), index]);
      else nutrients[key] = add(nutrients[key], multiply(multiply(amount, value), PER_GRAM));
    }
  });
  const report = keys
    .filter((key) => unknown.has(key))
    .map((key) => ({
      code: "value.missing" as const,
      nutrient: key,
      ingredients: unknown.get(key) ?? [],
    }));
  return { weight, nutrients, report };
}

// SPEC 3.2: a missing key is 0, `null` is unknown and calculated without.
function valueOf(per100g: Ingredient["per100g"], key: NutrientKey, at: string): Decimal | null {
  if (key === "sodium") return sodiumOf(per100g, at);
  if (key === "salt") {
    const sodium = sodiumOf(per100g, at);
    return sodium && saltOf(sodium);
  }
  const value = per100g[key];
  if (value === undefined) return decimal("0");
  return value === null ? null : toDecimal(value, `${at}.${key}`);
}
