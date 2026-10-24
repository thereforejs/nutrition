import { decimal, type Decimal, fromNumber, isNegative } from "@thereforejs/decy";
import { fail } from "../diagnostics/fail.ts";

/** The input boundary: every amount and nutrient value passes here, and nothing is read as 0. */
export function toDecimal(input: number | string, path: string): Decimal {
  let value: Decimal | undefined;
  try {
    if (typeof input === "number") value = fromNumber(input);
    else if (typeof input === "string") value = decimal(input);
  } catch {
    // decy refuses NaN, Infinity and anything that is not plain decimal text
  }
  if (!value || isNegative(value)) fail("value.invalid", path, { value: String(input) });
  return value;
}
