import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseArgs, resolveFiles, readStdin, runCli } from '../src/cli.js';
import { formatMarkdown } from '../src/formatter.js';

const rawTable = '| Item | Score |\n|---|---:|\n| Beta | 8 |\n| Alpha | 12 |\n';

function workspace(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'md-table-fmt-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return {
    dir,
    file(name, contents) {
      const target = path.join(dir, name);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, contents, 'utf8');
      return target;
    },
  };
}

function capture(t) {
  let stdout = '';
  let stderr = '';
  t.mock.method(process.stdout, 'write', (chunk) => { stdout += chunk; return true; });
  t.mock.method(console, 'log', (...values) => { stdout += values.join(' ') + '\n'; });
  t.mock.method(console, 'error', (...values) => { stderr += values.join(' ') + '\n'; });
  return { get stdout() { return stdout; }, get stderr() { return stderr; } };
}

const cli = (...args) => runCli(['node', 'md-table', ...args]);

test('argument parsing keeps flag values and literal filenames after -- separate', () => {
  assert.deepEqual(parseArgs([
    'node', 'md-table', 'sort', '--by=Score', '--table', '1', '--numeric',
    '-ch', '-d', ';', '--', '--literal.md',
  ]), {
    command: 'sort',
    positionals: ['--literal.md'],
    flags: { by: 'Score', table: '1', numeric: true, c: true, h: true, d: ';' },
  });
});

test('file resolution deduplicates recursive Markdown inputs and ignores dependency directories', (t) => {
  const work = workspace(t);
  const first = work.file('first.md', 'text');
  const nested = work.file('nested/second.markdown', 'text');
  work.file('ignored.txt', 'text');
  work.file('node_modules/ignored.md', 'text');
  work.file('.git/ignored.md', 'text');
  assert.deepEqual(new Set(resolveFiles(['-', first, work.dir, first])), new Set(['-', first, nested]));
  assert.deepEqual(resolveFiles([path.join(work.dir, '*.md')]), [first]);
  assert.deepEqual(new Set(resolveFiles([path.join(work.dir, '**', '*.md')])), new Set([first, nested]));
  assert.deepEqual(resolveFiles([path.join(work.dir, 'missing', '*.md')]), []);
});

test('stdin reader joins streamed chunks and propagates stream failures', async (t) => {
  const listeners = {};
  t.mock.method(process.stdin, 'setEncoding', (encoding) => assert.equal(encoding, 'utf-8'));
  t.mock.method(process.stdin, 'on', (event, handler) => { listeners[event] = handler; return process.stdin; });
  const content = readStdin();
  listeners.data('first\n');
  listeners.data('second');
  listeners.end();
  assert.equal(await content, 'first\nsecond');

  const failure = new Error('Synthetic stream failure');
  const rejected = readStdin();
  listeners.error(failure);
  await assert.rejects(rejected, (error) => error === failure);
});

test('CLI help, version, missing command, and unknown command return useful statuses', async (t) => {
  const output = capture(t);
  assert.equal(await cli('help'), 0);
  assert.match(output.stdout, /Usage:/);
  assert.equal(await cli('version'), 0);
  assert.match(output.stdout, /md-table v0\.1\.0/);
  assert.equal(await cli(), 1);
  assert.equal(await cli('not-a-command'), 1);
  assert.match(output.stderr, /Unknown command: not-a-command/);
});

test('fmt stdout and check modes preserve input; in-place mode writes the formatted result', async (t) => {
  const work = workspace(t);
  const file = work.file('table.md', rawTable);
  const output = capture(t);
  const formatted = formatMarkdown(rawTable);
  assert.equal(await cli('fmt', '--stdout', file), 0);
  assert.equal(output.stdout, formatted);
  assert.equal(fs.readFileSync(file, 'utf8'), rawTable);
  assert.equal(await cli('fmt', '--check', file), 1);
  assert.match(output.stderr, /Needs formatting:/);
  assert.equal(fs.readFileSync(file, 'utf8'), rawTable);
  assert.equal(await cli('fmt', file), 0);
  assert.equal(fs.readFileSync(file, 'utf8'), formatted);
  assert.equal(await cli('fmt', '--check', file), 0);
});

