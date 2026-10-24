import { decimal } from "@thereforejs/decy";
import { describe, expect, test } from "vite-plus/test";
import { type Declared, roundOf } from "../src/core/rounding.ts";
import { de, en } from "../src/locales/index.ts";
import { textOf } from "../src/output/text.ts";

const NBSP = " ";
const text = (
  key: Declared,
  value: string,
  locale = de,
  negligible: "zero" | "lessThan" = "lessThan",
) => textOf(key, roundOf(key, decimal(value)), locale, negligible).replaceAll(NBSP, " ");

describe("the text shows the rounded value with the step's decimals and its unit", () => {
  test.each<[Declared, string, string, string]>([
    ["fat", "9.96", "10,0 g", "10.0 g"],
    ["fat", "10.4", "10 g", "10 g"],
    ["carbohydrate", "41.5", "42 g", "42 g"],
    ["salt", "1.05", "1,1 g", "1.1 g"],
    ["salt", "0.995", "1,00 g", "1.00 g"],
    ["sodium", "0.006", "0,01 g", "0.01 g"],
    ["energyKJ", "1430.5", "1431 kJ", "1431 kJ"],
    ["energyKcal", "341.2", "341 kcal", "341 kcal"],
  ])("%s %s: %s / %s", (key, value, german, english) => {
    expect(text(key, value, de)).toBe(german);
    expect(text(key, value, en)).toBe(english);
  });

  test("number and unit stay on one line", () => {
    expect(textOf("fat", roundOf("fat", decimal("2")), de, "zero")).toBe(`2,0${NBSP}g`);
  });
});

// Table 4: "0 g" or "<x g" may be declared; x is the table's own, 0.01 g for salt (not 0.0125).
describe("negligible amounts read 0 g or <x g, as chosen", () => {
  test.each<[Declared, string, string, string]>([
    ["fat", "0.5", "<0,5 g", "0 g"],
    ["sugars", "0.2", "<0,5 g", "0 g"],
    ["saturates", "0.1", "<0,1 g", "0 g"],
    ["sodium", "0.005", "<0,005 g", "0 g"],
    ["salt", "0.0125", "<0,01 g", "0 g"],
  ])("%s %s: %s or %s", (key, value, lessThan, zero) => {
    expect(text(key, value, de, "lessThan")).toBe(lessThan);
    expect(text(key, value, de, "zero")).toBe(zero);
  });

  test("english", () => {
    expect(text("fat", "0.3", en, "lessThan")).toBe("<0.5 g");
  });
});

// Regulation (EU) No 1169/2011, Annex XV (consolidated 1.4.2025, DE and EN); sodium: Annex I No 11.
describe("labels as Annex XV words them", () => {
  test("German", () => {
    expect(de.labels).toEqual({
      energy: "Energie",
      fat: "Fett",
      ofWhich: "davon:",
      saturates: "gesättigte Fettsäuren",
      monounsaturates: "einfach ungesättigte Fettsäuren",
      polyunsaturates: "mehrfach ungesättigte Fettsäuren",
      carbohydrate: "Kohlenhydrate",
      sugars: "Zucker",
      polyols: "mehrwertige Alkohole",
      starch: "Stärke",
      fibre: "Ballaststoffe",
      protein: "Eiweiß",
      salt: "Salz",
      sodium: "Natrium",
      referenceIntake:
        "Referenzmenge für einen durchschnittlichen Erwachsenen (8 400 kJ/2 000 kcal)",
    });
  });

  test("English", () => {
    expect(en.labels).toEqual({
      energy: "energy",
      fat: "fat",
      ofWhich: "of which",
      saturates: "saturates",
      monounsaturates: "mono-unsaturates",
      polyunsaturates: "polyunsaturates",
      carbohydrate: "carbohydrate",
      sugars: "sugars",
      polyols: "polyols",
      starch: "starch",
      fibre: "fibre",
      protein: "protein",
      salt: "salt",
      sodium: "sodium",
      referenceIntake: "Reference intake of an average adult (8 400 kJ/2 000 kcal)",
    });
  });
});
