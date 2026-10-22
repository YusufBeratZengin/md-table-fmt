# md-table-fmt

Fast, zero-dependency Markdown (GFM) table formatter, linter, and converter for Node.js (>=20, ESM).

Formats, aligns, and repairs Markdown tables inside documents while skipping fenced code blocks and preserving all other text byte-for-byte. Features accurate monospace display-width calculation for wide Unicode (CJK), emoji presentation sequences, combining diacritics, regional indicator flags, and zero-width markers.

## Features

- Zero runtime dependencies: uses native Node.js APIs and ECMAScript modules.
- Non-destructive: preserves non-table Markdown content, empty lines, indentation, and line endings (LF/CRLF) byte-for-byte.
- Fenced code block skipping: leaves tables inside backtick (```) and tilde (~~~) code blocks untouched.
- Unicode display width: accurately measures East Asian Wide (UAX #11), Fullwidth, emoji presentation sequences, skin tone modifiers, ZWJ sequences, and combining characters.
- Escaped pipes and backticks: correctly parses escaped pipes (`\|`) and inline code spans (`` `foo | bar` ``).
- Broken row repair: normalizes uneven rows by padding missing columns and extending mismatched headers.
- Data conversions: bidirectional conversion between Markdown tables, RFC 4180 CSV, TSV, and JSON.
- Column sorting: sort table rows alphabetically or numerically, ascending or descending.
- Built-in linter: detects inconsistent column counts, missing separator rows, trailing spaces, and misalignment.
- CI ready: `fmt --check` returns exit code 1 if files require formatting.

## Installation

```bash
# Global installation
npm install -g md-table-fmt

# Or run directly with npx
npx md-table-fmt --help
```

## CLI Usage

The CLI binary is named `md-table`.

```text
Usage:
  md-table <command> [options] [arguments]

Commands:
  fmt <files...> [--check]     Format Markdown tables in files or stdin
  lint <files...> [--strict]   Lint tables for column mismatches, missing separators, etc.
  from-csv [file] [--tsv]      Convert CSV/TSV to formatted Markdown table
  to-csv [file] [--tsv]        Convert Markdown table to CSV/TSV
  from-json [file]             Convert JSON to formatted Markdown table
  to-json [file]               Convert Markdown table to JSON array of objects
  sort [file] --by <col>       Sort table rows by column name or 1-based index

Options:
  -c, --check                  Check if formatting is needed without writing (exit 1 if changed)
  -b, --by <col>               Column to sort by (header name or index)
  -d, --delimiter <char>       CSV delimiter (default: ,)
  -t, --tsv                    Use tab delimiter for CSV operations
  -i, --in-place               Modify file in-place (for sort)
  --desc                       Sort descending
  --numeric                    Sort numerically
  --table <index>              Zero-based table index to target (default: 0)
  --indent <n>                 JSON indentation spaces (default: 2)
  --stdout                     Write output to stdout instead of in-place
  -h, --help                   Show help message
  -v, --version                Show version number
```

### Examples

#### Format files in-place

```bash
md-table fmt README.md docs/*.md
```

#### Check formatting in CI

```bash
md-table fmt --check README.md docs/**/*.md
```

If any file contains unformatted tables, the command outputs the file path and exits with code `1`.

#### Lint Markdown tables

```bash
md-table lint docs/**/*.md
```

Detects issues such as:
- Inconsistent column counts across rows
- Header rows missing delimiter separators (`|---|---|`)
- Trailing whitespace on table rows
- Misaligned table columns

#### Convert between CSV, TSV, and Markdown

```bash
# Convert CSV file to Markdown table
md-table from-csv data.csv > table.md

# Convert TSV file to Markdown table
md-table from-csv --tsv data.tsv > table.md

# Extract Markdown table to CSV
md-table to-csv table.md > data.csv

# Pipe from stdin
cat data.csv | md-table from-csv
```

#### Convert between JSON and Markdown

```bash
# Convert JSON array of objects to Markdown table
md-table from-json items.json > table.md

# Extract Markdown table to JSON array
md-table to-json table.md > items.json
```

#### Sort table rows

```bash
# Sort by column name
md-table sort README.md --by "Salary" --numeric --desc -i

# Sort by 1-based column index
md-table sort table.md --by 2
```

## Programmatic API

`md-table-fmt` provides an ESM JavaScript API:

```javascript
import {
  formatMarkdown,
  formatTable,
  lintMarkdown,
  stringWidth,
  csvToMarkdown,
  markdownToCsv,
  jsonToMarkdown,
  markdownToJson,
  sortMarkdown,
} from 'md-table-fmt';

// Format entire Markdown file while preserving non-table text
const formattedDoc = formatMarkdown(rawMarkdown);

// Format standalone table
const formattedTable = formatTable(`
| Name | Age |
|---|---|
| Alice | 30 |
| Bob | 25 |
`);

// Accurate display-width calculation
console.log(stringWidth('東京')); // 4
console.log(stringWidth('café')); // 4
console.log(stringWidth('🚀'));   // 2

// Lint tables
const issues = lintMarkdown(rawMarkdown);
for (const issue of issues) {
  console.log(`${issue.line}:${issue.column} [${issue.severity}] ${issue.message}`);
}

// Convert CSV to Markdown table
const table = csvToMarkdown('name,score\nAlice,100\nBob,85');

// Sort table
const sorted = sortMarkdown(table, { by: 'score', desc: true, numeric: true });
```

## Architecture and Unicode Handling

GFM tables are visual alignment structures rendered in fixed-width fonts. Naive character counting (`string.length`) fails when strings contain:
1. East Asian Wide / Fullwidth characters (Chinese, Japanese, Korean) which occupy 2 display columns.
2. Combining marks and diacritics (e.g., `e` + U+0301) which attach to base letters without advancing the cursor.
3. Emoji presentation sequences and multi-codepoint sequences (skin tones, ZWJ sequences like family emojis, regional indicator flags).

`md-table-fmt` uses a generated binary-searchable interval table derived from Unicode UAX #11 East Asian Width along with `Intl.Segmenter` grapheme cluster segmentation to compute the exact visual monospace width of every cell.

## Development

```bash
# Run unit tests
npm test

# Rebuild Unicode width data
npm run generate-data
```

## License

MIT Copyright (c) 2026 Yusuf Berat Zengin. See [LICENSE](LICENSE) for details.
