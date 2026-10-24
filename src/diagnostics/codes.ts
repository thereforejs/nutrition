import type { DiagnosticParams } from "../types/index.ts";

export interface Rule {
  source?: string;
  message: (params: DiagnosticParams) => string;
}

/** Every diagnostic nutrition can raise. Codes are stable; apps translate them, not the messages. */
export const DIAGNOSTICS = {
  "value.invalid": {
    message: (p) => `"${p.value}" is no amount, expected a number or decimal text of at least 0`,
  },
} satisfies Record<string, Rule>;
