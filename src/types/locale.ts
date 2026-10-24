export type Label =
  | "energy"
  | "fat"
  | "ofWhich"
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
  | "sodium"
  /** The statement of Art. 32(5) next to percentages of reference intakes. */
  | "referenceIntake";

export interface Locale {
  /** BCP 47 tag for the number format, e.g. "de-DE". */
  locale: string;
  labels: Record<Label, string>;
}
