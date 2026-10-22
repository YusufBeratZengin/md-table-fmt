import test from 'node:test';
import assert from 'node:assert/strict';
import { formatTable, formatMarkdown, formatDelimiterCell } from '../src/formatter.js';

test('formatDelimiterCell', () => {
  assert.equal(formatDelimiterCell('left', 3), ':--');
  assert.equal(formatDelimiterCell('left', 5), ':----');
  assert.equal(formatDelimiterCell('right', 3), '--:');
  assert.equal(formatDelimiterCell('right', 5), '----:');
  assert.equal(formatDelimiterCell('center', 3), ':-:');
  assert.equal(formatDelimiterCell('center', 5), ':---:');
  assert.equal(formatDelimiterCell('none', 3), '---');
  assert.equal(formatDelimiterCell('none', 5), '-----');
});

test('formatTable - basic alignment and padding', () => {
  const input = [
    '| Name | Age | City |',
    '| :--- | ---: | :---: |',
    '| Alice | 9 | NYC |',
    '| Bob | 100 | London |',
  ].join('\n');

  const expected = [
    '| Name  | Age |  City  |',
    '| :---- | --: | :----: |',
    '| Alice |   9 |  NYC   |',
    '| Bob   | 100 | London |',
  ].join('\n');

  assert.equal(formatTable(input), expected);
});

test('formatTable - fixes broken rows (missing and extra cells)', () => {
  const input = [
    '| Col A | Col B | Col C |',
    '| --- | --- | --- |',
    '| 1 | 2 |',              // missing cell
    '| 3 | 4 | 5 | 6 |',      // extra cell
  ].join('\n');

  const expected = [
    '| Col A | Col B | Col C |     |',
    '| ----- | ----- | ----- | --- |',
    '| 1     | 2     |       |     |',
    '| 3     | 4     | 5     | 6   |',
  ].join('\n');

  assert.equal(formatTable(input), expected);
});

test('formatTable - Unicode wide characters and emojis', () => {
  const input = [
    '| Country | Flag | City | Status |',
    '| :--- | :---: | :--- | :---: |',
    '| Japan | 🇯🇵 | 東京 | 🚀 Ready |',
    '| Turkey | 🇹🇷 | İstanbul | 👨‍👩‍👧‍👦 Active |',
  ].join('\n');

  const expected = [
    '| Country | Flag | City     |  Status   |',
    '| :------ | :--: | :------- | :-------: |',
    '| Japan   |  🇯🇵  | 東京     | 🚀 Ready  |',
    '| Turkey  |  🇹🇷  | İstanbul | 👨‍👩‍👧‍👦 Active |',
  ].join('\n');

  assert.equal(formatTable(input), expected);
});

test('formatTable - inline code with pipes and escaped pipes', () => {
  const input = [
    '| Command | Description | Syntax |',
    '| --- | --- | --- |',
    '| `cat | grep` | Pipe command | `cmd \\| other` |',
    '| regular | Escaped \\| bar | `code` |',
  ].join('\n');

  const expected = [
    '| Command      | Description    | Syntax         |',
    '| ------------ | -------------- | -------------- |',
    '| `cat | grep` | Pipe command   | `cmd \\| other` |',
    '| regular      | Escaped \\| bar | `code`         |',
  ].join('\n');

  assert.equal(formatTable(input), expected);
});

test('formatMarkdown - preserves non-table content and fenced code byte-for-byte', () => {
  const input = [
    '# Documentation',
    '',
    'Here is an introductory paragraph with **markdown** formatting.',
    '',
    '```markdown',
    '| Unformatted | Code | Table |',
    '|---|---|---|',
    '| 1 | 2 | 3 |',
    '```',
    '',
    'Real table:',
    '',
    '| A | B |',
    '|---|---|',
    '| 12345 | 6 |',
    '| 7 | 890 |',
    '',
    'End of file.',
  ].join('\n');

  const expected = [
    '# Documentation',
    '',
    'Here is an introductory paragraph with **markdown** formatting.',
    '',
    '```markdown',
    '| Unformatted | Code | Table |',
    '|---|---|---|',
    '| 1 | 2 | 3 |',
    '```',
    '',
    'Real table:',
    '',
    '| A     | B   |',
    '| ----- | --- |',
    '| 12345 | 6   |',
    '| 7     | 890 |',
    '',
    'End of file.',
  ].join('\n');

  assert.equal(formatMarkdown(input), expected);
});
