/**
 * Generates compact binary-searchable interval tables for Unicode East Asian Width
 * and zero-width code points.
 *
 * Run with: node scripts/generate-width-data.js
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Explicit known East Asian Wide and Fullwidth code point ranges according to UAX #11
const RAW_WIDE_RANGES = [
  [0x1100, 0x115F],   // Hangul Jamo
  [0x231A, 0x231B],   // Watch, Hourglass
  [0x2329, 0x232A],   // Left/Right-pointing angle bracket
  [0x23E9, 0x23EC],   // Fast-forward, etc.
  [0x23F0, 0x23F0],   // Alarm clock
  [0x23F3, 0x23F3],   // Hourglass with flowing sand
  [0x25FD, 0x25FE],   // Medium small square
  [0x2614, 0x2615],   // Umbrella with raindrops, Hot beverage
  [0x2648, 0x2653],   // Zodiac signs
  [0x267F, 0x267F],   // Wheelchair
  [0x2693, 0x2693],   // Anchor
  [0x26A1, 0x26A1],   // High voltage
  [0x26AA, 0x26AB],   // Circles
  [0x26BD, 0x26BE],   // Soccer, Baseball
  [0x26C4, 0x26C5],   // Snowman, Sun behind cloud
  [0x26CE, 0x26CE],   // Ophiuchus
  [0x26D4, 0x26D4],   // No entry
  [0x26EA, 0x26EA],   // Church
  [0x26F2, 0x26F3],   // Fountain, Golf
  [0x26F5, 0x26F5],   // Sailboat
  [0x26FA, 0x26FA],   // Tent
  [0x26FD, 0x26FD],   // Fuel pump
  [0x2705, 0x2705],   // White heavy check mark
  [0x270A, 0x270B],   // Fist, Hand
  [0x2728, 0x2728],   // Sparkles
  [0x274C, 0x274C],   // Cross mark
  [0x274E, 0x274E],   // Negative squared cross mark
  [0x2753, 0x2755],   // Question marks
  [0x2757, 0x2757],   // Exclamation mark
  [0x2795, 0x2797],   // Plus, Minus, Divide
  [0x27B0, 0x27B0],   // Curly loop
  [0x27BF, 0x27BF],   // Double curly loop
  [0x2B1B, 0x2B1C],   // Large black/white square
  [0x2B50, 0x2B50],   // Star
  [0x2B55, 0x2B55],   // Heavy large circle
  [0x2E80, 0x2E99],   // CJK Radicals Supplement
  [0x2E9B, 0x2EF3],
  [0x2F00, 0x2FD5],   // Kangxi Radicals
  [0x2FF0, 0x2FFB],   // Ideographic Description Characters
  [0x3000, 0x303E],   // CJK Symbols and Punctuation
  [0x3041, 0x3096],   // Hiragana
  [0x3099, 0x30FF],   // Katakana
  [0x3105, 0x312F],   // Bopomofo
  [0x3131, 0x318E],   // Hangul Compatibility Jamo
  [0x3190, 0x31BA],   // Kanbun, Bopomofo Extended
  [0x31C0, 0x31E3],   // CJK Strokes
  [0x31F0, 0x321E],   // Katakana Phonetic Extensions, Enclosed CJK
  [0x3220, 0x3247],
  [0x3250, 0x4DBF],   // Enclosed CJK, CJK Unified Ideographs Ext A
  [0x4E00, 0xA48C],   // CJK Unified Ideographs, Yi Syllables
  [0xA490, 0xA4C6],   // Yi Radicals
  [0xAC00, 0xD7A3],   // Hangul Syllables
  [0xF900, 0xFAFF],   // CJK Compatibility Ideographs
  [0xFE10, 0xFE19],   // Vertical Forms
  [0xFE30, 0xFE6F],   // CJK Compatibility Forms, Small Form Variants
  [0xFF01, 0xFF60],   // Fullwidth ASCII Variants
  [0xFFE0, 0xFFE6],   // Fullwidth Symbol Variants
  [0x16FE0, 0x16FE4], // Tangut, Nüshu
  [0x16FF0, 0x16FF1],
  [0x17000, 0x187F7], // Tangut
  [0x18800, 0x18CD5], // Tangut Components
  [0x18D00, 0x18D08], // Tangut Supplement
  [0x1B000, 0x1B122], // Kana Supplement
  [0x1B132, 0x1B2FB],
  [0x1F004, 0x1F004], // Mahjong Red Dragon
  [0x1F0CF, 0x1F0CF], // Playing Card Black Joker
  [0x1F18E, 0x1F18E], // Negative Squared AB
  [0x1F191, 0x1F19A], // Squared symbols
  [0x1F200, 0x1F202], // Squared CJK
  [0x1F210, 0x1F23B],
  [0x1F240, 0x1F248],
  [0x1F250, 0x1F251],
  [0x1F300, 0x1F64F], // Miscellaneous Symbols & Pictographs, Emoticons
  [0x1F680, 0x1F6FF], // Transport & Map Symbols
  [0x1F7E0, 0x1F7EB], // Colored circles, squares
  [0x1F900, 0x1F9FF], // Supplemental Symbols and Pictographs
  [0x1FA70, 0x1FAFF], // Symbols and Pictographs Extended-A
  [0x20000, 0x2FFFD], // CJK Unified Ideographs Ext B, C, D, E, F, I
  [0x30000, 0x3FFFD], // CJK Unified Ideographs Ext G, H
];

// Zero-width characters (control, zero-width spaces, directional formatting, variation selectors)
const RAW_ZERO_WIDTH_RANGES = [
  [0x0000, 0x001F],   // C0 controls
  [0x007F, 0x009F],   // Delete + C1 controls
  [0x0300, 0x036F],   // Combining Diacritical Marks
  [0x0483, 0x0489],   // Combining Cyrillic Millions
  [0x0591, 0x05BD],   // Hebrew cantillation marks
  [0x05BF, 0x05BF],
  [0x05C1, 0x05C2],
  [0x05C4, 0x05C5],
  [0x05C7, 0x05C7],
  [0x0610, 0x061A],   // Arabic sign marks
  [0x064B, 0x065F],   // Arabic vowel marks
  [0x0670, 0x0670],
  [0x06D6, 0x06DC],
  [0x06DF, 0x06E4],
  [0x06E7, 0x06E8],
  [0x06EA, 0x06ED],
  [0x0711, 0x0711],
  [0x0730, 0x074A],
  [0x07A6, 0x07B0],
  [0x07EB, 0x07F3],
  [0x0816, 0x0819],
  [0x081B, 0x0823],
  [0x0825, 0x0827],
  [0x0829, 0x082D],
  [0x0859, 0x085B],
  [0x08D3, 0x08E1],
  [0x08E3, 0x0903],
  [0x093A, 0x093C],
  [0x093E, 0x094F],
  [0x0951, 0x0957],
  [0x0962, 0x0963],
  [0x0981, 0x0983],
  [0x09BC, 0x09BC],
  [0x09BE, 0x09C4],
  [0x09C7, 0x09C8],
  [0x09CB, 0x09CD],
  [0x09D7, 0x09D7],
  [0x09E2, 0x09E3],
  [0x0A01, 0x0A03],
  [0x0A3C, 0x0A3C],
  [0x0A3E, 0x0A42],
  [0x0A47, 0x0A48],
  [0x0A4B, 0x0A4D],
  [0x0A51, 0x0A51],
  [0x0A70, 0x0A71],
  [0x0A75, 0x0A75],
  [0x0A81, 0x0A83],
  [0x0ABC, 0x0ABC],
  [0x0ABE, 0x0AC5],
  [0x0AC7, 0x0AC9],
  [0x0ACB, 0x0ACD],
  [0x0AE2, 0x0AE3],
  [0x0B01, 0x0B03],
  [0x0B3C, 0x0B3C],
  [0x0B3E, 0x0B44],
  [0x0B47, 0x0B48],
  [0x0B4B, 0x0B4D],
  [0x0B56, 0x0B57],
  [0x0B62, 0x0B63],
  [0x0B82, 0x0B82],
  [0x0BBE, 0x0BC2],
  [0x0BC6, 0x0BC8],
  [0x0BCA, 0x0BCD],
  [0x0BD7, 0x0BD7],
  [0x0C00, 0x0C04],
  [0x0C3E, 0x0C44],
  [0x0C46, 0x0C48],
  [0x0C4A, 0x0C4D],
  [0x0C55, 0x0C56],
  [0x0C62, 0x0C63],
  [0x0C81, 0x0C83],
  [0x0CBC, 0x0CBC],
  [0x0CBE, 0x0CC4],
  [0x0CC6, 0x0CC8],
  [0x0CCA, 0x0CCD],
  [0x0CD5, 0x0CD6],
  [0x0CE2, 0x0CE3],
  [0x0D00, 0x0D03],
  [0x0D3B, 0x0D3C],
  [0x0D3E, 0x0D44],
  [0x0D46, 0x0D48],
  [0x0D4A, 0x0D4D],
  [0x0D57, 0x0D57],
  [0x0D62, 0x0D63],
  [0x0D82, 0x0D83],
  [0x0DCA, 0x0DCA],
  [0x0DCF, 0x0DD4],
  [0x0DD6, 0x0DD6],
  [0x0DD8, 0x0DDF],
  [0x0DF2, 0x0DF3],
  [0x0E31, 0x0E31],
  [0x0E34, 0x0E3A],
  [0x0E47, 0x0E4E],
  [0x0EB1, 0x0EB1],
  [0x0EB4, 0x0EB9],
  [0x0EBB, 0x0EBC],
  [0x0EC8, 0x0ECD],
  [0x0F18, 0x0F19],
  [0x0F35, 0x0F35],
  [0x0F37, 0x0F37],
  [0x0F39, 0x0F39],
  [0x0F71, 0x0F7E],
  [0x0F80, 0x0F84],
  [0x0F86, 0x0F87],
  [0x0F8D, 0x0F97],
  [0x0F99, 0x0FBC],
  [0x0FC6, 0x0FC6],
  [0x102D, 0x1030],
  [0x1032, 0x1037],
  [0x1039, 0x103A],
  [0x103D, 0x103E],
  [0x1058, 0x1059],
  [0x105E, 0x1060],
  [0x1071, 0x1074],
  [0x1082, 0x1082],
  [0x1085, 0x1086],
  [0x108D, 0x108D],
  [0x109D, 0x109D],
  [0x135D, 0x135F],
  [0x1712, 0x1714],
  [0x1732, 0x1734],
  [0x1752, 0x1753],
  [0x1772, 0x1773],
  [0x17B4, 0x17D3],
  [0x17DD, 0x17DD],
  [0x180B, 0x180D],
  [0x180E, 0x180E],
  [0x1885, 0x1886],
  [0x18A9, 0x18A9],
  [0x1920, 0x192B],
  [0x1930, 0x193B],
  [0x1A17, 0x1A1B],
  [0x1A55, 0x1A5E],
  [0x1A60, 0x1A7C],
  [0x1A7F, 0x1A7F],
  [0x1AB0, 0x1ACE],
  [0x1B00, 0x1B04],
  [0x1B34, 0x1B44],
  [0x1B6B, 0x1B73],
  [0x1B80, 0x1B82],
  [0x1BA1, 0x1BAA],
  [0x1BAB, 0x1BAD],
  [0x1BE6, 0x1BF3],
  [0x1C24, 0x1C37],
  [0x1CD0, 0x1CD2],
  [0x1CD4, 0x1CE8],
  [0x1CED, 0x1CED],
  [0x1CF2, 0x1CF4],
  [0x1CF8, 0x1CF9],
  [0x1DC0, 0x1DFF],
  [0x200B, 0x200F],   // Zero width space, ZWNJ, ZWJ, LRM, RLM
  [0x2028, 0x202E],   // Line/paragraph sep, directional marks
  [0x2060, 0x206F],   // Word joiner, invisible operators
  [0x20D0, 0x20FF],   // Combining Marks for Symbols
  [0xFE00, 0xFE0F],   // Variation Selectors 1..16
  [0xFE20, 0xFE2F],   // Combining Half Marks
  [0xFEFF, 0xFEFF],   // Zero Width No-Break Space (BOM)
  [0xFFF9, 0xFFFB],   // Interlinear annotation
  [0xE0100, 0xE01EF], // Variation Selectors 17..256
];

function coalesce(ranges) {
  const sorted = ranges.slice().sort((a, b) => a[0] - b[0]);
  const result = [];
  for (const [start, end] of sorted) {
    if (result.length === 0) {
      result.push([start, end]);
      continue;
    }
    const prev = result[result.length - 1];
    if (start <= prev[1] + 1) {
      prev[1] = Math.max(prev[1], end);
    } else {
      result.push([start, end]);
    }
  }
  return result;
}

const wideRanges = coalesce(RAW_WIDE_RANGES);
const zeroWidthRanges = coalesce(RAW_ZERO_WIDTH_RANGES);

const output = `// Auto-generated by scripts/generate-width-data.js. Do not edit directly.

/**
 * Sorted non-overlapping [start, end] ranges for East Asian Wide / Fullwidth characters.
 * @type {Array<[number, number]>}
 */
