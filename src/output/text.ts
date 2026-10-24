import { type Decimal, format } from "@thereforejs/decy";
import type { Declared, Rounded } from "../core/rounding.ts";
import type { Locale } from "../types/index.ts";

// Number and unit stay on one line.
const NBSP = "\u00a0";

const number = (value: Decimal, locale: Locale) =>
  format(value, locale.locale, { useGrouping: false });

/** "36 %" for a percentage of the reference intake. */
export const percentText = (rounded: Decimal, locale: Locale) =>
  `${number(rounded, locale)}${NBSP}%`;

/** "10,0 g", "1431 kJ", "0 g", or "<0,5 g" for an amount that is at most the threshold. */
export function textOf(key: Declared, { rounded, atMost }: Rounded, locale: Locale): string {
  const unit = key === "energyKJ" ? "kJ" : key === "energyKcal" ? "kcal" : "g";
  return `${atMost ? "<" : ""}${number(rounded, locale)}${NBSP}${unit}`;
}
