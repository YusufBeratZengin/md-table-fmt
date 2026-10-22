import test from 'node:test';
import assert from 'node:assert/strict';
import { lintMarkdown, formatLintReport } from '../src/lint.js';

test('lintMarkdown - clean table passes with zero issues', () => {
  const md = [
    '| Col A | Col B |',
    '| :---- | ----: |',
    '| val 1 |   100 |',
  ].join('\n');

  const issues = lintMarkdown(md);
  assert.equal(issues.length, 0);
});

test('lintMarkdown - inconsistent column count', () => {
  const md = [
    '| Col A | Col B | Col C |',
    '| --- | --- | --- |',
    '| 1 | 2 |',
  ].join('\n');

  const issues = lintMarkdown(md);
  const inconsistent = issues.filter((i) => i.rule === 'inconsistent-columns');
  assert.equal(inconsistent.length, 1);
  assert.equal(inconsistent[0].line, 3);
  assert.equal(inconsistent[0].severity, 'error');
  assert.match(inconsistent[0].message, /Data row has 2 column\(s\); expected 3/);
});

test('lintMarkdown - missing header separator', () => {
  const md = [
    '# Table without separator',
    '',
    '| Header A | Header B |',
    '| Row 1 A | Row 1 B |',
  ].join('\n');

  const issues = lintMarkdown(md);
  const missingSep = issues.filter((i) => i.rule === 'missing-header-separator');
  assert.equal(missingSep.length, 1);
  assert.equal(missingSep[0].line, 4);
  assert.equal(missingSep[0].severity, 'error');
});

test('lintMarkdown - trailing whitespace', () => {
  const md = [
    '| Col A | Col B |   ',
    '| ----- | ----- |',
    '| 1     | 2     |',
  ].join('\n');

  const issues = lintMarkdown(md);
  const trailing = issues.filter((i) => i.rule === 'trailing-spaces');
  assert.equal(trailing.length, 1);
  assert.equal(trailing[0].line, 1);
  assert.equal(trailing[0].severity, 'error');
});

test('lintMarkdown - misaligned table warning', () => {
  const md = [
    '| Col A | Col B |',
    '|---|---|',
    '| 1 | 2 |',
  ].join('\n');

  const issues = lintMarkdown(md);
  const misaligned = issues.filter((i) => i.rule === 'misaligned');
  assert.equal(misaligned.length, 1);
  assert.equal(misaligned[0].severity, 'warning');
});

test('lintMarkdown - ignores fenced code blocks', () => {
  const md = [
    '```markdown',
    '| Bad | Table |',
    '| 1 |',
    '```',
  ].join('\n');

  const issues = lintMarkdown(md);
  assert.equal(issues.length, 0);
});

test('formatLintReport produces readable summary', () => {
  const issues = [
    {
      line: 3,
      column: 1,
      rule: 'inconsistent-columns',
      severity: 'error',
      message: 'Data row has 2 column(s); expected 3',
    },
  ];
  const report = formatLintReport('example.md', issues);
  assert.match(report, /example\.md:/);
  assert.match(report, /3:1  ERROR  Data row has 2 column\(s\); expected 3 \(inconsistent-columns\)/);
  assert.match(report, /1 error\(s\), 0 warning\(s\) found/);
});
