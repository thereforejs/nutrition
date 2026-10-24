import { fail } from "../diagnostics/fail.ts";
import type { NutritionOptions, Voluntary } from "../types/index.ts";

const defaults: NutritionOptions = { locales: [], negligible: "lessThan", voluntary: [] };

const NEGLIGIBLE: NutritionOptions["negligible"][] = ["lessThan", "zero"];
const VOLUNTARY: Voluntary[] = ["monounsaturates", "polyunsaturates", "polyols", "starch", "fibre"];

export function resolveOptions(options: Partial<NutritionOptions> = {}): NutritionOptions {
  const resolved = { ...defaults, ...options };
  if (!NEGLIGIBLE.includes(resolved.negligible)) {
    fail("options.invalid", "options.negligible", { value: String(resolved.negligible) });
  }
  for (const key of resolved.voluntary) {
    if (!VOLUNTARY.includes(key))
      fail("options.invalid", "options.voluntary", { value: String(key) });
  }
  return resolved;
}
