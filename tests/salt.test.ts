import { decimal, fromNumber } from "@thereforejs/decy";
import fc from "fast-check";
import { describe, expect, test } from "vite-plus/test";
import { sumNutrients } from "../src/core/sum.ts";
import type { Ingredient } from "../src/index.ts";
import { plain } from "./helpers/decimal.ts";
import { diagnosticOf } from "./helpers/diagnostic.ts";
import { per100g } from "./helpers/nutrition.ts";

const salt = (ingredients: Ingredient[]) => {
  const { nutrients } = sumNutrients(ingredients, ["salt", "sodium"]);
  return { salt: plain(nutrients.salt), sodium: plain(nutrients.sodium) };
};

describe("salt or sodium per ingredient, both in the result (Annex I No 11)", () => {
  test("sodium only: salt = sodium × 2.5", () => {
    expect(salt([{ amount: 100, per100g: { sodium: "0.4" } }])).toEqual({
      salt: "1",
      sodium: "0.4",
    });
  });

  test("salt only: sodium = salt / 2.5", () => {
    expect(salt([{ amount: 100, per100g: { salt: 1.2 } }])).toEqual({
      salt: "1.2",
      sodium: "0.48",
    });
  });

  test("both, agreeing exactly", () => {
    expect(salt([{ amount: 100, per100g: { salt: "1.2", sodium: "0.48" } }])).toEqual({
      salt: "1.2",
      sodium: "0.48",
    });
  });

  test("mixed sources in one recipe", () => {
    expect(
      salt([
        { amount: 1000, per100g: { sodium: "0.002" } },
        { amount: 20, per100g: { salt: "99.5" } },
      ]),
    ).toEqual({ salt: "19.95", sodium: "7.98" });
  });
});

describe("salt and sodium that disagree refuse the result; unknown is reported", () => {
  test("both, disagreeing", () => {
    expect(
      diagnosticOf(() => salt([{ amount: 100, per100g: { salt: "1.2", sodium: "0.5" } }])),
    ).toMatchObject({
      code: "salt.sodiumMismatch",
      path: "ingredients[0].per100g",
      params: { salt: "1.2", sodium: "0.5" },
      source: "Regulation (EU) No 1169/2011, Annex I No 11",
    });
  });

  test("neither given: 0, nothing reported", () => {
    const { nutrients, report } = sumNutrients([{ amount: 100, per100g: {} }], ["salt", "sodium"]);
    expect([plain(nutrients.salt), plain(nutrients.sodium)]).toEqual(["0", "0"]);
    expect(report).toEqual([]);
  });

  test.each<[string, Ingredient["per100g"]]>([
    ["both null", { salt: null, sodium: null }],
    ["salt null", { salt: null }],
    ["sodium null", { sodium: null }],
  ])("%s: unknown, reported for salt and sodium", (_, per100g) => {
    const { report } = sumNutrients(
      [
        { amount: 100, per100g: { sodium: 1 } },
        { amount: 100, per100g },
      ],
      ["salt", "sodium"],
    );
    expect(report).toEqual([
      { code: "value.missing", nutrient: "salt", ingredients: [1] },
      { code: "value.missing", nutrient: "sodium", ingredients: [1] },
    ]);
  });

  test("one null, the other given: the given one counts", () => {
    expect(salt([{ amount: 100, per100g: { salt: null, sodium: "0.4" } }])).toEqual({
      salt: "1",
      sodium: "0.4",
    });
  });

  test("an invalid salt names its key", () => {
    expect(diagnosticOf(() => salt([{ amount: 100, per100g: { salt: "1,2" } }]))).toMatchObject({
      code: "value.invalid",
      path: "ingredients[0].per100g.salt",
    });
  });
});

// Expected values from Python's decimal module, independent of decy.
describe("odd numbers survive the way there and back exactly", () => {
  test.each<[string, Ingredient["per100g"], { salt: string; sodium: string }]>([
    ["salt 1.8354", { salt: "1.8354" }, { salt: "1.8354", sodium: "0.73416" }],
    ["sodium 0.73416", { sodium: "0.73416" }, { salt: "1.8354", sodium: "0.73416" }],
    [
      "both, agreeing",
      { salt: "1.8354", sodium: "0.73416" },
      { salt: "1.8354", sodium: "0.73416" },
    ],
    ["salt as a JavaScript number", { salt: 1.8354 }, { salt: "1.8354", sodium: "0.73416" }],
    ["tiny sodium", { sodium: "0.0000001" }, { salt: "0.00000025", sodium: "0.0000001" }],
  ])("%s", (_, per100g, expected) => {
    expect(salt([{ amount: 100, per100g }])).toEqual(expected);
  });

  test("odd amount and odd salt: 333.333 g at 1.8354 g per 100 g", () => {
    expect(salt([{ amount: "333.333", per100g: { salt: 1.8354 } }])).toEqual({
      salt: "6.117993882",
      sodium: "2.4471975528",
    });
  });
});

