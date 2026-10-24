import { localeSymbols } from "@thereforejs/decy";
import { fail } from "../diagnostics/fail.ts";
import type { Label, Locale, NutritionOptions, Voluntary } from "../types/index.ts";

const defaults: NutritionOptions = { locales: [], negligible: "lessThan", voluntary: [] };

const NEGLIGIBLE: NutritionOptions["negligible"][] = ["lessThan", "zero"];
const VOLUNTARY: Voluntary[] = ["monounsaturates", "polyunsaturates", "polyols", "starch", "fibre"];
const LABELS: Record<Label, true> = {
  energy: true,
  fat: true,
  ofWhich: true,
  saturates: true,
  monounsaturates: true,
  polyunsaturates: true,
  carbohydrate: true,
  sugars: true,
  polyols: true,
  starch: true,
  fibre: true,
  protein: true,
  salt: true,
  sodium: true,
};

/** Defaults for what is not given (`undefined` included), then every option checked once. */
export function resolveOptions(options: Partial<NutritionOptions> = {}): NutritionOptions {
  const given = Object.fromEntries(
    Object.entries(options).filter(([, value]) => value !== undefined),
  );
  const resolved: NutritionOptions = { ...defaults, ...given };
  if (!NEGLIGIBLE.includes(resolved.negligible)) {
    fail("options.invalid", "options.negligible", { value: String(resolved.negligible) });
  }
  if (!Array.isArray(resolved.voluntary)) {
    fail("options.invalid", "options.voluntary", { value: String(resolved.voluntary) });
  }
  for (const key of resolved.voluntary) {
    if (!VOLUNTARY.includes(key)) {
      fail("options.invalid", "options.voluntary", { value: String(key) });
    }
  }
  if (!Array.isArray(resolved.locales)) {
    fail("options.invalid", "options.locales", { value: "not a list" });
  }
  resolved.locales.forEach((locale, index) => {
    if (!isLocale(locale))
      fail("options.invalid", `options.locales[${index}]`, { value: "not a locale" });
  });
  return resolved;
}

// Locales come from imports, but plain JavaScript can pass anything; decy would throw its own error.
function isLocale(locale: Locale): boolean {
  if (typeof locale?.locale !== "string" || typeof locale.labels !== "object") return false;
  try {
    localeSymbols(locale.locale);
  } catch {
    return false;
  }
  return Object.keys(LABELS).every((label) => typeof locale.labels?.[label as Label] === "string");
}
