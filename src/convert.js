import { parseMarkdown } from './parser.js';
import { formatTableLines } from './formatter.js';

/**
 * Parse CSV or TSV text adhering to RFC 4180.
 *
 * @param {string} text
 * @param {string} [delimiter=',']
 * @returns {string[][]}
 */
export function parseCsv(text, delimiter = ',') {
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          currentField += '"';
          i += 2;
          continue;
        } else {
          inQuotes = false;
          i++;
          continue;
        }
      }
      currentField += ch;
      i++;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }

    if (ch === delimiter) {
      currentRow.push(currentField);
      currentField = '';
      i++;
      continue;
    }

    if (ch === '\r') {
      if (i + 1 < text.length && text[i + 1] === '\n') {
        i++;
      }
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = '';
      i++;
      continue;
    }

    if (ch === '\n') {
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = '';
      i++;
      continue;
    }

    currentField += ch;
    i++;
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  // Remove trailing blank row from trailing newline
  if (rows.length > 0 && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === '') {
    rows.pop();
  }

  return rows;
}

/**
 * Serialize a row of fields to RFC 4180 CSV line.
 * @param {string[]} fields
 * @param {string} [delimiter=',']
 * @returns {string}
 */
export function serializeCsvRow(fields, delimiter = ',') {
  return fields
    .map((field) => {
      const str = String(field ?? '');
      if (
        str.includes(delimiter) ||
        str.includes('"') ||
        str.includes('\n') ||
        str.includes('\r')
      ) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    })
    .join(delimiter);
}

/**
 * Sanitize cell content for Markdown:
 * Converts raw newlines to `<br>`, and escapes unescaped pipes `|`.
 *
 * @param {string} cell
 * @returns {string}
 */
export function escapeMarkdownCell(cell) {
  let result = cell.replace(/\r?\n/g, '<br>');
  // Escape unescaped pipes
  let escaped = '';
  for (let i = 0; i < result.length; i++) {
    if (result[i] === '|' && (i === 0 || result[i - 1] !== '\\')) {
      escaped += '\\|';
    } else {
      escaped += result[i];
    }
  }
  return escaped;
}

/**
 * Unescape a Markdown cell for CSV/JSON:
 * Converts `\|` back to `|`, and `<br>` back to newline.
 *
 * @param {string} cell
 * @returns {string}
 */
export function unescapeMarkdownCell(cell) {
  return cell.replace(/\\\|/g, '|').replace(/<br\s*\/?>/gi, '\n');
}

/**
 * Convert CSV text to a formatted Markdown table.
 *
 * @param {string} csvText
 * @param {Object} [options]
 * @param {string} [options.delimiter=',']
 * @param {Array<'left'|'right'|'center'|'none'>} [options.alignments]
 * @returns {string}
 */
export function csvToMarkdown(csvText, options = {}) {
  const delimiter = options.delimiter || ',';
  const rawRows = parseCsv(csvText, delimiter);

  if (rawRows.length === 0) return '';

  const header = rawRows[0].map(escapeMarkdownCell);
  const alignments = options.alignments || new Array(header.length).fill('none');
  const rows = rawRows.slice(1).map((r) => r.map(escapeMarkdownCell));

  const lines = formatTableLines({ header, alignments, rows });
  return lines.join('\n');
}

/**
 * Convert TSV text to a formatted Markdown table.
 *
 * @param {string} tsvText
 * @param {Object} [options]
 * @returns {string}
 */
export function tsvToMarkdown(tsvText, options = {}) {
  return csvToMarkdown(tsvText, { ...options, delimiter: '\t' });
}

/**
 * Convert Markdown table(s) to CSV text.
 *
 * @param {string} markdown
 * @param {Object} [options]
 * @param {string} [options.delimiter=',']
 * @param {number} [options.tableIndex=0] 0-based index of table to extract
 * @returns {string}
 */
export function markdownToCsv(markdown, options = {}) {
  const delimiter = options.delimiter || ',';
  const tableIndex = options.tableIndex ?? 0;
  const { chunks } = parseMarkdown(markdown);

  const tables = chunks.filter((c) => c.type === 'table').map((c) => c.table);
  if (tables.length === 0) return '';

  const targetTable = tables[tableIndex] || tables[0];
  const allRows = [
    targetTable.header.map(unescapeMarkdownCell),
    ...targetTable.rows.map((row) => row.map(unescapeMarkdownCell)),
  ];

  return allRows.map((row) => serializeCsvRow(row, delimiter)).join('\n');
}

/**
 * Convert Markdown table(s) to TSV text.
 *
 * @param {string} markdown
 * @param {Object} [options]
 * @returns {string}
 */
export function markdownToTsv(markdown, options = {}) {
  return markdownToCsv(markdown, { ...options, delimiter: '\t' });
}

/**
 * Convert JSON (array of objects or array of arrays) to a formatted Markdown table.
 *
 * @param {string | object[]} jsonData
 * @param {Object} [options]
 * @returns {string}
 */
export function jsonToMarkdown(jsonData, options = {}) {
  const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;

  if (!Array.isArray(data) || data.length === 0) {
    return '';
  }

  // Case 1: Array of arrays
  if (Array.isArray(data[0])) {
    const header = data[0].map((v) => escapeMarkdownCell(String(v ?? '')));
    const alignments = options.alignments || new Array(header.length).fill('none');
    const rows = data.slice(1).map((row) =>
      row.map((v) => escapeMarkdownCell(String(v ?? '')))
    );
    return formatTableLines({ header, alignments, rows }).join('\n');
  }

  // Case 2: Array of objects
  const keySet = new Set();
  for (const item of data) {
    if (item && typeof item === 'object') {
      for (const k of Object.keys(item)) {
        keySet.add(k);
      }
    }
  }

  const header = Array.from(keySet);
  const alignments = options.alignments || new Array(header.length).fill('none');
  const rows = data.map((item) =>
    header.map((k) => escapeMarkdownCell(String(item[k] ?? '')))
  );

  return formatTableLines({ header, alignments, rows }).join('\n');
}

/**
 * Convert Markdown table(s) to JSON array of objects.
 *
 * @param {string} markdown
 * @param {Object} [options]
 * @param {number} [options.tableIndex=0]
 * @param {number} [options.indent=2]
 * @returns {string}
 */
export function markdownToJson(markdown, options = {}) {
  const tableIndex = options.tableIndex ?? 0;
  const indent = options.indent ?? 2;
  const { chunks } = parseMarkdown(markdown);

  const tables = chunks.filter((c) => c.type === 'table').map((c) => c.table);
  if (tables.length === 0) return '[]';

  const targetTable = tables[tableIndex] || tables[0];
  const keys = targetTable.header.map(unescapeMarkdownCell);

  const result = targetTable.rows.map((row) => {
    const obj = {};
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i] || `col_${i + 1}`;
      obj[k] = unescapeMarkdownCell(row[i] ?? '');
    }
    return obj;
  });

  return JSON.stringify(result, null, indent);
}
