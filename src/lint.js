import {
  parseMarkdown,
  splitRow,
  isDelimiterRow,
  isTableRowCandidate,
} from './parser.js';
import { formatTableLines } from './formatter.js';

/**
 * @typedef {Object} LintIssue
 * @property {number} line 1-based line number
 * @property {number} column 1-based column number
 * @property {string} rule Rule name ('inconsistent-columns' | 'missing-header-separator' | 'trailing-spaces' | 'misaligned')
 * @property {'error' | 'warning'} severity
 * @property {string} message Description of the problem
 */

/**
 * Lint Markdown content for table issues.
 *
 * @param {string} markdown
 * @param {Object} [options]
 * @param {boolean} [options.strict=false] If true, treat warnings as errors
 * @returns {LintIssue[]}
 */
export function lintMarkdown(markdown, options = {}) {
  const issues = [];
  const lines = markdown.split(/\r?\n/);

  // 1. Check for trailing spaces and missing header separators line-by-line
  let inFencedBlock = false;
  let fenceChar = '';
  let fenceLength = 0;

  // Track lines that are part of parsed valid tables
  const tableLineSet = new Set();
  const { chunks } = parseMarkdown(markdown);
  for (const chunk of chunks) {
    if (chunk.type === 'table') {
      for (let l = chunk.table.startLine; l < chunk.table.endLine; l++) {
        tableLineSet.add(l);
      }
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];

    // Fenced block tracking
    if (!inFencedBlock) {
      const fenceMatch = rawLine.match(/^( {0,3})(`{3,}|~{3,})(.*)$/);
      if (fenceMatch) {
        inFencedBlock = true;
        fenceChar = fenceMatch[2][0];
        fenceLength = fenceMatch[2].length;
        continue;
      }
    } else {
      const closeFenceMatch = rawLine.match(/^( {0,3})(`{3,}|~{3,})\s*$/);
      if (
        closeFenceMatch &&
        closeFenceMatch[2][0] === fenceChar &&
        closeFenceMatch[2].length >= fenceLength
      ) {
        inFencedBlock = false;
        fenceChar = '';
        fenceLength = 0;
      }
      continue;
    }

    // Check trailing spaces on table candidate or in-table lines
    if (tableLineSet.has(i) || isTableRowCandidate(rawLine)) {
      if (/[ \t]+$/.test(rawLine)) {
        issues.push({
          line: i + 1,
          column: rawLine.replace(/[ \t]+$/, '').length + 1,
          rule: 'trailing-spaces',
          severity: 'error',
          message: 'Table row contains trailing whitespace',
        });
      }
    }

    // Check for missing header separator
    // If line looks like a table row with pipes, followed by another table row,
    // but neither line i nor i+1 is a delimiter row, and neither is in tableLineSet
    if (
      !tableLineSet.has(i) &&
      isTableRowCandidate(rawLine) &&
      i + 1 < lines.length &&
      isTableRowCandidate(lines[i + 1]) &&
      !isDelimiterRow(lines[i + 1]) &&
      !tableLineSet.has(i + 1)
    ) {
      issues.push({
        line: i + 2,
        column: 1,
        rule: 'missing-header-separator',
        severity: 'error',
        message: 'Table header row is missing a delimiter separator row (e.g. |---|---|)',
      });
      // Skip i+1 so we don't duplicate warning on contiguous lines
      i++;
    }
  }

  // 2. Lint parsed tables: inconsistent column count & misalignment
  for (const chunk of chunks) {
    if (chunk.type !== 'table') continue;

    const { table } = chunk;
    const expectedCols = table.alignments.length;

    // Check header column count
    if (table.header.length !== expectedCols) {
      issues.push({
        line: table.startLine + 1,
        column: 1,
        rule: 'inconsistent-columns',
        severity: 'error',
        message: `Header has ${table.header.length} column(s); expected ${expectedCols} based on delimiter row`,
      });
    }

    // Check body rows column count
    for (let r = 0; r < table.rows.length; r++) {
      const row = table.rows[r];
      if (row.length !== expectedCols) {
        issues.push({
          line: table.startLine + 3 + r,
          column: 1,
          rule: 'inconsistent-columns',
          severity: 'error',
          message: `Data row has ${row.length} column(s); expected ${expectedCols}`,
        });
      }
    }

    // Check table misalignment
    const originalLines = [table.rawHeader, table.rawDelimiter, ...table.rawRows];
    const formattedLines = formatTableLines(table);
    const isMisaligned = originalLines.some((orig, idx) => orig !== formattedLines[idx]);

    if (isMisaligned) {
      issues.push({
        line: table.startLine + 1,
        column: 1,
        rule: 'misaligned',
        severity: options.strict ? 'error' : 'warning',
        message: 'Table columns are misaligned',
      });
    }
  }

  // Sort issues by line number then column
  issues.sort((a, b) => a.line - b.line || a.column - b.column);
  return issues;
}

/**
 * Format lint issues into human-readable terminal output.
 * @param {string} filePath
 * @param {LintIssue[]} issues
 * @returns {string}
 */
export function formatLintReport(filePath, issues) {
  if (issues.length === 0) return '';

  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;

  const lines = [`${filePath}:`];
  for (const issue of issues) {
    const tag = issue.severity === 'error' ? 'ERROR' : 'WARN ';
    lines.push(`  ${issue.line}:${issue.column}  ${tag}  ${issue.message} (${issue.rule})`);
  }

  lines.push(`\n${errorCount} error(s), ${warningCount} warning(s) found in ${filePath}`);
  return lines.join('\n');
}