// Up to 2 integer and 12 fraction digits, e.g. "1.8354", "0.000000000007", "99.999999999999".
// Not above 100: more than 100 g in 100 g is refused (SPEC 3.2).
const decimalText = fc
  .tuple(
    fc.integer({ min: 0, max: 99 }),
    fc.string({ unit: fc.integer({ min: 0, max: 9 }).map(String), maxLength: 12 }),
  )
  .map(([whole, fraction]) => (fraction ? `${whole}.${fraction}` : `${whole}`));

const sameValue = (actual: string, expected: string) =>
  expect(actual).toBe(plain(decimal(expected)));

describe("properties: salt and sodium convert both ways without loss", () => {
  test("salt in, the same salt out, and its sodium gives the salt back", () => {
    fc.assert(
      fc.property(decimalText, (input) => {
        const there = salt([{ amount: 100, per100g: { salt: input } }]);
        sameValue(there.salt, input);
        const back = salt([{ amount: 100, per100g: { sodium: there.sodium } }]);
        sameValue(back.salt, input);
      }),
    );
  });

  test("sodium in, the same sodium out, and its salt gives the sodium back", () => {
    fc.assert(
      fc.property(decimalText, (input) => {
        const there = salt([{ amount: 100, per100g: { sodium: input } }]);
        sameValue(there.sodium, input);
        const back = salt([{ amount: 100, per100g: { salt: there.salt } }]);
        sameValue(back.sodium, input);
      }),
    );
  });

  test("a value and its own conversion, given together, always agree", () => {
    fc.assert(
      fc.property(decimalText, (input) => {
        const { sodium } = salt([{ amount: 100, per100g: { salt: input } }]);
        expect(salt([{ amount: 100, per100g: { salt: input, sodium } }]).salt).toBe(
          plain(decimal(input)),
        );
      }),
    );
  });

  test("odd amounts with odd values never exceed decy's 30 decimals", () => {
    fc.assert(
      fc.property(
        fc.oneof(decimalText, fc.double({ min: 0, max: 10000, noNaN: true })),
        fc.oneof(decimalText, fc.double({ min: 0, max: 100, noNaN: true })),
        (amount, value) => {
          expect(() =>
            sumNutrients(
              [{ amount, per100g: { salt: value, fat: value } }],
              ["fat", "salt", "sodium"],
            ),
          ).not.toThrow();
        },
      ),
    );
  });

  test("any possible JavaScript number (salt up to 250 g) lands on at most 12 decimals", () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 250, noNaN: true }), (input) => {
        const { salt: value } = salt([{ amount: 100, per100g: { salt: input } }]);
        expect(value).toMatch(/^\d+(\.\d{1,12})?$/);
      }),
    );
  });

  test("JavaScript numbers with up to 12 decimals keep their shortest decimal", () => {
    fc.assert(
      fc.property(decimalText.map(Number), (input) => {
        sameValue(salt([{ amount: 100, per100g: { salt: input } }]).salt, plain(fromNumber(input)));
      }),
    );
  });
});

describe("salt is derived from sodium at the very end, so both always agree", () => {
  test("a salt just above its threshold: sodium is just above its own", () => {
    const { salt, sodium } = per100g([{ amount: 100, per100g: { salt: "0.012500000001" } }]);
    expect(salt.negligible).toBe(sodium.negligible);
  });

  test("property: salt is sodium × 2.5 and both are negligible together (0.0125 g = 0.005 g × 2.5)", () => {
    const value = fc
      .tuple(
        fc.integer({ min: 0, max: 39 }),
        fc.string({ unit: fc.integer({ min: 0, max: 9 }).map(String), maxLength: 12 }),
      )
      .map(([whole, fraction]) => (fraction ? `${whole}.${fraction}` : `${whole}`));
    fc.assert(
      fc.property(value, fc.integer({ min: 1, max: 5000 }), (salt, water) => {
        const result = per100g([
          { amount: 100, per100g: { salt } },
          { amount: water, per100g: {} },
        ]);
        expect(Number(result.salt.exact)).toBeCloseTo(Number(result.sodium.exact) * 2.5, 10);
        expect(result.salt.negligible).toBe(result.sodium.negligible);
      }),
    );
  });

  test("sodium and salt given together at 12 decimals agree", () => {
    expect(() =>
      per100g([{ amount: 100, per100g: { sodium: "0.000000000001", salt: "0.0000000000025" } }]),
    ).not.toThrow();
  });
});
