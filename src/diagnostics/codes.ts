import type { DiagnosticParams, NutrientKey } from "../types/index.ts";

export interface Rule<P extends DiagnosticParams = DiagnosticParams> {
  source?: string;
  message: (params: P) => string;
}

// The type argument is the code's params; `Diagnostic` and `fail` take them from here.
const rule = <P extends DiagnosticParams = Record<never, never>>(definition: Rule<P>) => definition;

/** Every diagnostic nutrition can raise. Codes are stable; apps translate them, not the messages. */
export const DIAGNOSTICS = {
  "input.invalid": rule({
    message: () => "expected { ingredients: [{ amount, per100g: { ... } }] }",
  }),
  "options.invalid": rule<{ value: string }>({
    message: (p) => `"${p.value}" is not an allowed value`,
  }),
  "pieceWeight.zero": rule({
    message: () => "a piece of 0 g has no values",
  }),
  "weight.zero": rule({
    message: () => "the product weighs 0 g, there is nothing to calculate per 100 g",
  }),
  "value.missing": rule({
    message: () => "the value is unknown (null), calculated without it",
  }),
  "salt.sodiumMismatch": rule<{ salt: string; sodium: string }>({
    source: "Regulation (EU) No 1169/2011, Annex I No 11",
    message: (p) =>
      `salt ${p.salt} g is not sodium ${p.sodium} g × 2.5, give one of them or fix it`,
  }),
  "value.above100": rule({
    message: () =>
      "more than 100 g in 100 g is impossible (salt: more than 250 g, which is 100 g sodium)",
  }),
  "value.partExceedsWhole": rule<{ part: NutrientKey; whole: NutrientKey }>({
    source: "Regulation (EU) No 1169/2011, Annex XV (of which); Annex I No 7 and 9",
    message: (p) => `${p.part} is part of ${p.whole} and cannot be larger`,
  }),
  "value.unknownKey": rule<{ key: string }>({
    message: (p) => `"${p.key}" is no nutrient this library knows (energy is never input)`,
  }),
  "value.invalid": rule<{ value: string }>({
    message: (p) => `"${p.value}" is no amount, expected a number or decimal text of at least 0`,
  }),
};
