<p align="center">
  <img src="./assets/logo.svg" alt="nutrition" width="128" height="128">
</p>

<h1 align="center">nutrition</h1>

<p align="center">
  The nutrition declaration of a food, calculated from its recipe under the EU food information<br>
  regulation (Regulation (EU) No 1169/2011, known as FIC, LMIV in German, INCO in French).<br>
  It calculates, it never guesses.
</p>

> [!WARNING]
> Early development (0.x). Nothing is published yet and the API will change. The library is no legal
> advice: the label stays the responsibility of the food business.

## Install

```sh
npm install @thereforejs/nutrition
```

## Your values, your responsibility

The library knows no foods, only the values you pass. It checks that they are possible, not that they
are right. What a value means is decided by what you send:

| You send | Meaning       | The library                                    |
| -------- | ------------- | ---------------------------------------------- |
| `0`      | there is none | calculates with 0                              |
| no key   | nothing said  | calculates with 0                              |
| `null`   | unknown       | calculates without it and lists it in `report` |

## Report

Everything the calculation went on without, grouped by code and nutrient, so it reads
"2 ingredients without fibre". `ingredients` are positions in your input list.

```ts
report: [{ code: "value.missing", nutrient: "fibre", ingredients: [3, 7] }];
```

| Code            | Meaning                                        | What you can do                                                                  |
| --------------- | ---------------------------------------------- | -------------------------------------------------------------------------------- |
| `value.missing` | these ingredients have `null` for the nutrient | find the value (supplier, another database, a lab), or send `0` if there is none |

Errors are not in the report: they refuse the whole result and come as a `DiagnosticError`.

## License

[MIT](./LICENSE)
