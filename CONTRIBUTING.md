# Contributing to md-table-fmt

Thank you for your interest in contributing to `md-table-fmt`.

## Code of Conduct

All contributors are expected to maintain professional, respectful, and constructive communication.

## Development Setup

Requirements:
- Node.js >= 20.0.0
- npm or compatible package manager
- Git

Clone the repository:

```bash
git clone https://github.com/YusufBeratZengin/md-table-fmt.git
cd md-table-fmt
```

This project has zero runtime dependencies and zero test dependencies, using Node's built-in `node:test` runner.

## Running Tests

Execute the test suite:

```bash
npm test
npm run lint
npm run demo:check
```

`npm test` uses Node's built-in coverage reporter. Review line, branch, and function coverage and add behavior-focused tests for uncovered cases. On Node.js 22.8 or newer, `npm run test:coverage` enforces an 85% line minimum for `src/`, excluding the generated Unicode data table. CI enforces this on Node.js 22. There is currently no separate typecheck command.

The README demo captures the real CLI handler output from a checked-in fixture. Run `npm run demo` after intentional CLI output changes and review `docs/demo.svg`. Keep [README.md](README.md) and [README.tr.md](README.tr.md) structurally in sync.

Or run individual tests:

```bash
node --test test/width.test.js
node --test test/parser.test.js
node --test test/formatter.test.js
node --test test/convert.test.js
node --test test/sort.test.js
node --test test/lint.test.js
node --test test/cli-unit.test.js
node --test test/cli.test.js
```

## Pull Request Guidelines

1. Ensure all tests pass prior to submitting your pull request.
2. Add corresponding tests for any new features or bug fixes.
3. Adhere to Conventional Commits format for commit messages:
   - `feat: add support for ...`
   - `fix: resolve issue with ...`
   - `docs: update documentation ...`
   - `test: add coverage for ...`
   - `refactor: simplify ...`
4. Do not introduce external runtime dependencies. Zero runtime dependencies is a core architectural requirement.
5. Do not include emojis or promotional text in code comments or documentation.
