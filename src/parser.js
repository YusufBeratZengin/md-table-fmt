/**
 * GFM Markdown Table Parser
 *
 * Skips fenced code blocks (``` and ~~~) and extracts tables,
 * preserving all non-table content and line endings.
 */

/**
 * Check if the character at index in str is escaped by an odd number of backslashes.
 * @param {string} str
 * @param {number} index
 * @returns {boolean}
 */
export function isCharEscaped(str, index) {
  let slashes = 0;
  for (let i = index - 1; i >= 0 && str[i] === '\\'; i--) {
    slashes++;
  }
  return slashes % 2 === 1;
}

/**
 * Split a table row line into cells, respecting backtick code spans and escaped pipes.
 *
 * @param {string} line
 * @returns {string[]}
 */
export function splitRow(line) {
  const leadingSpaceMatch = line.match(/^\s*/);
  const leadingSpaces = leadingSpaceMatch ? leadingSpaceMatch[0].length : 0;
  let text = line.slice(leadingSpaces);

  // Check if first char is an unescaped pipe
  let hasLeadingPipe = false;
  if (text.startsWith('|')) {
    hasLeadingPipe = true;
    text = text.slice(1);
  }

  // Check if last non-space char is an unescaped pipe
  const trailingSpaceMatch = text.match(/\s*$/);
  const trailingSpaces = trailingSpaceMatch ? trailingSpaceMatch[0].length : 0;
  const contentLen = text.length - trailingSpaces;

  if (contentLen > 0 && text[contentLen - 1] === '|' && !isCharEscaped(text, contentLen - 1)) {
    text = text.slice(0, contentLen - 1);
  } else if (trailingSpaces > 0) {
    text = text.slice(0, text.length - trailingSpaces);
  }

  const cells = [];
  let currentCell = '';
  let inCodeSpan = false;
  let codeFenceLength = 0;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    // Backtick code span tracking
    if (ch === '`') {
      let tickCount = 1;
      while (i + tickCount < text.length && text[i + tickCount] === '`') {
        tickCount++;
      }
      if (!inCodeSpan) {
        inCodeSpan = true;
        codeFenceLength = tickCount;
      } else if (tickCount === codeFenceLength) {
        inCodeSpan = false;
        codeFenceLength = 0;
      }
      currentCell += text.slice(i, i + tickCount);
      i += tickCount;
      continue;
    }

    // Escaped character (e.g. \| or \` or \\)
    if (ch === '\\' && i + 1 < text.length) {
      currentCell += text[i] + text[i + 1];
      i += 2;
      continue;
    }

    // Pipe separator outside code span
    if (ch === '|' && !inCodeSpan) {
      cells.push(currentCell.trim());
      currentCell = '';
      i++;
      continue;
    }

    currentCell += ch;
    i++;
  }

  cells.push(currentCell.trim());

  // If the line was just "|" or empty with leading/trailing pipes
  if (hasLeadingPipe && cells.length === 1 && cells[0] === '') {
    return [''];
  }

  return cells;
}

/**
 * Check if a cell conforms to GFM delimiter cell syntax:
 * Optional whitespace, optional colon, at least one hyphen, optional colon, optional whitespace.
 * e.g. "---", ":---", "---:", ":---:", ":-:"
 *
 * @param {string} cell
 * @returns {boolean}
 */
export function isDelimiterCell(cell) {
  return /^\s*:?-+:?\s*$/.test(cell);
}

/**
 * Parse alignment from a delimiter cell string.
 * @param {string} cell
 * @returns {'left' | 'right' | 'center' | 'none'}
 */
export function parseAlignment(cell) {
  const trimmed = cell.trim();
  const leftColon = trimmed.startsWith(':');
  const rightColon = trimmed.endsWith(':');

  if (leftColon && rightColon) return 'center';
  if (rightColon) return 'right';
  if (leftColon) return 'left';
  return 'none';
}

/**
 * Check if a line is a valid GFM table delimiter row.
 * Delimiter row must have at least one cell and every cell must be a valid delimiter cell.
 *
 * @param {string} line
 * @returns {boolean}
 */
export function isDelimiterRow(line) {
  const trimmed = line.trim();
  if (!trimmed || !trimmed.includes('-')) return false;
  // Delimiter row can only contain |, -, :, and whitespace
  if (!/^[|\-:\s]+$/.test(trimmed)) return false;

  const cells = splitRow(line);
  if (cells.length === 0) return false;

  return cells.every(isDelimiterCell);
}

/**
 * Check if a line looks like a potential table row.
 * Must contain at least one pipe or begin/end with pipe, indented <= 3 spaces.
 *
 * @param {string} line
 * @returns {boolean}
 */
