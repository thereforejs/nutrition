import { type Decimal, decimal, isZero, toDecimalString } from "@thereforejs/decy";
import { ENERGY_KEYS } from "../core/energy.ts";
import { resolveOptions } from "../core/options.ts";
import { referenceIntakeOf } from "../core/reference.ts";
import { type Declared, roundOf } from "../core/rounding.ts";
import { saltOf } from "../core/salt.ts";
import { shareOf } from "../core/share.ts";
import { sumNutrients, type Totals } from "../core/sum.ts";
import { isRecord, toDecimal } from "../core/value.ts";
import { fail } from "../diagnostics/fail.ts";
import type {
  Declaration,
  DeclaredValue,
  Locale,
  NutrientKey,
  NutritionInput,
  NutritionOptions,
  NutritionResult,
} from "../types/index.ts";
import { percentText, textOf } from "./text.ts";

// Regulation (EU) No 1169/2011, Annex XV: the order of the declaration. Mandatory: Art. 30(1).
const ANNEX_XV = [
  "fat",
  "saturates",
  "monounsaturates",
  "polyunsaturates",
  "carbohydrate",
  "sugars",
  "polyols",
  "starch",
  "fibre",
  "protein",
  "salt",
] as const;
const MANDATORY = new Set<NutrientKey>([
  "fat",
  "saturates",
  "carbohydrate",
  "sugars",
  "protein",
  "salt",
]);

/** The nutrition declaration per 100 g, and per piece when a piece weight is given. */
export function calculateNutrition(
  input: NutritionInput,
  options: Partial<NutritionOptions> = {},
): NutritionResult {
  if (!isRecord(input)) fail("input.invalid", "input");
  const resolved = resolveOptions(options);
  const voluntary = new Set<NutrientKey>(resolved.voluntary);
  const keys = [
    ...ANNEX_XV.filter((key) => MANDATORY.has(key) || voluntary.has(key)),
    "sodium" as const,
  ];
  const totals = sumNutrients(input.ingredients, [...new Set([...keys, ...ENERGY_KEYS])]);
  const per100g = declare(totals, decimal("100"), keys, resolved);
  const statement = resolved.referenceIntake
    ? { referenceIntakeStatement: localized(resolved, (locale) => locale.labels.referenceIntake) }
    : {};
  if (input.pieceWeight === undefined) return { per100g, report: totals.report, ...statement };
  const piece = toDecimal(input.pieceWeight, "pieceWeight");
  if (isZero(piece)) fail("pieceWeight.zero", "pieceWeight");
  const perPiece = declare(totals, piece, keys, resolved);
  return { per100g, perPiece, report: totals.report, ...statement };
}

// Per piece comes from the exact sums like per 100 g, never from rounded values per 100 g.
function declare(
  totals: Totals<NutrientKey>,
  grams: Decimal,
  keys: (Declared & NutrientKey)[],
  options: NutritionOptions,
): Declaration {
  const { nutrients: values, energy } = shareOf(totals, grams);
  // Salt from the sodium share, so both fall on the same side of every Table 4 threshold.
  values.salt = saltOf(values.sodium);
  const entry = (key: Declared, value: Decimal): DeclaredValue => {
    const result = roundOf(key, value, options.negligible);
    const declared: DeclaredValue = {
      exact: exactText(value),
      rounded: toDecimalString(result.rounded),
      negligible: result.negligible,
      atMost: result.atMost,
      text: localized(options, (locale) => textOf(key, result, locale)),
    };
    const percent = options.referenceIntake ? referenceIntakeOf(key, value) : undefined;
    if (!percent) return declared;
    return {
      ...declared,
      referenceIntake: {
        exact: exactText(percent.exact),
        rounded: toDecimalString(percent.rounded),
        text: localized(options, (locale) => percentText(percent.rounded, locale)),
      },
    };
  };
  const nutrients = Object.fromEntries(keys.map((key) => [key, entry(key, values[key])]));
  return {
    energy: { kJ: entry("energyKJ", energy.kJ), kcal: entry("energyKcal", energy.kcal) },
    ...nutrients,
  } as Declaration;
}

const localized = (options: NutritionOptions, text: (locale: Locale) => string) =>
  Object.fromEntries(options.locales.map((locale) => [locale.locale, text(locale)]));

const exactText = (value: Decimal) =>
  toDecimalString(value)
    .replace(/(\.\d*?)0+$/, "$1")
    .replace(/\.$/, "");
