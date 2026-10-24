import type { Locale } from "./locale.ts";

/** Voluntary nutrients of Regulation (EU) No 1169/2011, Art. 30(2). */
export type Voluntary = "monounsaturates" | "polyunsaturates" | "polyols" | "starch" | "fibre";

export interface NutritionOptions {
  /** Imported locales, each adds its text. None: no text. */
  locales: Locale[];
  /** A negligible amount reads "<0,5 g" or "0 g"; Table 4 allows both. */
  negligible: "lessThan" | "zero";
  /** Voluntary nutrients to declare; the mandatory ones always are. */
  voluntary: Voluntary[];
}
