import { type Decimal, decimal, multiply, subtract, sum } from "@thereforejs/decy";

export const ENERGY_KEYS = [
  "carbohydrate",
  "polyols",
  "erythritol",
  "protein",
  "fat",
  "salatrims",
  "alcohol",
  "organicAcids",
  "fibre",
] as const;

export type EnergyKey = (typeof ENERGY_KEYS)[number];

const ZERO = decimal("0");
const factor = (kJ: string, kcal: string) => ({ kJ: decimal(kJ), kcal: decimal(kcal) });
const known = (value: Decimal | null) => value ?? ZERO;
// A part is taken out of its own whole; an unknown whole adds nothing and loses nothing.
const without = (whole: Decimal | null, part: Decimal | null) =>
  whole === null ? ZERO : subtract(whole, known(part));

// Regulation (EU) No 1169/2011, Annex XIV (unchanged in the consolidated text of 1.4.2025). The values
// come as declared, so each part is taken out of its whole (Annex I No 2, 7 and 9; SPEC 4.2).
function annexXIV(v: Record<EnergyKey, Decimal | null>) {
  return [
    { grams: without(v.carbohydrate, v.polyols), ...factor("17", "4") }, // carbohydrate (except polyols)
    { grams: without(v.polyols, v.erythritol), ...factor("10", "2.4") }, // polyols
    { grams: known(v.protein), ...factor("17", "4") },
    { grams: without(v.fat, v.salatrims), ...factor("37", "9") },
    { grams: known(v.salatrims), ...factor("25", "6") },
    { grams: known(v.alcohol), ...factor("29", "7") },
    { grams: known(v.organicAcids), ...factor("13", "3") },
    { grams: known(v.fibre), ...factor("8", "2") },
    { grams: known(v.erythritol), ...factor("0", "0") },
  ];
}

/**
 * The energy of one ingredient per 100 g, kJ and kcal each from their own factors, never converted
 * into each other. Per ingredient, so that an unknown whole in one ingredient cannot swallow the
 * parts of another.
 */
export function energyOf(values: Record<EnergyKey, Decimal | null>): {
  kJ: Decimal;
  kcal: Decimal;
} {
  const parts = annexXIV(values);
  return {
    kJ: sum(parts.map((part) => multiply(part.grams, part.kJ))),
    kcal: sum(parts.map((part) => multiply(part.grams, part.kcal))),
  };
}
