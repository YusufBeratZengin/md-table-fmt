import { parseMarkdown } from './parser.js';
import { formatTableLines } from './formatter.js';

/**
 * Determine if all non-empty values in an array are valid numbers.
 * @param {string[]} values
 * @returns {boolean}
 */
function isNumericColumn(values) {
  const nonEmpties = values.filter((v) => v.trim() !== '');
  if (nonEmpties.length === 0) return false;

  return nonEmpties.every((v) => {
    const cleaned = v.replace(/[$,]/g, '').trim();
    return !Number.isNaN(Number(cleaned));
  });
}

/**
 * Compare two string cell values.
 *
 * @param {string} a
 * @param {string} b
 * @param {boolean} numeric
 * @param {boolean} desc
 * @returns {number}
 */
function compareCells(a, b, numeric, desc) {
  let cmp = 0;
  if (numeric) {
    const numA = Number(a.replace(/[$,]/g, '').trim()) || 0;
    const numB = Number(b.replace(/[$,]/g, '').trim()) || 0;
    cmp = numA - numB;
  } else {
    cmp = a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  }
  return desc ? -cmp : cmp;
}

/**
 * Sort rows in a table AST by specified column.
 *
 * @param {import('./parser.js').TableAST} table
 * @param {Object} options
 * @param {string | number} options.by Column name or 1-based / 0-based column index
 * @param {boolean} [options.desc=false]
 * @param {boolean} [options.numeric]
 * @returns {import('./parser.js').TableAST}
 */
export function sortTableAST(table, options = {}) {
  const by = options.by;
  const desc = options.desc ?? false;

  if (by === undefined || by === null || by === '') {
    throw new Error('Sort option "by" is required');
  }

  let colIndex = -1;

  // Check if "by" is a numeric index
  const byNum = Number(by);
  if (!Number.isNaN(byNum)) {
    // Treat 1-based index first if within 1..colCount, else 0-based
    if (byNum >= 1 && byNum <= table.header.length) {
      colIndex = byNum - 1;
    } else if (byNum === 0 && table.header.length > 0) {
      colIndex = 0;
    }
  }

  // If not matched by index, match by header name (case-insensitive)
  if (colIndex === -1) {
    const byNormalized = String(by).trim().toLowerCase();
    colIndex = table.header.findIndex(
      (h) => h.trim().toLowerCase() === byNormalized
    );
  }

  if (colIndex === -1) {
    throw new Error(
      `Column "${by}" not found in table headers: [${table.header.join(', ')}]`
    );
  }

  // Determine whether to sort numerically
  const colValues = table.rows.map((row) => row[colIndex] ?? '');
  const numeric = options.numeric ?? isNumericColumn(colValues);

  // Stable sort rows
  const sortedRows = table.rows.slice().sort((rowA, rowB) => {
    const valA = rowA[colIndex] ?? '';
    const valB = rowB[colIndex] ?? '';
    return compareCells(valA, valB, numeric, desc);
  });

  return {
    ...table,
    rows: sortedRows,
  };
}

/**
 * Sort table(s) in a Markdown string by the specified column.
 * Skips fenced code blocks and preserves non-table content byte-for-byte.
 *
 * @param {string} markdown
 * @param {Object} options
 * @param {string | number} options.by
 * @param {boolean} [options.desc=false]
 * @param {boolean} [options.numeric]
 * @param {number | 'all'} [options.tableIndex=0]
 * @returns {string}
 */
export function sortMarkdown(markdown, options = {}) {
  const tableIndex = options.tableIndex ?? 0;
  const { chunks, lineEnding } = parseMarkdown(markdown);

  let currentTableIdx = 0;
  const outputParts = [];

  for (const chunk of chunks) {
    if (chunk.type === 'text') {
      outputParts.push(chunk.lines.join(lineEnding));
    } else if (chunk.type === 'table') {
      if (tableIndex === 'all' || tableIndex === currentTableIdx) {
        const sortedAST = sortTableAST(chunk.table, options);
        outputParts.push(formatTableLines(sortedAST).join(lineEnding));
      } else {
        outputParts.push(formatTableLines(chunk.table).join(lineEnding));
      }
      currentTableIdx++;
    }
  }

  return outputParts.join(lineEnding);
}
