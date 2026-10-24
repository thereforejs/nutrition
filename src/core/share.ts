import { type Decimal, divide, isZero, multiply } from "@thereforejs/decy";
import { fail } from "../diagnostics/fail.ts";
import type { NutrientKey } from "../types/index.ts";
import type { Totals } from "./sum.ts";
import { CALCULATION } from "./value.ts";

/** The nutrients in `grams` of the product: per 100 g, or per piece. 12 decimals, like the input. */
export function shareOf<K extends NutrientKey>(
  totals: Totals<K>,
  grams: Decimal,
): Record<K, Decimal> {
  if (isZero(totals.weight)) fail("weight.zero", "ingredients");
  const entries = Object.entries<Decimal>(totals.nutrients).map(([key, total]) => [
    key,
    divide(multiply(total, grams), totals.weight, CALCULATION),
  ]);
  return Object.fromEntries(entries) as Record<K, Decimal>;
}
