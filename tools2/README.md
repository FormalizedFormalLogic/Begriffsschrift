# tools2

## collect-chars.ts

Extract characters/symbols used in well-known formalizations.
Results will be stored in [`/sample-text`](../sample-text/).

```sh
bun tools2/collect-chars.ts
```

Add projects, update [`collect-chars.toml`](./collect-chars.toml).

## coverage-report.ts

Report how well the built Begriffsschrift font covers the characters in `sample-text/all.csv`.

```sh
bun tools2/coverage-report.ts
# with optional CSV output
bun tools2/coverage-report.ts --out coverage.csv
# custom font path
bun tools2/coverage-report.ts --font dist/Begriffsschrift/TTF/Begriffsschrift-Regular.ttf
```

Build the font first if not already built:

```sh
npm run build -- ttf-unhinted::Begriffsschrift --jCmd=1
```
