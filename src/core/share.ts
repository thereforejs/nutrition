import { type Decimal, divide, isZero, multiply } from "@thereforejs/decy";
import { fail } from "../diagnostics/fail.ts";
import type { NutrientKey } from "../types/index.ts";
import type { Totals } from "./sum.ts";
import { CALCULATION } from "./value.ts";

/** What `grams` of the product hold: per 100 g, or per piece. 12 decimals, like the input. */
export function shareOf<K extends NutrientKey>(
  totals: Totals<K>,
  grams: Decimal,
): { nutrients: Record<K, Decimal>; energy: { kJ: Decimal; kcal: Decimal } } {
  if (isZero(totals.weight)) fail("weight.zero", "ingredients");
  const part = (total: Decimal) => divide(multiply(total, grams), totals.weight, CALCULATION);
  const entries = Object.entries<Decimal>(totals.nutrients).map(([key, total]) => [
    key,
    part(total),
  ]);
  return {
    nutrients: Object.fromEntries(entries) as Record<K, Decimal>,
    energy: { kJ: part(totals.energy.kJ), kcal: part(totals.energy.kcal) },
  };
}
