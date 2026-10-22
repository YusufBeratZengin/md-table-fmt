import test from 'node:test';
import assert from 'node:assert/strict';
import { sortMarkdown } from '../src/sort.js';

test('sortMarkdown - sort alphabetically ascending', () => {
  const md = [
    '| Name | Age |',
    '| --- | --- |',
    '| Charlie | 20 |',
    '| Alice | 30 |',
    '| Bob | 25 |',
  ].join('\n');

  const sorted = sortMarkdown(md, { by: 'Name' });
  const expected = [
    '| Name    | Age |',
    '| ------- | --- |',
    '| Alice   | 30  |',
    '| Bob     | 25  |',
    '| Charlie | 20  |',
  ].join('\n');

  assert.equal(sorted, expected);
});

test('sortMarkdown - sort alphabetically descending', () => {
  const md = [
    '| Name |',
    '| --- |',
    '| A |',
    '| C |',
    '| B |',
  ].join('\n');

  const sorted = sortMarkdown(md, { by: 'Name', desc: true });
  const expected = [
    '| Name |',
    '| ---- |',
    '| C    |',
    '| B    |',
    '| A    |',
  ].join('\n');

  assert.equal(sorted, expected);
});

test('sortMarkdown - sort numerically', () => {
  const md = [
    '| Item | Price |',
    '| --- | ---: |',
    '| Apple | $10 |',
    '| Banana | $2 |',
    '| Cherry | $100 |',
  ].join('\n');

  const sorted = sortMarkdown(md, { by: 'Price' });
  const expected = [
    '| Item   | Price |',
    '| ------ | ----: |',
    '| Banana |    $2 |',
    '| Apple  |   $10 |',
    '| Cherry |  $100 |',
  ].join('\n');

  assert.equal(sorted, expected);
});

test('sortMarkdown - sort by column index (1-based)', () => {
  const md = [
    '| Col1 | Col2 |',
    '| --- | --- |',
    '| 2 | B |',
    '| 1 | A |',
  ].join('\n');

  const sorted = sortMarkdown(md, { by: 1 });
  const expected = [
    '| Col1 | Col2 |',
    '| ---- | ---- |',
    '| 1    | A    |',
    '| 2    | B    |',
  ].join('\n');

  assert.equal(sorted, expected);
});

test('sortMarkdown - throws error for invalid column', () => {
  const md = '| A | B |\n|---|---|\n| 1 | 2 |';
  assert.throws(
    () => sortMarkdown(md, { by: 'NonExistent' }),
    /Column "NonExistent" not found/
  );
});

test('sortMarkdown - preserves surrounding document text and fenced code', () => {
  const md = [
    '# Title',
    '',
    '```markdown',
    '| Do Not Sort |',
    '| --- |',
    '| Z |',
    '| A |',
    '```',
    '',
    '| City | Pop |',
    '| --- | ---: |',
    '| Istanbul | 15000000 |',
    '| Ankara | 5000000 |',
  ].join('\n');

  const sorted = sortMarkdown(md, { by: 'Pop' });
  assert.match(sorted, /```markdown\n\| Do Not Sort \|\n\| --- \|\n\| Z \|\n\| A \|\n```/);
  assert.match(sorted, /\| Ankara   \|  5000000 \|\n\| Istanbul \| 15000000 \|/);
});
