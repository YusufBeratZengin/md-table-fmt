# md-table-fmt

[![CI](https://github.com/YusufBeratZengin/md-table-fmt/actions/workflows/ci.yml/badge.svg)](https://github.com/YusufBeratZengin/md-table-fmt/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js >=20](https://img.shields.io/badge/node-%3E%3D20-43853d.svg)](package.json)
[![npm version](https://img.shields.io/npm/v/md-table-fmt.svg)](https://www.npmjs.com/package/md-table-fmt)

Format, lint, sort, and convert Markdown tables with Unicode-aware alignment and zero dependencies.

[English](README.md) · [Türkçe](README.tr.md)

![Actual CLI output showing Unicode tables, inline code, and escaped pipes](docs/demo.svg)

## Why

- **Readable Unicode tables.** Measures CJK characters, combining marks, flags, and emoji sequences by display width instead of JavaScript string length.
- **Works inside documents.** Skips backtick and tilde fenced code blocks, preserves surrounding text in documents with consistent LF or CRLF endings, and repairs uneven rows without dropping extra cells.
- **One tool, zero dependencies.** Format and lint GFM tables, sort rows, and convert CSV, TSV, or JSON through a CLI or an ESM API. `fmt --check` fits into CI.

## Quick start

Requires Node.js 20 or newer. Run directly from a checkout; no package installation is needed:

```bash
git clone https://github.com/YusufBeratZengin/md-table-fmt.git
cd md-table-fmt
node bin/md-table.js from-json test/fixtures/sample.json
```

Output:

```text
| id  | service       | status      | latency_ms |
| --- | ------------- | ----------- | ---------- |
| 1   | API Gateway   | operational | 12         |
| 2   | Database Auth | operational | 5          |
| 3   | Search Index  | degraded    | 140        |
```

The demo above is the real output of this command:

```bash
node bin/md-table.js fmt --stdout test/fixtures/complex-tables.md
```

The package is named `md-table-fmt`; its installed executable is `md-table`. Once the package is published, you can also use `npm install -g md-table-fmt` or `npx --package md-table-fmt md-table --help`. The npm badge may be unavailable before the first publication.

## Usage examples

The examples below work from the repository root. With a global installation, replace `node bin/md-table.js` with `md-table`.

### Format and lint

```bash
# Preview formatted tables without modifying the document
node bin/md-table.js fmt --stdout test/fixtures/complex-tables.md

# Format a document in place
node bin/md-table.js fmt README.md

# Fail CI if a document needs formatting
node bin/md-table.js fmt --check README.md README.tr.md

# Treat alignment warnings as errors
node bin/md-table.js lint --strict README.md README.tr.md
```

`fmt --check` exits with `1` when formatting is needed and `0` when it is already correct. `lint` exits with `1` for errors; alignment warnings alone require `--strict` to fail. Lint rules cover inconsistent column counts, missing header separators, trailing whitespace, and misalignment.

For multiple files, supply paths, directories, or quoted patterns such as `"docs/**/*.md"`. Directory arguments recursively find `.md` and `.markdown` files and skip `.git` and `node_modules`. Glob support is basic; explicit paths or directories are the most predictable choice.

### Convert CSV, TSV, and JSON

```bash
node bin/md-table.js from-csv test/fixtures/sample.csv
node bin/md-table.js from-json test/fixtures/sample.json
node bin/md-table.js to-csv test/fixtures/complex-tables.md
node bin/md-table.js to-csv --tsv test/fixtures/complex-tables.md
node bin/md-table.js to-json --table 1 --indent 2 test/fixtures/complex-tables.md
```

Conversions write to stdout. CSV supports quoted fields, doubled quotes, and embedded newlines. Use `from-csv --tsv` for tab-separated input or `--delimiter ";"` for a custom delimiter. Omit the file or pass `-` to read stdin.

### Sort rows

```bash
node bin/md-table.js sort --by Country test/fixtures/complex-tables.md
node bin/md-table.js sort --by 1 --desc test/fixtures/complex-tables.md
```

Sort writes to stdout by default; add `--in-place` to update a file. Column names are case-insensitive and numeric column arguments are 1-based (`0` also selects the first column). Numeric sorting is detected automatically; `--numeric` forces it.

### JavaScript API

From a checkout, import `./src/index.js`. In an application with the package installed, import `md-table-fmt` instead.

```javascript
import {
  formatMarkdown, lintMarkdown, stringWidth,
  csvToMarkdown, markdownToJson, sortMarkdown,
} from './src/index.js';

const table = csvToMarkdown('item,score\nBeta,8\nAlpha,12');
const sorted = sortMarkdown(table, { by: 'score', desc: true, numeric: true });
console.log(formatMarkdown(sorted));
console.log(lintMarkdown(sorted)); // []
console.log(stringWidth('東京')); // 4
console.log(markdownToJson(sorted)); // Cell values are strings
```

The API also exports `formatTable`, `formatTableLines`, `formatDelimiterCell`, `formatLintReport`, `tsvToMarkdown`, `markdownToCsv`, `markdownToTsv`, `jsonToMarkdown`, `sortTableAST`, and parser/width helpers. See [src/index.js](src/index.js) for all exports and the implementation modules for JSDoc options.

## Configuration

There is no configuration file or environment-variable setup. Pass CLI flags or JavaScript option objects.

| Option              | Applies to      | Default / behavior                              |
| ------------------- | --------------- | ----------------------------------------------- |
| `--check`, `-c`     | `fmt`           | Check without writing; exit 1 if changed        |
| `--stdout`          | `fmt`           | Files are otherwise updated in place            |
| `--strict`          | `lint`          | Alignment warnings become errors                |
| `--delimiter`, `-d` | CSV conversions | Comma; use a single character                   |
| `--tsv`             | CSV conversions | Tab delimiter                                   |
| `--table`           | Export and sort | Zero-based table index, default 0               |
| `--indent`          | `to-json`       | 2 spaces                                        |
| `--by`, `-b`        | `sort`          | Required column name or index                   |
| `--desc`            | `sort`          | Descending order; default ascending             |
| `--numeric`         | `sort`          | Force numeric comparison; otherwise auto-detect |
| `--in-place`        | `sort`          | Update the input file; default stdout           |

Run `node bin/md-table.js --help` for the command reference. API formatting options include `alignHeader`; conversion options include `alignments`, `delimiter`, `tableIndex`, and `indent`, depending on the function.

## FAQ / Limitations

**Does this parse all Markdown?** It focuses on pipe tables and fenced code blocks, rather than providing a complete CommonMark parser. Tables need a delimiter row to be formatted; `lint` can report likely missing separators.

**Will every terminal render Unicode identically?** Width uses generated wide/zero-width intervals and `Intl.Segmenter` grapheme clusters. Actual rendering still depends on your terminal and font, especially for emoji.

**Are conversions lossless?** Exported JSON cell values are strings. Input JSON objects use the union of their keys as headers; arrays of arrays use the first row as headers. Pipes are escaped and embedded newlines become `<br>`. Literal `<br>` is decoded to a newline on export. Duplicate JSON headers overwrite earlier values, so use unique headers.

**What happens to line endings and other tables?** Consistent LF or CRLF endings are preserved when formatting documents; mixed endings are normalized to CRLF. Sort targets one table but formats all parsed tables in the document. An out-of-range export index falls back to the first table.

**Can I use it with CommonJS?** The package is ESM. Use dynamic `import('md-table-fmt')` from CommonJS.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup and pull request guidelines. Bug reports and feature requests can be written in English or Turkish. See [SECURITY.md](SECURITY.md) for private vulnerability reporting.

```bash
npm test
npm run lint
npm run demo:check
```

`npm test` prints Node's built-in line, branch, and function coverage report. On Node.js 22.8 or newer, `npm run test:coverage` enforces at least 85% line coverage for `src/`, excluding the generated Unicode data table; CI runs this check on Node.js 22. No runtime or test packages need to be installed. A separate typecheck command is not currently configured.

Regenerate the SVG with `npm run demo`, or rebuild Unicode interval data with `npm run generate-data`. CI runs tests with coverage on Ubuntu, Windows, and macOS with Node.js 20 and 22; CodeQL and weekly Dependabot updates are configured separately.

Release highlights are in [CHANGELOG.md](CHANGELOG.md).

## License

[MIT](LICENSE).
