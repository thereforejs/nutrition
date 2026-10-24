/** Names as in the English text of Regulation (EU) No 1169/2011, Art. 30. */
export type NutrientKey =
  | "fat"
  | "saturates"
  | "monounsaturates"
  | "polyunsaturates"
  | "carbohydrate"
  | "sugars"
  | "polyols"
  | "starch"
  | "fibre"
  | "protein"
  | "salt"
  | "sodium";

/** A number or plain decimal text ("1.2"), read exactly. */
export type Value = number | string;

export interface Ingredient {
  /** Grams as they end up in the finished product. */
  amount: Value;
  /** Grams per 100 g. `null` or a missing key is unknown, never 0. */
  per100g: Partial<Record<NutrientKey, Value | null>>;
}
