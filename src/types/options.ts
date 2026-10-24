import type { Locale } from "./locale.ts";

export type NegligibleAs = "auto" | "lessThan" | "zero";

/** Voluntary nutrients of Regulation (EU) No 1169/2011, Art. 30(2). */
export type Voluntary = "monounsaturates" | "polyunsaturates" | "polyols" | "starch" | "fibre";

export interface NutritionOptions {
  /** Imported locales, each adds its text. None: no text. */
  locales: Locale[];
  /**
   * A negligible amount reads "0 g" or "<0,5 g"; Table 4 allows both. "auto": "0 g" only when there
   * is none, otherwise "<x g".
   */
  negligible: NegligibleAs;
  /** Voluntary nutrients to declare; the mandatory ones always are. */
  voluntary: Voluntary[];
  /** Adds the percent of the reference intake (Art. 32(4)) and the statement of Art. 32(5). */
  referenceIntake: boolean;
}