export const WIDE_RANGES = ${JSON.stringify(wideRanges, null, 2)};

/**
 * Sorted non-overlapping [start, end] ranges for zero-width characters
 * (combining marks, zero-width spaces, variation selectors, control codes).
 * @type {Array<[number, number]>}
 */
export const ZERO_WIDTH_RANGES = ${JSON.stringify(zeroWidthRanges, null, 2)};

/**
 * Binary search to check if codePoint falls within sorted [start, end] ranges.
 * @param {number} codePoint
 * @param {Array<[number, number]>} ranges
 * @returns {boolean}
 */
export function inRanges(codePoint, ranges) {
  let low = 0;
  let high = ranges.length - 1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    const range = ranges[mid];
    if (codePoint < range[0]) {
      high = mid - 1;
    } else if (codePoint > range[1]) {
      low = mid + 1;
    } else {
      return true;
    }
  }
  return false;
}
`;

const targetPath = path.join(__dirname, '..', 'src', 'unicode-data.js');
fs.mkdirSync(path.dirname(targetPath), { recursive: true });
fs.writeFileSync(targetPath, output, 'utf-8');
console.log(`Successfully generated ${targetPath}`);
console.log(`Wide ranges: ${wideRanges.length} intervals`);
console.log(`Zero-width ranges: ${zeroWidthRanges.length} intervals`);
