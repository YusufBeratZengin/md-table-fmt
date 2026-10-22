import test from 'node:test';
import assert from 'node:assert/strict';
import {
  splitRow,
  isDelimiterRow,
  parseAlignment,
  parseMarkdown,
  isCharEscaped,
} from '../src/parser.js';

test('isCharEscaped', () => {
  assert.equal(isCharEscaped('abc', 1), false);
  assert.equal(isCharEscaped('\\|', 1), true);
  assert.equal(isCharEscaped('\\\\|', 2), false); // double backslash is escaped backslash
  assert.equal(isCharEscaped('\\\\\\|', 3), true);
});

test('splitRow - basic cases', () => {
  assert.deepEqual(splitRow('| a | b | c |'), ['a', 'b', 'c']);
  assert.deepEqual(splitRow('a | b | c'), ['a', 'b', 'c']);
  assert.deepEqual(splitRow('| a | b | c'), ['a', 'b', 'c']);
  assert.deepEqual(splitRow('a | b | c |'), ['a', 'b', 'c']);
  assert.deepEqual(splitRow('| a || c |'), ['a', '', 'c']);
  assert.deepEqual(splitRow('|||'), ['', '']);
});

test('splitRow - escaped pipes and backticks', () => {
  assert.deepEqual(splitRow('| a \\| b | c |'), ['a \\| b', 'c']);
  assert.deepEqual(splitRow('| `x | y` | z |'), ['`x | y`', 'z']);
  assert.deepEqual(splitRow('| ``code | with | pipes`` | regular |'), [
    '``code | with | pipes``',
    'regular',
  ]);
  assert.deepEqual(splitRow('| `cmd \\| pipe` | note |'), ['`cmd \\| pipe`', 'note']);
});

test('isDelimiterRow & parseAlignment', () => {
  assert.equal(isDelimiterRow('|---|---|'), true);
  assert.equal(isDelimiterRow('| :--- | :---: | ---: |'), true);
  assert.equal(isDelimiterRow('---|:---:'), true);
  assert.equal(isDelimiterRow('| not | delimiter |'), false);
  assert.equal(isDelimiterRow('| --- | hello |'), false);

  assert.equal(parseAlignment(':---'), 'left');
  assert.equal(parseAlignment(':---:'), 'center');
  assert.equal(parseAlignment('---:'), 'right');
  assert.equal(parseAlignment('---'), 'none');
  assert.equal(parseAlignment(':-:'), 'center');
});

test('parseMarkdown - extracts table and text chunks', () => {
  const md = [
    '# Heading',
    '',
    'Intro paragraph.',
    '',
    '| Col 1 | Col 2 |',
    '| :--- | ---: |',
    '| val 1 | 123 |',
    '| val 2 | 456 |',
    '',
    'Trailing paragraph.',
  ].join('\n');

  const { chunks, lineEnding } = parseMarkdown(md);
  assert.equal(lineEnding, '\n');
  assert.equal(chunks.length, 3);
  assert.equal(chunks[0].type, 'text');
  assert.equal(chunks[1].type, 'table');
  assert.equal(chunks[2].type, 'text');

  const table = chunks[1].table;
  assert.deepEqual(table.header, ['Col 1', 'Col 2']);
  assert.deepEqual(table.alignments, ['left', 'right']);
  assert.equal(table.rows.length, 2);
  assert.deepEqual(table.rows[0], ['val 1', '123']);
  assert.deepEqual(table.rows[1], ['val 2', '456']);
});

test('parseMarkdown - strictly skips fenced code blocks', () => {
  const md = [
    '# Code Example',
    '',
    '```markdown',
    '| Fake Header 1 | Fake Header 2 |',
    '| --- | --- |',
    '| foo | bar |',
    '```',
    '',
    '~~~python',
    '# Inside tilde block',
    '| not | a | table |',
    '| --- | - | ----- |',
    '~~~',
    '',
    'Real table below:',
    '',
    '| Real 1 | Real 2 |',
    '| --- | --- |',
    '| A | B |',
  ].join('\n');

  const { chunks } = parseMarkdown(md);
  // There should be only 1 table extracted (the real table at the end)
  const tables = chunks.filter((c) => c.type === 'table');
  assert.equal(tables.length, 1);
  assert.deepEqual(tables[0].table.header, ['Real 1', 'Real 2']);
});

test('parseMarkdown - CRLF preservation', () => {
  const md = 'Paragraph.\r\n\r\n| A | B |\r\n|---|---|\r\n| 1 | 2 |\r\n';
  const { lineEnding, chunks } = parseMarkdown(md);
  assert.equal(lineEnding, '\r\n');
  assert.equal(chunks.length, 3);
  assert.equal(chunks[0].type, 'text');
  assert.equal(chunks[1].type, 'table');
  assert.equal(chunks[2].type, 'text');
});