test('lint distinguishes warnings from errors and strict mode fails on warnings', async (t) => {
  const work = workspace(t);
  const file = work.file('table.md', rawTable);
  const output = capture(t);
  assert.equal(await cli('lint', file), 0);
  assert.match(output.stderr, /WARN .*misaligned/);
  assert.equal(await cli('lint', '--strict', file), 1);
  fs.writeFileSync(file, formatMarkdown(rawTable));
  assert.equal(await cli('lint', '--strict', file), 0);
  fs.writeFileSync(file, '| A | B |\n|---|---|\n| only one |\n');
  assert.equal(await cli('lint', file), 1);
  assert.match(output.stderr, /inconsistent-columns/);
});

test('CLI converts TSV and custom-delimiter CSV, preserving quoted delimiters', async (t) => {
  const work = workspace(t);
  const file = work.file('input.tsv', 'item\tscore\nBeta\t8\n');
  const output = capture(t);
  assert.equal(await cli('from-csv', '--tsv', file), 0);
  const markdown = output.stdout;
  assert.equal(markdown, '| item | score |\n| ---- | ----- |\n| Beta | 8     |\n');
  const md = work.file('table.md', markdown);
  assert.equal(await cli('to-csv', '--tsv', md), 0);
  assert.equal(output.stdout.slice(markdown.length), 'item\tscore\nBeta\t8\n');

  const custom = work.file('input.csv', 'item;score\n"Alpha;Beta";12');
  const before = output.stdout.length;
  assert.equal(await cli('from-csv', '--delimiter', ';', custom), 0);
  const converted = output.stdout.slice(before);
  assert.match(converted, /Alpha;Beta/);
  fs.writeFileSync(md, converted);
  const offset = output.stdout.length;
  assert.equal(await cli('to-csv', '--delimiter', ';', md), 0);
  assert.equal(output.stdout.slice(offset), 'item;score\n"Alpha;Beta";12\n');
});

test('JSON CLI honors table selection and indentation and reports invalid JSON', async (t) => {
  const work = workspace(t);
  const json = work.file('input.json', '[{"item":"Alpha","score":12}]');
  const output = capture(t);
  assert.equal(await cli('from-json', json), 0);
  assert.match(output.stdout, /Alpha/);
  const md = work.file('tables.md', `${rawTable}\n| State |\n|---|\n| ready |\n`);
  const before = output.stdout.length;
  assert.equal(await cli('to-json', '--table', '1', '--indent', '0', md), 0);
  assert.equal(output.stdout.slice(before), '[{"State":"ready"}]\n');
  fs.writeFileSync(json, '{');
  assert.equal(await cli('from-json', json), 1);
  assert.match(output.stderr, /Error:/);
});

test('sort validates the column and supports numeric descending sorting in place', async (t) => {
  const work = workspace(t);
  const file = work.file('table.md', rawTable);
  const output = capture(t);
  assert.equal(await cli('sort', file), 1);
  assert.match(output.stderr, /--by <column> is required/);
  assert.equal(await cli('sort', '--by', 'missing', file), 1);
  assert.match(output.stderr, /Column "missing" not found/);
  assert.equal(await cli('sort', '--by', 'Score', '--numeric', '--desc', '--in-place', file), 0);
  const result = fs.readFileSync(file, 'utf8');
  assert.ok(result.indexOf('Alpha') < result.indexOf('Beta'));
  assert.equal(output.stdout, '');
  assert.equal(await cli('sort', '--by', 'Score', file), 0);
  assert.ok(output.stdout.indexOf('Beta') < output.stdout.indexOf('Alpha'));
});

test('fmt and lint consume stdin when no file is given', async (t) => {
  const output = capture(t);
  t.mock.method(process.stdin, 'setEncoding', () => process.stdin);
  t.mock.method(process.stdin, 'on', (event, handler) => {
    if (event === 'data') handler(rawTable);
    if (event === 'end') handler();
    return process.stdin;
  });
  assert.equal(await cli('fmt'), 0);
  assert.equal(output.stdout, formatMarkdown(rawTable));
  assert.equal(await cli('fmt', '--check'), 1);
  assert.match(output.stderr, /Needs formatting: <stdin>/);
  assert.equal(await cli('lint'), 0);
  assert.match(output.stderr, /<stdin>:/);
});

test('a missing explicit file argument is an error, not a silent success', async (t) => {
  const work = workspace(t);
  const out = capture(t);
  const missing = path.join(work.dir, 'yok-ş.md');
  assert.equal(await cli('fmt', '--check', missing), 1);
  assert.match(out.stderr, /not found/i);
  assert.equal(await cli('lint', missing), 1);
  assert.throws(() => resolveFiles([missing]), /not found/i);
});
