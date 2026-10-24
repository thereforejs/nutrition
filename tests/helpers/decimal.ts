import { type Decimal, toDecimalString } from "@thereforejs/decy";

/** decy keeps the scale of a product (1000 × 1.2 × 0.01 is "12.000"); tests compare by value. */
export const plain = (value: Decimal) =>
  toDecimalString(value)
    .replace(/(\.\d*?)0+$/, "$1")
    .replace(/\.$/, "");
