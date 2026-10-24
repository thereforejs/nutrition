import { DiagnosticError, type Diagnostic } from "../../src/index.ts";

export function diagnosticOf(run: () => unknown): Diagnostic {
  try {
    run();
  } catch (error) {
    if (error instanceof DiagnosticError && error.diagnostics[0]) return error.diagnostics[0];
    throw error;
  }
  throw new Error("expected a DiagnosticError");
}
