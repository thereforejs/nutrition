import type { DiagnosticParams } from "../types/index.ts";

export interface Rule {
  source?: string;
  message: (params: DiagnosticParams) => string;
}

/** Every diagnostic nutrition can raise. Codes are stable; apps translate them, not the messages. */
export const DIAGNOSTICS = {
  "weight.zero": {
    message: () => "the product weighs 0 g, there is nothing to calculate per 100 g",
  },
  "value.missing": {
    message: () => "the value is unknown (null), calculated without it",
  },
  "salt.sodiumMismatch": {
    source: "Regulation (EU) No 1169/2011, Annex I No 11",
    message: (p) =>
      `salt ${p.salt} g is not sodium ${p.sodium} g × 2.5, give one of them or fix it`,
  },
  "value.above100": {
    message: () => "more than 100 g in 100 g is impossible",
  },
  "value.partExceedsWhole": {
    source: "Regulation (EU) No 1169/2011, Annex I No 2, 7, 8 and 9",
    message: (p) => `${p.part} is part of ${p.whole} and cannot be larger`,
  },
  "value.invalid": {
    message: (p) => `"${p.value}" is no amount, expected a number or decimal text of at least 0`,
  },
} satisfies Record<string, Rule>;
