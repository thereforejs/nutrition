import { describe, expect, test } from "vite-plus/test";
import { toDecimal } from "../src/core/value.ts";
import { plain } from "./helpers/decimal.ts";
import { diagnosticOf } from "./helpers/diagnostic.ts";

describe("values come in as number or decimal string and are read exactly", () => {
  test.each<[number | string, string]>([
    ["1000", "1000"],
    ["0.5", "0.5"],
    ["007", "7"],
    [1000, "1000"],
    [0.1, "0.1"],
    [1.005, "1.005"],
    [1e-7, "0.0000001"],
    [0, "0"],
    [-0, "0"],
    ["-0", "0"],
  ])("%j reads as %s", (input, expected) => {
    expect(plain(toDecimal(input, "amount"))).toBe(expected);
  });
});

// Expected values from Python's decimal module (quantize to 1e-12, ROUND_HALF_UP).
describe("more than 12 decimals are rounded half up to 12, the output rounding never sees them", () => {
  test.each<[number | string, string]>([
    [0.1 + 0.2, "0.3"],
    ["0.30000000000000004", "0.3"],
    ["1.0000000000005", "1.000000000001"],
    ["1.0000000000004999", "1"],
    [`0.${"3".repeat(40)}`, "0.333333333333"],
    [5e-324, "0"],
    [1e-13, "0"],
    [5e-13, "0.000000000001"],
  ])("%j reads as %s", (input, expected) => {
    expect(plain(toDecimal(input, "amount"))).toBe(expected);
  });

  test("a tiny negative number is still negative", () => {
    expect(diagnosticOf(() => toDecimal(-1e-20, "amount")).code).toBe("value.invalid");
  });
});

describe("anything else is refused with the path, never read as 0", () => {
  test.each<[unknown]>([
    [""],
    ["abc"],
    ["1,5"],
    [" 1"],
    ["1e3"],
    [NaN],
    [Infinity],
    [-1],
    ["-0.5"],
    [null],
    [undefined],
    [true],
  ])("%j", (input) => {
    const diagnostic = diagnosticOf(() =>
      toDecimal(input as number | string, "ingredients[2].per100g.fat"),
    );
    expect(diagnostic).toMatchObject({
      code: "value.invalid",
      level: "error",
      path: "ingredients[2].per100g.fat",
      params: { value: String(input) },
    });
  });
});
