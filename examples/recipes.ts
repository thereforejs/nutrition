// Recipes from easy to hard. Run with `vp run example`.
import {
  C214100,
  C214200,
  E111100,
  M402600,
  N110000,
  R111000,
  R459000,
  W424000,
} from "@thereforejs/foods";
import {
  calculateNutrition,
  type DeclaredValue,
  DiagnosticError,
  type NutritionResult,
} from "../src/index.ts";
import { de } from "../src/locales/index.ts";

const text = (value: DeclaredValue) => value.text["de-DE"];
const percent = (value: DeclaredValue) => value.referenceIntake?.text["de-DE"] ?? "";

function show(title: string, { per100g, perPiece, report }: NutritionResult) {
  console.log(`\n${title}`);
  const { energy, ...nutrients } = per100g;
  const row = (kJ: DeclaredValue, kcal: DeclaredValue) => `${text(kJ)} / ${text(kcal)}`;
  const table: Record<string, Record<string, string>> = {
    energy: {
      "per 100 g": row(energy.kJ, energy.kcal),
      "per piece": perPiece ? row(perPiece.energy.kJ, perPiece.energy.kcal) : "",
      "% RI": percent(energy.kJ),
    },
  };
  for (const [key, value] of Object.entries(nutrients)) {
    const piece = perPiece?.[key as keyof typeof nutrients];
    table[key] = {
      "per 100 g": text(value),
      "per piece": piece ? text(piece) : "",
      "% RI": percent(value),
    };
  }
  console.table(table);
  for (const entry of report) console.log("report:", entry);
}

// 1. Easy: bread rolls. The baking loss (180 g) is taken off the water, so the amounts sum up to
//    what comes out of the oven.
show(
  "1. Bread rolls (Weizenbrötchen), per 100 g and per roll of 60 g",
  calculateNutrition(
    {
      ingredients: [
        { amount: 1000, per100g: C214200.per100g }, // wheat flour type 550
        { amount: 600 - 180, per100g: N110000.per100g }, // water, less the baking loss
        { amount: 40, per100g: R459000.per100g }, // fresh yeast
        { amount: 20, per100g: R111000.per100g }, // salt
      ],
      pieceWeight: 60,
    },
    { locales: [de] },
  ),
);

// 2. Middle: ham and cheese sticks, with voluntary nutrients and the percent of the reference intake.
//    Gouda has no value for starch in the BLS (<LOD), so the report names it.
show(
  "2. Ham and cheese sticks (Schinken-Käse-Stange), voluntary nutrients and % reference intake",
  calculateNutrition(
    {
      ingredients: [
        { amount: 500, per100g: C214100.per100g }, // wheat flour type 405
        { amount: 300 - 70, per100g: N110000.per100g }, // water, less the baking loss
        { amount: 20, per100g: R459000.per100g }, // fresh yeast
        { amount: 8, per100g: R111000.per100g }, // salt
        { amount: 150, per100g: W424000.per100g }, // cooked ham
        { amount: 150, per100g: M402600.per100g }, // Gouda 48 %
        { amount: 50, per100g: E111100.per100g }, // egg wash
      ],
      pieceWeight: 110,
    },
    { locales: [de], voluntary: ["starch", "fibre"], referenceIntake: true },
  ),
);

// 3. Hard: values from a supplier's sheet. Decimal text as printed, salt and sodium both given (they
//    must agree, Annex I No 11), sugars unknown (`null`), a negligible amount that reads "<0,1 g".
show(
  "3. Supplier sheet: unknown sugars, salt and sodium, negligible saturates",
  calculateNutrition(
    {
      ingredients: [
        { amount: 1000, per100g: C214200.per100g },
        { amount: 450, per100g: N110000.per100g },
        {
          amount: 30,
          per100g: {
            fat: "0.4",
            saturates: "0.08",
            carbohydrate: "12.5",
            sugars: null,
            protein: "40.2",
            salt: "1.25",
            sodium: "0.5",
          },
        }, // bakery improver, supplier sheet
        { amount: 22, per100g: R111000.per100g },
      ],
    },
    { locales: [de], negligible: "lessThan" },
  ),
);

// 4. Refused: a sheet with more sugars than carbohydrate cannot be true. Nothing is calculated, the
//    error names the code and the path.
try {
  calculateNutrition({
    ingredients: [
      { amount: 1000, per100g: C214200.per100g },
      { amount: 50, per100g: { carbohydrate: "20", sugars: "35" } },
    ],
  });
} catch (error) {
  if (!(error instanceof DiagnosticError)) throw error;
  console.log("\n4. Refused: sugars above carbohydrate");
  for (const { code, path, params } of error.diagnostics) console.log(code, path, params);
}
