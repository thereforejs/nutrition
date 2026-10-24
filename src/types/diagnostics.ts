import type { DIAGNOSTICS } from "../diagnostics/codes.ts";

export type DiagnosticCode = keyof typeof DIAGNOSTICS;

export type DiagnosticParams = Record<string, string | number>;

/** The params of one code, e.g. `{ key: string }` for "value.unknownKey". */
export type ParamsOf<C extends DiagnosticCode> = Parameters<(typeof DIAGNOSTICS)[C]["message"]>[0];

/** One per code, so that checking `code` narrows `params`. */
export type Diagnostic = {
  [C in DiagnosticCode]: {
    code: C;
    level: "error";
    /** Into the input: "ingredients[2].per100g.fat", or "options.locales". */
    path: string;
    params: ParamsOf<C>;
    /** The rule's legal source, where the rule comes from a regulation. */
    source?: string;
  };
}[DiagnosticCode];
