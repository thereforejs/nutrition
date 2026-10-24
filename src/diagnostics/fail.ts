import type { Diagnostic, DiagnosticCode, ParamsOf } from "../types/index.ts";
import { DIAGNOSTICS, type Rule } from "./codes.ts";

/** Refuses the whole result. `diagnostics` carries the stable codes for the caller. */
export class DiagnosticError extends Error {
  readonly diagnostics: Diagnostic[];

  constructor(diagnostics: Diagnostic[]) {
    super(
      diagnostics
        .map((diagnostic) => {
          const rule: Rule = DIAGNOSTICS[diagnostic.code] as Rule;
          return `${diagnostic.path}: ${rule.message(diagnostic.params)}`;
        })
        .join("\n"),
    );
    this.name = "DiagnosticError";
    this.diagnostics = diagnostics;
  }
}

/** The one way to refuse a result. A code without params takes none, any other demands its own. */
export function fail<C extends DiagnosticCode>(
  code: C,
  path: string,
  ...[params]: keyof ParamsOf<C> extends never ? [] : [ParamsOf<C>]
): never {
  const rule: Rule = DIAGNOSTICS[code] as Rule;
  // TypeScript cannot follow a generic code into the union; `fail`'s signature guarantees the pair.
  const diagnostic = { code, level: "error", path, params: params ?? {} } as Diagnostic;
  throw new DiagnosticError([rule.source ? { ...diagnostic, source: rule.source } : diagnostic]);
}
