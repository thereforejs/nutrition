import { decimal, type Decimal, fromNumber, isNegative, round } from "@thereforejs/decy";
import { fail } from "../diagnostics/fail.ts";

// 12 decimals keep every product of the calculation within decy's 30, and the output rounding
// (at most 3 decimals) can never see what lies beyond them.
const SCALE = 12;

/** The input boundary: every amount and nutrient value passes here, and nothing is read as 0. */
export function toDecimal(input: number | string, path: string): Decimal {
  let value: Decimal | undefined;
  try {
    value = read(input);
  } catch {
    // decy refuses NaN, Infinity and anything that is not plain decimal text
  }
  if (!value || isNegative(value)) fail("value.invalid", path, { value: String(input) });
  return round(value, { scale: SCALE, mode: "halfAwayFromZero" });
}

function read(input: unknown): Decimal | undefined {
  // Half up to 12 decimals depends only on the 13th; the rest could exceed decy's 30.
  if (typeof input === "string") return decimal(input.replace(/(\.\d{13})\d+$/, "$1"));
  // A number below 1e-13 rounds to 0, and its shortest text (5e-324) can exceed decy's 30.
  if (typeof input === "number") return fromNumber(input >= 0 && input < 1e-13 ? 0 : input);
  return undefined;
}
