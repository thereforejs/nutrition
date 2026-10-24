import { add, type Decimal, decimal, isZero, multiply, round } from "@thereforejs/decy";
import { fail } from "../diagnostics/fail.ts";
import type { Ingredient, NutrientKey, ReportEntry } from "../types/index.ts";
import { ENERGY_KEYS, type EnergyKey, energyOf } from "./energy.ts";
import { checkPossible } from "./possible.ts";
import { saltOf, sodiumOf } from "./salt.ts";
import { CALCULATION, toDecimal } from "./value.ts";

const PER_GRAM = decimal("0.01");

export interface Totals<K extends NutrientKey> {
  /** The finished product: the sum of all amounts. */
  weight: Decimal;
  /** Grams of each nutrient in the whole product. */
  nutrients: Record<K, Decimal>;
  /** Energy of the whole product, summed per ingredient. */
  energy: { kJ: Decimal; kcal: Decimal };
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
  let energy = { kJ: decimal("0"), kcal: decimal("0") };
  const unknown = new Map<K, number[]>();
  // Plain JavaScript or JSON can pass anything; a foreign TypeError would name nothing.
  if (!Array.isArray(ingredients)) fail("input.invalid", "ingredients");
  ingredients.forEach((ingredient, index) => {
    const at = `ingredients[${index}]`;
    if (typeof ingredient !== "object" || ingredient === null) fail("input.invalid", at);
    if (typeof ingredient.per100g !== "object" || ingredient.per100g === null) {
      fail("input.invalid", `${at}.per100g`);
    }
    const amount = toDecimal(ingredient.amount, `${at}.amount`);
    const grams = (value: Decimal) => multiply(multiply(amount, value), PER_GRAM);
    weight = add(weight, amount);
    checkPossible(ingredient.per100g, `${at}.per100g`);
    for (const key of keys) {
      const value = valueOf(ingredient.per100g, key, `${at}.per100g`);
      // An ingredient of 0 g leaves nothing out, so its unknowns are not reported.
      if (value === null) {
        if (!isZero(amount)) unknown.set(key, [...(unknown.get(key) ?? []), index]);
      } else nutrients[key] = add(nutrients[key], grams(value));
    }
    const parts = Object.fromEntries(
      ENERGY_KEYS.map((key) => [key, valueOf(ingredient.per100g, key, `${at}.per100g`)]),
    ) as Record<EnergyKey, Decimal | null>;
    const own = energyOf(parts);
    energy = { kJ: add(energy.kJ, grams(own.kJ)), kcal: add(energy.kcal, grams(own.kcal)) };
  });
  // Salt is sodium × 2.5 of the sodium total (Annex I No 11): summed as sodium above.
  const all: Partial<Record<NutrientKey, Decimal>> = nutrients;
  if (all.salt) all.salt = saltOf(all.salt);
  // Sums stay exact; only the totals go back to 12 decimals, because per piece multiplies them
  // again by a weight of up to 12 decimals and decy holds 30.
  for (const key of keys) nutrients[key] = round(nutrients[key], CALCULATION);
  energy = { kJ: round(energy.kJ, CALCULATION), kcal: round(energy.kcal, CALCULATION) };
  const report = keys
    .filter((key) => unknown.has(key))
    .map((key) => ({
      code: "value.missing" as const,
      nutrient: key,
      ingredients: unknown.get(key) ?? [],
    }));
  return { weight, nutrients, energy, report };
}

// SPEC 3.2: a missing key is 0, `null` is unknown and calculated without. Salt is summed as sodium.
function valueOf(per100g: Ingredient["per100g"], key: NutrientKey, at: string): Decimal | null {
  if (key === "sodium" || key === "salt") return sodiumOf(per100g, at);
  const value = per100g[key];
  if (value === undefined) return decimal("0");
  return value === null ? null : toDecimal(value, `${at}.${key}`);
}
