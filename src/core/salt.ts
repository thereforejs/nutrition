import { type Decimal, decimal, equals, multiply, round } from "@thereforejs/decy";
import { fail } from "../diagnostics/fail.ts";
import type { Ingredient } from "../types/index.ts";
import { CALCULATION, toDecimal } from "./value.ts";

const SALT_PER_SODIUM = decimal("2.5");
const SODIUM_PER_SALT = decimal("0.4");

// Regulation (EU) No 1169/2011, Annex I No 11: salt = sodium × 2.5. Every ingredient is held as
// sodium; salt is derived only at the end, from sodium. `null` is unknown (SPEC 3.2).
export function sodiumOf(per100g: Ingredient["per100g"], at: string): Decimal | null {
  const { salt, sodium } = per100g;
  if (sodium == null) {
    if (salt != null) return multiply(toDecimal(salt, `${at}.salt`), SODIUM_PER_SALT);
    return salt === null || sodium === null ? null : decimal("0");
  }
  const value = toDecimal(sodium, `${at}.sodium`);
  // Compared at the 12 decimals every input is read with: 1e-12 g sodium is 2.5e-12 g salt.
  if (salt != null && !equals(round(saltOf(value), CALCULATION), toDecimal(salt, `${at}.salt`))) {
    fail("salt.sodiumMismatch", at, { salt: String(salt), sodium: String(sodium) });
  }
  return value;
}

export const saltOf = (sodium: Decimal) => multiply(sodium, SALT_PER_SODIUM);