export function isTableRowCandidate(line) {
  // CommonMark table indentation must be < 4 spaces
  const indentMatch = line.match(/^( {0,3})/);
  if (!indentMatch) return false;

  const trimmed = line.trim();
  if (trimmed.length === 0) return false;

  // Must contain an unescaped pipe
  for (let i = 0; i < trimmed.length; i++) {
    if (trimmed[i] === '|' && !isCharEscaped(trimmed, i)) {
      return true;
    }
  }

  return false;
}

/**
 * @typedef {Object} TableAST
 * @property {number} startLine 0-based start line in source lines array
 * @property {number} endLine 0-based end line (exclusive) in source lines array
 * @property {string} indent Leading indentation of the table
 * @property {string[]} header Header row cells
 * @property {string} rawHeader Original header line text
 * @property {Array<'left' | 'right' | 'center' | 'none'>} alignments Column alignments
 * @property {string} rawDelimiter Original delimiter line text
 * @property {string[][]} rows Array of body row cells
 * @property {string[]} rawRows Original body lines text
 */

/**
 * @typedef {Object} ParseChunk
 * @property {'text' | 'table'} type
 * @property {string[]} [lines] For 'text' chunk
 * @property {TableAST} [table] For 'table' chunk
 */

/**
 * Parse a Markdown string into a series of text and table chunks,
 * strictly skipping fenced code blocks (``` and ~~~).
 *
 * @param {string} markdown
 * @returns {{ chunks: ParseChunk[], lineEnding: string }}
 */
export function parseMarkdown(markdown) {
  // Detect line endings: CRLF or LF
  const hasCRLF = markdown.includes('\r\n');
  const lineEnding = hasCRLF ? '\r\n' : '\n';

  // Normalize split
  const lines = markdown.split(/\r?\n/);
  const chunks = [];

  let currentTextLines = [];
  let inFencedBlock = false;
  let fenceChar = '';
  let fenceLength = 0;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Check fenced code block
    if (!inFencedBlock) {
      const fenceMatch = line.match(/^( {0,3})(`{3,}|~{3,})(.*)$/);
      if (fenceMatch) {
        inFencedBlock = true;
        fenceChar = fenceMatch[2][0];
        fenceLength = fenceMatch[2].length;
        currentTextLines.push(line);
        i++;
        continue;
      }
    } else {
      // Check closing fence
      const closeFenceMatch = line.match(/^( {0,3})(`{3,}|~{3,})\s*$/);
      if (
        closeFenceMatch &&
        closeFenceMatch[2][0] === fenceChar &&
        closeFenceMatch[2].length >= fenceLength
      ) {
        inFencedBlock = false;
        fenceChar = '';
        fenceLength = 0;
      }
      currentTextLines.push(line);
      i++;
      continue;
    }

    // Check if line can start a table:
    // Requires:
    // 1) line is candidate header row
    // 2) next line exists and is a valid delimiter row
    if (i + 1 < lines.length && isTableRowCandidate(line) && isDelimiterRow(lines[i + 1])) {
      const headerLine = line;
      const delimiterLine = lines[i + 1];

      // Indentation of the table (from header line)
      const indentMatch = headerLine.match(/^(\s*)/);
      const indent = indentMatch ? indentMatch[1] : '';

      const headerCells = splitRow(headerLine);
      const delimiterCells = splitRow(delimiterLine);
      const alignments = delimiterCells.map(parseAlignment);

      const bodyRows = [];
      const rawRows = [];

      let j = i + 2;
      while (j < lines.length) {
        const bodyLine = lines[j];
        // Empty line or non-candidate ends table
        if (bodyLine.trim() === '' || !isTableRowCandidate(bodyLine)) {
          break;
        }
        // Fenced code block or heading ends table
        if (/^( {0,3})(`{3,}|~{3,})/.test(bodyLine) || /^( {0,3})#{1,6}\s/.test(bodyLine)) {
          break;
        }

        bodyRows.push(splitRow(bodyLine));
        rawRows.push(bodyLine);
        j++;
      }

      // Flush accumulated text lines
      if (currentTextLines.length > 0) {
        chunks.push({ type: 'text', lines: currentTextLines });
        currentTextLines = [];
      }

      chunks.push({
        type: 'table',
        table: {
          startLine: i,
          endLine: j,
          indent,
          header: headerCells,
          rawHeader: headerLine,
          alignments,
          rawDelimiter: delimiterLine,
          rows: bodyRows,
          rawRows,
        },
      });

      i = j;
      continue;
    }

    currentTextLines.push(line);
    i++;
  }

  if (currentTextLines.length > 0) {
    chunks.push({ type: 'text', lines: currentTextLines });
  }

  return { chunks, lineEnding };
}
