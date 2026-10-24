import { describe, expectTypeOf, test } from "vite-plus/test";
import { fail } from "../src/diagnostics/fail.ts";
import type { Diagnostic, NutrientKey } from "../src/index.ts";

type ParamsFor<C extends Diagnostic["code"]> = Extract<Diagnostic, { code: C }>["params"];

// Checked by `vp check` (type-aware), not at runtime.
describe("each code carries its own params type", () => {
  test("params follow the code", () => {
    expectTypeOf<ParamsFor<"value.unknownKey">>().toEqualTypeOf<{ key: string }>();
    expectTypeOf<ParamsFor<"salt.sodiumMismatch">>().toEqualTypeOf<{
      salt: string;
      sodium: string;
    }>();
    expectTypeOf<ParamsFor<"value.partExceedsWhole">>().toEqualTypeOf<{
      part: NutrientKey;
      whole: NutrientKey;
    }>();
    expectTypeOf<ParamsFor<"weight.zero">>().toEqualTypeOf<Record<never, never>>();
  });

  test("narrowing on the code narrows the params", () => {
    const read = (diagnostic: Diagnostic) =>
      diagnostic.code === "value.unknownKey" ? diagnostic.params.key : undefined;
    expectTypeOf(read).returns.toEqualTypeOf<string | undefined>();
  });

  test("fail demands exactly the params of its code", () => {
    const misuse = () => {
      // @ts-expect-error value.unknownKey needs { key }
      fail("value.unknownKey", "ingredients[0].per100g.fats");
      // @ts-expect-error weight.zero takes no params
      fail("weight.zero", "ingredients", { key: "x" });
    };
    expectTypeOf(misuse).toBeFunction();
  });
});
