import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseCsv,
  serializeCsvRow,
  csvToMarkdown,
  tsvToMarkdown,
  markdownToCsv,
  markdownToTsv,
  jsonToMarkdown,
  markdownToJson,
} from '../src/convert.js';

test('parseCsv - RFC 4180 parsing with quotes and escaped quotes', () => {
  const csv = 'name,age,notes\n"Alice, M.",30,"Likes ""quoted"" words"\nBob,25,None\n';
  const rows = parseCsv(csv);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows[0], ['name', 'age', 'notes']);
  assert.deepEqual(rows[1], ['Alice, M.', '30', 'Likes "quoted" words']);
  assert.deepEqual(rows[2], ['Bob', '25', 'None']);
});

test('serializeCsvRow - quotes fields containing delimiter or quotes', () => {
  assert.equal(serializeCsvRow(['a', 'b, c', 'd "quote"']), 'a,"b, c","d ""quote"""');
});

test('csvToMarkdown & roundtrip markdownToCsv', () => {
  const csv = [
    'Name,Department,Salary',
    'Alice,Engineering,120000',
    'Bob,Product,95000',
    'Charlie,Design,85000',
  ].join('\n');

  const md = csvToMarkdown(csv);
  assert.match(md, /\| Name    \| Department  \| Salary \|/);
  assert.match(md, /\| Alice   \| Engineering \| 120000 \|/);

  const backToCsv = markdownToCsv(md);
  assert.equal(backToCsv, csv);
});

test('csvToMarkdown - handles pipes and newlines inside CSV cells', () => {
  const csv = 'Feature,Syntax\nOption A,cmd1 | cmd2\nMultiline,"Line 1\nLine 2"\n';
  const md = csvToMarkdown(csv);
  assert.match(md, /cmd1 \\\| cmd2/);
  assert.match(md, /Line 1<br>Line 2/);

  const backToCsv = markdownToCsv(md);
  assert.match(backToCsv, /cmd1 \| cmd2/);
  assert.match(backToCsv, /"Line 1\nLine 2"/);
});

test('tsvToMarkdown & markdownToTsv', () => {
  const tsv = 'Col1\tCol2\nval1\tval2\n';
  const md = tsvToMarkdown(tsv);
  assert.match(md, /\| Col1 \| Col2 \|/);

  const backToTsv = markdownToTsv(md);
  assert.equal(backToTsv, 'Col1\tCol2\nval1\tval2');
});

test('jsonToMarkdown & roundtrip markdownToJson', () => {
  const json = [
    { id: '1', name: 'Alpha', score: '99' },
    { id: '2', name: 'Beta', score: '88' },
  ];

  const md = jsonToMarkdown(json);
  assert.match(md, /\| id\s+\| name\s+\| score\s+\|/);
  assert.match(md, /\| 1\s+\| Alpha \| 99\s+\|/);

  const backToJsonStr = markdownToJson(md);
  const backToJson = JSON.parse(backToJsonStr);
  assert.deepEqual(backToJson, json);
});

test('jsonToMarkdown - array of arrays', () => {
  const data = [
    ['Header1', 'Header2'],
    ['Row1', 'Row2'],
  ];
  const md = jsonToMarkdown(data);
  assert.match(md, /\| Header1 \| Header2 \|/);
  assert.match(md, /\| Row1    \| Row2    \|/);
});
