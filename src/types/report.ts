import type { DiagnosticCode } from "./diagnostics.ts";
import type { NutrientKey } from "./input.ts";

/** Something the calculation went on without. Grouped, so it reads "2 ingredients without fibre". */
export interface ReportEntry {
  code: DiagnosticCode;
  nutrient: NutrientKey;
  /** Positions in the input list. */
  ingredients: number[];
}
