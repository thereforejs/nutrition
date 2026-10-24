import { type Decimal, decimal, equals, multiply } from "@thereforejs/decy";
import { fail } from "../diagnostics/fail.ts";
import type { Ingredient } from "../types/index.ts";
import { toDecimal } from "./value.ts";

const SALT_PER_SODIUM = decimal("2.5");
const SODIUM_PER_SALT = decimal("0.4");

// Regulation (EU) No 1169/2011, Annex I No 11: salt = sodium × 2.5. Held as sodium, so salt and
// sodium in the result can never disagree.
export function sodiumOf(per100g: Ingredient["per100g"], at: string): Decimal {
  const { salt, sodium } = per100g;
  if (sodium == null) {
    if (salt == null) fail("value.missing", `${at}.salt`);
    return multiply(toDecimal(salt, `${at}.salt`), SODIUM_PER_SALT);
  }
  const value = toDecimal(sodium, `${at}.sodium`);
  if (salt != null && !equals(multiply(value, SALT_PER_SODIUM), toDecimal(salt, `${at}.salt`))) {
    fail("salt.sodiumMismatch", at, { salt: String(salt), sodium: String(sodium) });
  }
  return value;
}

export const saltOf = (sodium: Decimal) => multiply(sodium, SALT_PER_SODIUM);
