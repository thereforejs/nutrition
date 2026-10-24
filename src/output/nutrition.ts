import { type Decimal, decimal, isZero, toDecimalString } from "@thereforejs/decy";
import { ENERGY_KEYS, energyOf } from "../core/energy.ts";
import { resolveOptions } from "../core/options.ts";
import { type Declared, roundOf } from "../core/rounding.ts";
import { shareOf } from "../core/share.ts";
import { sumNutrients, type Totals } from "../core/sum.ts";
import { toDecimal } from "../core/value.ts";
import { fail } from "../diagnostics/fail.ts";
import type {
  Declaration,
  DeclaredValue,
  NutrientKey,
  NutritionInput,
  NutritionOptions,
  NutritionResult,
} from "../types/index.ts";
import { textOf } from "./text.ts";

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
  const resolved = resolveOptions(options);
  const voluntary = new Set<NutrientKey>(resolved.voluntary);
  const keys = [
    ...ANNEX_XV.filter((key) => MANDATORY.has(key) || voluntary.has(key)),
    "sodium" as const,
  ];
  const totals = sumNutrients(input.ingredients, [...new Set([...keys, ...ENERGY_KEYS])]);
  const per100g = declare(totals, decimal("100"), keys, resolved);
  if (input.pieceWeight === undefined) return { per100g, report: totals.report };
  const piece = toDecimal(input.pieceWeight, "pieceWeight");
  if (isZero(piece)) fail("pieceWeight.zero", "pieceWeight");
  return { per100g, perPiece: declare(totals, piece, keys, resolved), report: totals.report };
}

// Per piece comes from the exact sums like per 100 g, never from rounded values per 100 g.
function declare(
  totals: Totals<NutrientKey>,
  grams: Decimal,
  keys: (Declared & NutrientKey)[],
  options: NutritionOptions,
): Declaration {
  const values = shareOf(totals, grams);
  const { kJ, kcal } = energyOf(values);
  const entry = (key: Declared, value: Decimal): DeclaredValue => {
    const result = roundOf(key, value);
    return {
      exact: exactText(value),
      rounded: toDecimalString(result.rounded),
      negligible: result.negligible,
      text: Object.fromEntries(
        options.locales.map((locale) => [
          locale.locale,
          textOf(key, result, locale, options.negligible),
        ]),
      ),
    };
  };
  const nutrients = Object.fromEntries(keys.map((key) => [key, entry(key, values[key])]));
  return {
    energy: { kJ: entry("energyKJ", kJ), kcal: entry("energyKcal", kcal) },
    ...nutrients,
  } as Declaration;
}

const exactText = (value: Decimal) =>
  toDecimalString(value)
    .replace(/(\.\d*?)0+$/, "$1")
    .replace(/\.$/, "");
