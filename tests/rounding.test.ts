import { decimal, toDecimalString } from "@thereforejs/decy";
import { describe, expect, test } from "vite-plus/test";
import { type Declared, roundOf } from "../src/core/rounding.ts";

const round = (key: Declared, value: string) => {
  const { rounded, negligible } = roundOf(key, decimal(value));
  return { rounded: toDecimalString(rounded), negligible };
};

// Commission guidance on tolerances, December 2012, section 6, Table 4. The step follows the amount
// itself: 9.96 g is "< 10 g", so it rounds to 0.1 g and reads 10.0 (trailing zero kept, SPEC 4.4).
describe("Table 4: the step follows the amount, half up", () => {
  test.each<[Declared, string, string, boolean]>([
    ["fat", "10", "10", false],
    ["fat", "10.5", "11", false],
    ["fat", "10.49", "10", false],
    ["fat", "9.96", "10.0", false],
    ["fat", "9.94", "9.9", false],
    ["fat", "0.55", "0.6", false],
    ["fat", "0.54", "0.5", false],
    ["fat", "0.501", "0.5", false],
    ["fat", "0.5", "0", true],
    ["fat", "0", "0", true],
    ["carbohydrate", "41.5", "42", false],
    ["sugars", "0.3", "0", true],
    ["protein", "11.5", "12", false],
    ["fibre", "6.95", "7.0", false],
    ["polyols", "0.6", "0.6", false],
    ["starch", "52.6", "53", false],
    ["saturates", "10", "10", false],
    ["saturates", "0.15", "0.2", false],
    ["saturates", "0.1", "0", true],
    ["monounsaturates", "0.11", "0.1", false],
    ["polyunsaturates", "0.05", "0", true],
    ["sodium", "1", "1.0", false],
    ["sodium", "1.25", "1.3", false],
    ["sodium", "0.995", "1.00", false],
    ["sodium", "0.006", "0.01", false],
    ["sodium", "0.005", "0", true],
    ["salt", "1.05", "1.1", false],
    ["salt", "0.0126", "0.01", false],
    ["salt", "0.0125", "0", true],
    ["salt", "0.995", "1.00", false],
  ])("%s %s g reads %s", (key, value, rounded, negligible) => {
    expect(round(key, value)).toEqual({ rounded, negligible });
  });
});

describe("energy: whole kJ and kcal, never negligible", () => {
  test.each<[Declared, string, string]>([
    ["energyKJ", "948.4", "948"],
    ["energyKJ", "1430.5", "1431"],
    ["energyKcal", "224.5", "225"],
    ["energyKcal", "0.4", "0"],
  ])("%s %s reads %s", (key, value, rounded) => {
    expect(round(key, value)).toEqual({ rounded, negligible: false });
  });
});
