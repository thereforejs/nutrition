import { toDecimalString } from "@thereforejs/decy";
import { describe, expect, test } from "vite-plus/test";
import { toDecimal } from "../src/core/value.ts";
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
    expect(toDecimalString(toDecimal(input, "amount"))).toBe(expected);
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
