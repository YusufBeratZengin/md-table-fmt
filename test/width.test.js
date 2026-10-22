import test from 'node:test';
import assert from 'node:assert/strict';
import { stringWidth, padCell, stripAnsi } from '../src/width.js';

test('stringWidth - ASCII text', () => {
  assert.equal(stringWidth(''), 0);
  assert.equal(stringWidth('hello'), 5);
  assert.equal(stringWidth('hello world'), 11);
  assert.equal(stringWidth('a | b | c'), 9);
});

test('stringWidth - CJK Wide & Fullwidth characters', () => {
  assert.equal(stringWidth('你好'), 4);
  assert.equal(stringWidth('こんにちは'), 10);
  assert.equal(stringWidth('안녕하세요'), 10);
  assert.equal(stringWidth('１２３'), 6);
  assert.equal(stringWidth('（括弧）'), 8);
  assert.equal(stringWidth('Name: 田中太郎'), 14); // 6 ASCII + 8 CJK = 14
});

test('stringWidth - Combining marks and diacritics', () => {
  assert.equal(stringWidth('café'), 4);
  // Decomposed e + combining acute accent
  assert.equal(stringWidth('cafe\u0301'), 4);
  assert.equal(stringWidth('ü'), 1);
  assert.equal(stringWidth('u\u0308'), 1);
});

test('stringWidth - Zero-width characters', () => {
  assert.equal(stringWidth('\u200B'), 0); // Zero width space
  assert.equal(stringWidth('\uFEFF'), 0); // BOM
  assert.equal(stringWidth('a\u200Bb'), 2);
});

test('stringWidth - Emojis, modifiers, ZWJ sequences and flags', () => {
  assert.equal(stringWidth('🚀'), 2);
  assert.equal(stringWidth('👍🏽'), 2); // emoji with skin tone
  assert.equal(stringWidth('👨‍👩‍👧‍👦'), 2); // ZWJ family sequence
  assert.equal(stringWidth('🇹🇷'), 2); // Regional indicator flag
  assert.equal(stringWidth('🇺🇸'), 2);
  assert.equal(stringWidth('Status: 🚀 Ready'), 16);
});

test('stringWidth - Text symbols vs emoji presentation', () => {
  assert.equal(stringWidth('©'), 1);
  assert.equal(stringWidth('®'), 1);
  assert.equal(stringWidth('™'), 1);
  assert.equal(stringWidth('✈'), 1);
  assert.equal(stringWidth('✈️'), 2); // with VS-16
});

test('stringWidth - ANSI escape sequences', () => {
  assert.equal(stringWidth('\u001b[31mred\u001b[0m'), 3);
  assert.equal(stringWidth('\u001b[1;32mbold green\u001b[0m'), 10);
});

test('padCell - alignments', () => {
  assert.equal(padCell('test', 8, 'left'), 'test    ');
  assert.equal(padCell('test', 8, 'right'), '    test');
  assert.equal(padCell('test', 8, 'center'), '  test  ');
  assert.equal(padCell('odd', 8, 'center'), '  odd   '); // 5 spaces: 2 left, 3 right

  // Wide characters padding
  assert.equal(padCell('你好', 8, 'left'), '你好    ');
  assert.equal(padCell('你好', 8, 'right'), '    你好');
  assert.equal(padCell('你好', 8, 'center'), '  你好  ');
});

test('stripAnsi', () => {
  assert.equal(stripAnsi('\u001b[31mhello\u001b[0m'), 'hello');
  assert.equal(stripAnsi('plain text'), 'plain text');
});
