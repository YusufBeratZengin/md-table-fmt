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

test('CSV handles CRLF, bare CR, empty final fields, and quoted line breaks', () => {
  assert.deepEqual(parseCsv('key,value\r\nalpha,"line 1\r\nline 2"\rbeta,\r\n'), [
    ['key', 'value'], ['alpha', 'line 1\r\nline 2'], ['beta', ''],
  ]);
  assert.deepEqual(parseCsv('a,b,'), [['a', 'b', '']]);
  assert.equal(serializeCsvRow(['line\rbreak', 'line\nbreak', null]), '"line\rbreak","line\nbreak",');
});

test('empty conversions preserve the documented empty result shapes', () => {
  assert.equal(csvToMarkdown(''), '');
  assert.equal(jsonToMarkdown('[]'), '');
  assert.equal(jsonToMarkdown('{}'), '');
  assert.equal(markdownToCsv('No tables here.'), '');
  assert.equal(markdownToJson('No tables here.'), '[]');
});

test('JSON conversion unions object keys and stringifies missing and nullable values', () => {
  const md = jsonToMarkdown('[{"item":"Alpha","score":null},{"item":"Beta","active":true}]');
  assert.deepEqual(JSON.parse(markdownToJson(md)), [
    { item: 'Alpha', score: '', active: '' },
    { item: 'Beta', score: '', active: 'true' },
  ]);
  const arrays = jsonToMarkdown([[null, 'score'], ['Alpha', null]]);
  assert.deepEqual(JSON.parse(markdownToJson(arrays)), [{ col_1: 'Alpha', score: '' }]);
});

test('exports select a table, fall back on an invalid index, and fill missing cells', () => {
  const md = '| A | B |\n|---|---|\n| 1 |\n\n| State |\n|---|\n| ready |';
  assert.equal(markdownToCsv(md, { tableIndex: 1 }), 'State\nready');
  assert.equal(markdownToCsv(md, { tableIndex: 9 }), 'A,B\n1');
  assert.equal(markdownToJson(md, { tableIndex: 1, indent: 0 }), '[{"State":"ready"}]');
  assert.equal(markdownToJson(md, { tableIndex: 9, indent: 0 }), '[{"A":"1","B":""}]');
});

test('csv and json input starting with a UTF-8 BOM ignore the BOM', () => {
  assert.equal(csvToMarkdown('\uFEFFa,b\n1,2'), csvToMarkdown('a,b\n1,2'));
  assert.equal(jsonToMarkdown('\uFEFF[{"a":1}]'), jsonToMarkdown('[{"a":1}]'));
});

test('jsonToMarkdown serializes nested objects instead of printing [object Object]', () => {
  const md = jsonToMarkdown([{ a: { x: 1 }, b: [1, 2] }]);
  assert.ok(!md.includes('[object Object]'));
  assert.ok(md.includes('{"x":1}'));
});
