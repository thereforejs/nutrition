import { type Decimal, format } from "@thereforejs/decy";
import { type Declared, lessThanOf } from "../core/rounding.ts";
import type { Locale } from "../types/index.ts";

// Number and unit stay on one line.
const NBSP = " ";

/** "36 %" for a percentage of the reference intake. */
export const percentText = (rounded: Decimal, locale: Locale) =>
  `${format(rounded, locale.locale, { useGrouping: false })}${NBSP}%`;

/** "10,0 g", "1431 kJ", or for a negligible amount "0 g" or "<0,5 g" (Table 4). */
export function textOf(
  key: Declared,
  { rounded, negligible }: { rounded: Decimal; negligible: boolean },
  locale: Locale,
  negligibleAs: "zero" | "lessThan",
): string {
  const number = (value: Decimal) => format(value, locale.locale, { useGrouping: false });
  if (key === "energyKJ") return `${number(rounded)}${NBSP}kJ`;
  if (key === "energyKcal") return `${number(rounded)}${NBSP}kcal`;
  if (negligible && negligibleAs === "lessThan") return `<${number(lessThanOf(key))}${NBSP}g`;
  return `${number(rounded)}${NBSP}g`;
}
