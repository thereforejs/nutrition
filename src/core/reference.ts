import { type Decimal, decimal, divide, multiply, round } from "@thereforejs/decy";
import type { Declared } from "./rounding.ts";
import { CALCULATION } from "./value.ts";

// Regulation (EU) No 1169/2011, Annex XIII Part B (unchanged in the consolidated text of 1.4.2025).
// Only these may be expressed as a percentage (Art. 32(4); Commission Q&A 2018/C 196/01, 3.3.4).
const ANNEX_XIII_B: Partial<Record<Declared, Decimal>> = {
  energyKJ: decimal("8400"),
  energyKcal: decimal("2000"),
  fat: decimal("70"),
  saturates: decimal("20"),
  carbohydrate: decimal("260"),
  sugars: decimal("90"),
  protein: decimal("50"),
  salt: decimal("6"),
};

const HUNDRED = decimal("100");

/**
 * Percent of the reference intake, from the exact value. The law sets no rounding; whole percent half
 * up was decided with the baker (SPEC 4.5): rather one percent more than one less.
 */
export function referenceIntakeOf(
  key: Declared,
  value: Decimal,
): { exact: Decimal; rounded: Decimal } | undefined {
  const intake = ANNEX_XIII_B[key];
  if (!intake) return undefined;
  const exact = divide(multiply(value, HUNDRED), intake, CALCULATION);
  return { exact, rounded: round(exact, { scale: 0, mode: CALCULATION.mode }) };
}
