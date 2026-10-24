import { calculateNutrition, type Ingredient } from "../../src/index.ts";

export const per100g = (ingredients: Ingredient[]) => calculateNutrition({ ingredients }).per100g;
