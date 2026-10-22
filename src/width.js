import { WIDE_RANGES, ZERO_WIDTH_RANGES, inRanges } from './unicode-data.js';

// Intl.Segmenter is standard in Node.js >= 16
const graphemeSegmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });

// ANSI escape sequence pattern
// eslint-disable-next-line no-control-regex
const ANSI_REGEX = /\u001b\[[0-9;]*[a-zA-Z]/g;

// Regional Indicator symbols (for country flags)
const REGIONAL_INDICATOR_REGEX = /\p{Regional_Indicator}/u;

// Emoji presentation property
const EMOJI_PRESENTATION_REGEX = /\p{Emoji_Presentation}/u;

// Combining marks
const COMBINING_REGEX = /^\p{M}+$/u;

/**
 * Remove ANSI escape codes from a string.
 * @param {string} str
 * @returns {string}
 */
export function stripAnsi(str) {
  if (typeof str !== 'string') return '';
  return str.replace(ANSI_REGEX, '');
}

/**
 * Determine display width of a single grapheme cluster.
 * @param {string} grapheme
 * @returns {number}
 */
export function graphemeWidth(grapheme) {
  if (!grapheme || grapheme.length === 0) return 0;

  // Zero-width spaces & format markers
  if (
    grapheme === '\u200B' ||
    grapheme === '\u200C' ||
    grapheme === '\u200D' ||
    grapheme === '\uFEFF' ||
    grapheme === '\u2060'
  ) {
    return 0;
  }

  // Purely combining mark sequence
  if (COMBINING_REGEX.test(grapheme)) {
    return 0;
  }

  // Text presentation selector forces width 1
  if (grapheme.includes('\uFE0E')) {
    return 1;
  }

  // Regional indicator pairs (flags) occupy 2 display cells
  if (REGIONAL_INDICATOR_REGEX.test(grapheme)) {
    return 2;
  }

  // Emoji presentation or emoji selector VS-16
  if (EMOJI_PRESENTATION_REGEX.test(grapheme) || grapheme.includes('\uFE0F')) {
    return 2;
  }

  const codePoint = grapheme.codePointAt(0);
  if (codePoint === undefined) return 0;

  if (inRanges(codePoint, ZERO_WIDTH_RANGES)) {
    return 0;
  }

  if (inRanges(codePoint, WIDE_RANGES)) {
    return 2;
  }

  return 1;
}

/**
 * Compute the terminal display width of a string.
 * Accurately accounts for East Asian Wide/Fullwidth, combining marks,
 * emojis, flags, ZWJ sequences, and ANSI escapes.
 *
 * @param {string} str
 * @returns {number}
 */
export function stringWidth(str) {
  if (!str) return 0;
  const clean = stripAnsi(str);
  let total = 0;
  for (const { segment } of graphemeSegmenter.segment(clean)) {
    total += graphemeWidth(segment);
  }
  return total;
}

/**
 * Pad a string to the given target display width using the specified alignment.
 *
 * @param {string} text
 * @param {number} targetWidth
 * @param {'left' | 'right' | 'center'} [align='left']
 * @returns {string}
 */
export function padCell(text, targetWidth, align = 'left') {
  const current = stringWidth(text);
  const diff = Math.max(0, targetWidth - current);

  if (diff === 0) return text;

  if (align === 'right') {
    return ' '.repeat(diff) + text;
  }

  if (align === 'center') {
    const left = Math.floor(diff / 2);
    const right = diff - left;
    return ' '.repeat(left) + text + ' '.repeat(right);
  }

  // default 'left'
  return text + ' '.repeat(diff);
}
