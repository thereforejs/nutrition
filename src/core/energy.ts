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

type EnergyKey = (typeof ENERGY_KEYS)[number];

const factor = (kJ: string, kcal: string) => ({ kJ: decimal(kJ), kcal: decimal(kcal) });

// Regulation (EU) No 1169/2011, Annex XIV (unchanged in the consolidated text of 1.4.2025). The values
// come as declared, so each part is taken out of its whole (Annex I No 2, 7, 9; SPEC 4.2).
function annexXIV(v: Record<EnergyKey, Decimal>) {
  return [
    { grams: subtract(v.carbohydrate, v.polyols), ...factor("17", "4") }, // carbohydrate (except polyols)
    { grams: subtract(v.polyols, v.erythritol), ...factor("10", "2.4") }, // polyols
    { grams: v.protein, ...factor("17", "4") },
    { grams: subtract(v.fat, v.salatrims), ...factor("37", "9") },
    { grams: v.salatrims, ...factor("25", "6") },
    { grams: v.alcohol, ...factor("29", "7") },
    { grams: v.organicAcids, ...factor("13", "3") },
    { grams: v.fibre, ...factor("8", "2") },
    { grams: v.erythritol, ...factor("0", "0") },
  ];
}

/** kJ and kcal each from their own factors, never converted into each other. */
export function energyOf(values: Record<EnergyKey, Decimal>): { kJ: Decimal; kcal: Decimal } {
  const parts = annexXIV(values);
  return {
    kJ: sum(parts.map((part) => multiply(part.grams, part.kJ))),
    kcal: sum(parts.map((part) => multiply(part.grams, part.kcal))),
  };
}
