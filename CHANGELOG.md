# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-10-22

### Added

- Initial release of `md-table-fmt` and the `md-table` CLI executable.
- GFM Markdown table parser with byte-for-byte preservation of non-table content and line endings.
- Strict skipping of fenced code blocks (both ``` and ~~~ delimiters).
- Monospace display-width calculation engine based on UAX #11 East Asian Width intervals, emoji presentation, combining characters, and regional indicator flags.
- Formatting commands with column alignment (left, center, right), padding, and automated repair of uneven or broken rows.
- CI formatting check command (`fmt --check`) exiting with code 1 upon detection of unformatted tables.
- Table linter (`lint`) detecting inconsistent column counts, missing header separators, trailing spaces, and misalignment.
- Bidirectional conversions for CSV (RFC 4180), TSV, and JSON formats (`from-csv`, `to-csv`, `from-json`, `to-json`).
- In-place and stdout table sorting by column name or 1-based index (`sort --by <col>`).
- Zero runtime dependencies architecture targeting Node.js >= 20.
