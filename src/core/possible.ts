import { compare, decimal } from "@thereforejs/decy";
import { fail } from "../diagnostics/fail.ts";
import type { Ingredient, NutrientKey } from "../types/index.ts";
import { toDecimal } from "./value.ts";

// Annex I No 7, 8, 9: carbohydrate includes sugars, starch and polyols; erythritol is a polyol.
// Annex I No 2: fat means total lipids. Only single parts: a sum of parts rounded by Table 4 may
// exceed its rounded whole (3.35 + 3.35 + 3.25 of 9.95 g fat reads 3.4 + 3.4 + 3.3 of 10.0).
const PARTS: [part: NutrientKey, whole: NutrientKey][] = [
  ["sugars", "carbohydrate"],
  ["starch", "carbohydrate"],
  ["polyols", "carbohydrate"],
  ["erythritol", "polyols"],
  ["saturates", "fat"],
  ["monounsaturates", "fat"],
  ["polyunsaturates", "fat"],
  ["salatrims", "fat"],
];

const HUNDRED = decimal("100");
const SALT_LIMIT = decimal("250");

/** Refuses what cannot be (SPEC 3.2). Whether a possible value is right is the caller's word. */
export function checkPossible(per100g: Ingredient["per100g"], at: string) {
  for (const [key, value] of Object.entries(per100g)) {
    if (value == null) continue;
    // Salt is sodium × 2.5, an equivalent, not a mass: solid sodium hydroxide has 143.75 g. Its
    // limit is 100 g of sodium.
    const limit = key === "salt" ? SALT_LIMIT : HUNDRED;
    if (compare(toDecimal(value, `${at}.${key}`), limit) > 0)
      fail("value.above100", `${at}.${key}`);
  }
  for (const [part, whole] of PARTS) {
    const partValue = per100g[part];
    const wholeValue = per100g[whole];
    if (partValue == null || wholeValue === null) continue;
    const limit = wholeValue === undefined ? decimal("0") : toDecimal(wholeValue, `${at}.${whole}`);
    if (compare(toDecimal(partValue, `${at}.${part}`), limit) > 0) {
      fail("value.partExceedsWhole", `${at}.${part}`, { part, whole });
    }
  }
}
