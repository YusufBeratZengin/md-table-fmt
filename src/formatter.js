import { stringWidth, padCell } from './width.js';
import { parseMarkdown, splitRow, isDelimiterRow, parseAlignment } from './parser.js';

/**
 * Format a single delimiter cell.
 * @param {'left' | 'right' | 'center' | 'none'} align
 * @param {number} width
 * @returns {string}
 */
export function formatDelimiterCell(align, width) {
  const targetWidth = Math.max(3, width);

  if (align === 'center') {
    const dashes = Math.max(1, targetWidth - 2);
    return `:${'-'.repeat(dashes)}:`;
  }

  if (align === 'right') {
    const dashes = Math.max(1, targetWidth - 1);
    return `${'-'.repeat(dashes)}:`;
  }

  if (align === 'left') {
    const dashes = Math.max(1, targetWidth - 1);
    return `:${'-'.repeat(dashes)}`;
  }

  // 'none'
  return '-'.repeat(targetWidth);
}

/**
 * Format a TableAST or table lines into neatly aligned table lines.
 *
 * @param {import('./parser.js').TableAST | { header: string[], alignments: string[], rows: string[][], indent?: string }} table
 * @param {Object} [options]
 * @param {boolean} [options.alignHeader=true]
 * @returns {string[]} Formatted lines
 */
export function formatTableLines(table, options = {}) {
  const alignHeader = options.alignHeader ?? true;
  const indent = table.indent || '';

  const header = table.header || [];
  const alignments = table.alignments || [];
  const rows = table.rows || [];

  // Determine total column count across header, alignments, and all body rows
  let colCount = Math.max(header.length, alignments.length);
  for (const row of rows) {
    if (row.length > colCount) {
      colCount = row.length;
    }
  }

  if (colCount === 0) {
    return [];
  }

  // Normalize header and alignments to colCount
  const normalizedHeader = Array.from({ length: colCount }, (_, i) => header[i] ?? '');
  const normalizedAlignments = Array.from({ length: colCount }, (_, i) => alignments[i] ?? 'none');

  // Normalize all rows to colCount
  const normalizedRows = rows.map((row) =>
    Array.from({ length: colCount }, (_, i) => row[i] ?? '')
  );

  // Compute maximum width for each column (minimum 3 for delimiter display)
  const colWidths = new Array(colCount).fill(3);

  for (let c = 0; c < colCount; c++) {
    const hWidth = stringWidth(normalizedHeader[c]);
    if (hWidth > colWidths[c]) colWidths[c] = hWidth;

    for (const row of normalizedRows) {
      const cellWidth = stringWidth(row[c]);
      if (cellWidth > colWidths[c]) colWidths[c] = cellWidth;
    }
  }

  const lines = [];

  // 1. Header row
  const formattedHeaderCells = normalizedHeader.map((cell, c) => {
    const align = alignHeader ? normalizedAlignments[c] : 'left';
    return padCell(cell, colWidths[c], align === 'none' ? 'left' : align);
  });
  lines.push(`${indent}| ${formattedHeaderCells.join(' | ')} |`);

  // 2. Delimiter row
  const formattedDelimiterCells = normalizedAlignments.map((align, c) =>
    formatDelimiterCell(align, colWidths[c])
  );
  lines.push(`${indent}| ${formattedDelimiterCells.join(' | ')} |`);

  // 3. Body rows
  for (const row of normalizedRows) {
    const formattedCells = row.map((cell, c) => {
      const align = normalizedAlignments[c];
      return padCell(cell, colWidths[c], align === 'none' ? 'left' : align);
    });
    lines.push(`${indent}| ${formattedCells.join(' | ')} |`);
  }

  return lines;
}

/**
 * Format a standalone table string.
 *
 * @param {string} tableString
 * @param {Object} [options]
 * @returns {string}
 */
export function formatTable(tableString, options = {}) {
  const lines = tableString.trim().split(/\r?\n/);
  if (lines.length < 2) return tableString;

  const headerLine = lines[0];
  const delimiterLine = lines[1];

  if (!isDelimiterRow(delimiterLine)) {
    return tableString;
  }

  const header = splitRow(headerLine);
  const alignments = splitRow(delimiterLine).map(parseAlignment);
  const rows = lines.slice(2).map(splitRow);

  const formatted = formatTableLines({ header, alignments, rows }, options);
  return formatted.join('\n');
}

/**
 * Format all tables inside a Markdown document, skipping fenced code blocks,
 * and preserving everything else byte-for-byte.
 *
 * @param {string} markdown
 * @param {Object} [options]
 * @returns {string}
 */
export function formatMarkdown(markdown, options = {}) {
  const { chunks, lineEnding } = parseMarkdown(markdown);

  const outputParts = [];
  for (const chunk of chunks) {
    if (chunk.type === 'text') {
      outputParts.push(chunk.lines.join(lineEnding));
    } else if (chunk.type === 'table') {
      const formattedLines = formatTableLines(chunk.table, options);
      outputParts.push(formattedLines.join(lineEnding));
    }
  }

  return outputParts.join(lineEnding);
}
