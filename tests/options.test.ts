import { describe, expect, test } from "vite-plus/test";
import { calculateNutrition, type Ingredient } from "../src/index.ts";
import { de } from "../src/locales/index.ts";
import { diagnosticOf } from "./helpers/diagnostic.ts";

describe("options are checked, never a foreign error", () => {
  const ingredients: Ingredient[] = [{ amount: 100, per100g: { fat: 1 } }];

  test("an option given as undefined takes its default", () => {
    const result = calculateNutrition(
      { ingredients },
      { voluntary: undefined, locales: undefined, negligible: undefined },
    );
    expect(result.per100g.fat.text).toEqual({});
  });

  test.each<[string, unknown, string]>([
    ["options that are null", null, "options"],
    ["options that are a list", ["fibre"], "options"],
    ["voluntary not a list", { voluntary: "fibre" }, "options.voluntary"],
    ["locales not a list", { locales: de }, "options.locales"],
    [
      "a locale without a valid tag",
      { locales: [{ ...de, locale: "xx_bad" }] },
      "options.locales[0]",
    ],
    ["a locale without labels", { locales: [{ locale: "de-DE" }] }, "options.locales[0]"],
    [
      "a locale missing one label",
      { locales: [{ ...de, labels: { ...de.labels, salt: undefined } }] },
      "options.locales[0]",
    ],
  ])("%s", (_, options, path) => {
    expect(diagnosticOf(() => calculateNutrition({ ingredients }, options as never))).toMatchObject(
      {
        code: "options.invalid",
        path,
      },
    );
  });
});
