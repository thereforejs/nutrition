import type { Value } from "./input.ts";
import type { Ingredient } from "./input.ts";
import type { Voluntary } from "./options.ts";
import type { ReportEntry } from "./report.ts";

export interface NutritionInput {
  ingredients: Ingredient[];
  /** Grams of one piece; adds `perPiece` to the result. */
  pieceWeight?: Value;
}

export interface DeclaredValue {
  /** 12 decimals at most, trailing zeros dropped. */
  exact: string;
  /** By Table 4, with the decimals of its step ("10.0"). */
  rounded: string;
  /** At or below the threshold of Table 4. */
  negligible: boolean;
  /** Per imported locale, e.g. { "de-DE": "10,0 g" }. */
  text: Record<string, string>;
}

type Mandatory = "fat" | "saturates" | "carbohydrate" | "sugars" | "protein" | "salt" | "sodium";

export type Declaration = { energy: { kJ: DeclaredValue; kcal: DeclaredValue } } & Record<
  Mandatory,
  DeclaredValue
> &
  Partial<Record<Voluntary, DeclaredValue>>;

export interface NutritionResult {
  per100g: Declaration;
  perPiece?: Declaration;
  report: ReportEntry[];
}
