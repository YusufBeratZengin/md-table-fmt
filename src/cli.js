import fs from 'node:fs';
import path from 'node:path';
import { formatMarkdown } from './formatter.js';
import { lintMarkdown, formatLintReport } from './lint.js';
import {
  csvToMarkdown,
  tsvToMarkdown,
  markdownToCsv,
  markdownToTsv,
  jsonToMarkdown,
  markdownToJson,
} from './convert.js';
import { sortMarkdown } from './sort.js';

const VERSION = '0.1.0';

/**
 * Read all data from stdin as string.
 * @returns {Promise<string>}
 */
export async function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

/**
 * Expand file arguments (including basic globs and directories).
 * @param {string[]} patterns
 * @returns {string[]}
 */
export function resolveFiles(patterns) {
  const result = new Set();

  function walkDir(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.name === 'node_modules' || entry.name === '.git') {
        continue;
      }
      if (entry.isDirectory()) {
        walkDir(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.markdown'))) {
        result.add(fullPath);
      }
    }
  }

  for (const pattern of patterns) {
    if (pattern === '-') {
      result.add('-');
      continue;
    }

    // Direct existing file
    if (fs.existsSync(pattern)) {
      const stat = fs.statSync(pattern);
      if (stat.isDirectory()) {
        walkDir(pattern);
      } else {
        result.add(pattern);
      }
      continue;
    }

    // Basic wildcard handling if shell didn't expand (e.g. Windows)
    if (pattern.includes('*')) {
      const isRecursive = pattern.includes('**');
      const ext = path.extname(pattern) || '.md';
      const baseDir = pattern.split('*')[0] || '.';
      const targetDir = path.resolve(baseDir.endsWith(path.sep) ? baseDir : path.dirname(baseDir));

      if (fs.existsSync(targetDir)) {
        if (isRecursive) {
          walkDir(targetDir);
        } else {
          try {
            const files = fs.readdirSync(targetDir);
            for (const f of files) {
              if (f.endsWith(ext)) {
                result.add(path.join(targetDir, f));
              }
            }
          } catch {
            // ignore
          }
        }
      }
    }
  }

  return Array.from(result);
}

/**
 * Parse CLI arguments into command, flags, and positional arguments.
 * @param {string[]} argv
 */
export function parseArgs(argv) {
  const args = argv.slice(2);
  const flags = {};
  const positionals = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--') {
      positionals.push(...args.slice(i + 1));
      break;
    }

    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      if (key.includes('=')) {
        const [k, v] = key.split('=');
        flags[k] = v;
      } else if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
        // Look ahead for value if expected
        if (['by', 'delimiter', 'table', 'indent', 'output'].includes(key)) {
          flags[key] = args[++i];
        } else {
          flags[key] = true;
        }
      } else {
        flags[key] = true;
      }
    } else if (arg.startsWith('-') && arg.length > 1 && arg !== '-') {
      const key = arg.slice(1);
      if (['b', 'd', 't', 'i', 'o'].includes(key) && i + 1 < args.length && !args[i + 1].startsWith('-')) {
        flags[key] = args[++i];
      } else {
        for (const char of key) {
          flags[char] = true;
        }
      }
    } else {
      positionals.push(arg);
    }
  }

  return { command: positionals[0], positionals: positionals.slice(1), flags };
}

/**
 * Print CLI help text.
 */
export function printHelp() {
  console.log(`md-table-fmt v${VERSION} — Format, lint, and convert Markdown tables (GFM)

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
  -h, --help                   Show this help message
  -v, --version                Show version number
`);
}

/**
 * Main CLI runner.
 * @param {string[]} argv
 * @returns {Promise<number>} Exit code
 */
