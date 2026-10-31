import { compare, type Decimal, decimal, isZero, round } from "@thereforejs/decy";
import type { NegligibleAs } from "../types/index.ts";

interface Band {
  /** From this amount on (≥), round to `upperScale` decimals. */
  upper: Decimal;
  upperScale: number;
  /** Above `negligible`, round to `scale` decimals; at or below it the amount is negligible. */
  scale: number;
  negligible: Decimal;
  /** The x of "<x g" that Table 4 allows for a negligible amount. */
  lessThan: Decimal;
}

const band = (
  upper: string,
  upperScale: number,
  scale: number,
  negligible: string,
  lessThan = negligible,
): Band => ({
  upper: decimal(upper),
  upperScale,
  scale,
  negligible: decimal(negligible),
  lessThan: decimal(lessThan),
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
  salt: band("1", 1, 2, "0.0125", "0.01"),
};

export type Declared = keyof typeof TABLE_4 | "energyKJ" | "energyKcal";

export interface Rounded {
  rounded: Decimal;
  /** At or below the threshold of Table 4. */
  negligible: boolean;
  /** `rounded` is an upper bound: the label reads "<0,5 g". */
  atMost: boolean;
}

/**
 * The declared value. The step follows the amount itself, half up (guidance: 12 g is 11.5 to 12.4).
 * A negligible amount may read "0 g" or "<x g" (Table 4); by default "0 g" only when there is none,
 * as common practice does (SPEC 4.4).
 */
export function roundOf(
  key: Declared,
  value: Decimal,
  negligibleAs: NegligibleAs = "auto",
): Rounded {
  const half = { mode: "halfAwayFromZero" } as const;
  const declared = (rounded: Decimal) => ({ rounded, negligible: false, atMost: false });
  if (key === "energyKJ" || key === "energyKcal")
    return declared(round(value, { scale: 0, ...half }));
  const { upper, upperScale, scale, negligible, lessThan } = TABLE_4[key];
  if (compare(value, upper) >= 0) return declared(round(value, { scale: upperScale, ...half }));
  if (compare(value, negligible) > 0) return declared(round(value, { scale, ...half }));
  const atMost = negligibleAs === "lessThan" || (negligibleAs === "auto" && !isZero(value));
  return { rounded: atMost ? lessThan : decimal("0"), negligible: true, atMost };
}
