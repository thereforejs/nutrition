import type { DIAGNOSTICS } from "../diagnostics/codes.ts";

export type DiagnosticCode = keyof typeof DIAGNOSTICS;

export type DiagnosticParams = Record<string, string | number>;

export interface Diagnostic {
  code: DiagnosticCode;
  level: "error" | "warning";
  /** Into the input: "ingredients[2].per100g.fat", or "options.locales". */
  path: string;
  params: DiagnosticParams;
  /** The rule's legal source, where the rule comes from a regulation. */
  source?: string;
}