export async function runCli(argv = process.argv) {
  const { command, positionals, flags } = parseArgs(argv);

  if (flags.help || flags.h || command === 'help') {
    printHelp();
    return 0;
  }

  if (flags.version || flags.v || command === 'version') {
    console.log(`md-table v${VERSION}`);
    return 0;
  }

  if (!command) {
    printHelp();
    return 1;
  }

  try {
    switch (command) {
      case 'fmt': {
        const isCheck = Boolean(flags.check || flags.c);
        const toStdout = Boolean(flags.stdout);
        const files = positionals.length > 0 ? resolveFiles(positionals) : ['-'];

        let hasDiff = false;

        for (const file of files) {
          const content = file === '-' ? await readStdin() : fs.readFileSync(file, 'utf-8');
          const formatted = formatMarkdown(content);

          if (content !== formatted) {
            hasDiff = true;
            if (isCheck) {
              console.error(`Needs formatting: ${file === '-' ? '<stdin>' : file}`);
            }
          }

          if (!isCheck) {
            if (file === '-' || toStdout) {
              process.stdout.write(formatted);
            } else {
              fs.writeFileSync(file, formatted, 'utf-8');
            }
          }
        }

        if (isCheck && hasDiff) {
          return 1;
        }
        return 0;
      }

      case 'lint': {
        const strict = Boolean(flags.strict);
        const files = positionals.length > 0 ? resolveFiles(positionals) : ['-'];
        let hasErrors = false;

        for (const file of files) {
          const content = file === '-' ? await readStdin() : fs.readFileSync(file, 'utf-8');
          const issues = lintMarkdown(content, { strict });

          if (issues.length > 0) {
            const report = formatLintReport(file === '-' ? '<stdin>' : file, issues);
            console.error(report);
            if (issues.some((i) => i.severity === 'error') || strict) {
              hasErrors = true;
            }
          }
        }

        return hasErrors ? 1 : 0;
      }

      case 'from-csv': {
        const isTsv = Boolean(flags.tsv || flags.t);
        const delimiter = flags.delimiter || flags.d || (isTsv ? '\t' : ',');
        const targetFile = positionals[0] || '-';
        const content = targetFile === '-' ? await readStdin() : fs.readFileSync(targetFile, 'utf-8');

        const md = isTsv ? tsvToMarkdown(content) : csvToMarkdown(content, { delimiter });
        process.stdout.write(md + (md.endsWith('\n') ? '' : '\n'));
        return 0;
      }

      case 'to-csv': {
        const isTsv = Boolean(flags.tsv || flags.t);
        const delimiter = flags.delimiter || flags.d || (isTsv ? '\t' : ',');
        const tableIndex = flags.table !== undefined ? Number(flags.table) : 0;
        const targetFile = positionals[0] || '-';
        const content = targetFile === '-' ? await readStdin() : fs.readFileSync(targetFile, 'utf-8');

        const result = isTsv
          ? markdownToTsv(content, { tableIndex })
          : markdownToCsv(content, { delimiter, tableIndex });

        process.stdout.write(result + (result.endsWith('\n') ? '' : '\n'));
        return 0;
      }

      case 'from-json': {
        const targetFile = positionals[0] || '-';
        const content = targetFile === '-' ? await readStdin() : fs.readFileSync(targetFile, 'utf-8');
        const md = jsonToMarkdown(content);
        process.stdout.write(md + (md.endsWith('\n') ? '' : '\n'));
        return 0;
      }

      case 'to-json': {
        const tableIndex = flags.table !== undefined ? Number(flags.table) : 0;
        const indent = flags.indent !== undefined ? Number(flags.indent) : 2;
        const targetFile = positionals[0] || '-';
        const content = targetFile === '-' ? await readStdin() : fs.readFileSync(targetFile, 'utf-8');

        const json = markdownToJson(content, { tableIndex, indent });
        process.stdout.write(json + '\n');
        return 0;
      }

      case 'sort': {
        const by = flags.by || flags.b;
        if (!by) {
          console.error('Error: --by <column> is required for sort');
          return 1;
        }

        const desc = Boolean(flags.desc);
        const numeric = flags.numeric ? true : undefined;
        const inPlace = Boolean(flags['in-place'] || flags.i);
        const tableIndex = flags.table !== undefined ? Number(flags.table) : 0;
        const targetFile = positionals[0] || '-';

        const content = targetFile === '-' ? await readStdin() : fs.readFileSync(targetFile, 'utf-8');
        const sorted = sortMarkdown(content, { by, desc, numeric, tableIndex });

        if (inPlace && targetFile !== '-') {
          fs.writeFileSync(targetFile, sorted, 'utf-8');
        } else {
          process.stdout.write(sorted + (sorted.endsWith('\n') ? '' : '\n'));
        }
        return 0;
      }

      default:
        console.error(`Unknown command: ${command}`);
        printHelp();
        return 1;
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    return 1;
  }
}
