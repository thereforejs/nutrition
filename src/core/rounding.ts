import { compare, type Decimal, decimal, round } from "@thereforejs/decy";

interface Band {
  /** From this amount on (≥), round to `upperScale` decimals. */
  upper: Decimal;
  upperScale: number;
  /** Above `negligible`, round to `scale` decimals; at or below it the amount is negligible. */
  scale: number;
  negligible: Decimal;
}

const band = (upper: string, upperScale: number, scale: number, negligible: string): Band => ({
  upper: decimal(upper),
  upperScale,
  scale,
  negligible: decimal(negligible),
});

const MACRO = band("10", 0, 1, "0.5");
const FATTY_ACIDS = band("10", 0, 1, "0.1");

// Commission guidance on tolerances, December 2012, section 6, Table 4.
const TABLE_4 = {
  fat: MACRO,
  carbohydrate: MACRO,
  sugars: MACRO,
  protein: MACRO,
  fibre: MACRO,
  polyols: MACRO,
  starch: MACRO,
  saturates: FATTY_ACIDS,
  monounsaturates: FATTY_ACIDS,
  polyunsaturates: FATTY_ACIDS,
  sodium: band("1", 1, 2, "0.005"),
  salt: band("1", 1, 2, "0.0125"),
};

export type Declared = keyof typeof TABLE_4 | "energyKJ" | "energyKcal";

/** The declared value. The step follows the amount itself, half up (guidance: 12 g is 11.5 to 12.4). */
export function roundOf(key: Declared, value: Decimal): { rounded: Decimal; negligible: boolean } {
  const half = { mode: "halfAwayFromZero" } as const;
  if (key === "energyKJ" || key === "energyKcal") {
    return { rounded: round(value, { scale: 0, ...half }), negligible: false };
  }
  const { upper, upperScale, scale, negligible } = TABLE_4[key];
  if (compare(value, upper) >= 0) {
    return { rounded: round(value, { scale: upperScale, ...half }), negligible: false };
  }
  if (compare(value, negligible) > 0) {
    return { rounded: round(value, { scale, ...half }), negligible: false };
  }
  return { rounded: decimal("0"), negligible: true };
}
