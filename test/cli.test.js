import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BIN_PATH = path.resolve(__dirname, '..', 'bin', 'md-table.js');
const FIXTURES_DIR = path.resolve(__dirname, 'fixtures');

test('CLI --version and --help', async () => {
  const { stdout: versionOut } = await execFileAsync(process.execPath, [BIN_PATH, '--version']);
  assert.match(versionOut, /md-table v0\.1\.0/);

  const { stdout: helpOut } = await execFileAsync(process.execPath, [BIN_PATH, '--help']);
  assert.match(helpOut, /md-table-fmt/);
  assert.match(helpOut, /Commands:/);
});

test('CLI fmt --check detects unformatted files with exit code 1', async () => {
  const tmpFile = path.join(FIXTURES_DIR, 'tmp-unformatted.md');
  fs.writeFileSync(tmpFile, '| A | B |\n|---|---|\n| 12345 | 6 |\n', 'utf-8');

  try {
    let error;
    try {
      await execFileAsync(process.execPath, [BIN_PATH, 'fmt', '--check', tmpFile]);
    } catch (err) {
      error = err;
    }

    assert(error, 'Expected command to exit with error code 1');
    assert.equal(error.code, 1);
    assert.match(error.stderr, /Needs formatting/);
  } finally {
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
  }
});

test('CLI fmt formats file in place and subsequent --check passes with code 0', async () => {
  const tmpFile = path.join(FIXTURES_DIR, 'tmp-to-format.md');
  fs.writeFileSync(tmpFile, '| A | B |\n|---|---|\n| 12345 | 6 |\n', 'utf-8');

  try {
    // 1. Format
    const { code } = await execFileAsync(process.execPath, [BIN_PATH, 'fmt', tmpFile]);
    assert.equal(code, undefined); // exit code 0

    const content = fs.readFileSync(tmpFile, 'utf-8');
    assert.match(content, /\| A     \| B   \|/);
    assert.match(content, /\| 12345 \| 6   \|/);

    // 2. Check should now exit 0
    const checkResult = await execFileAsync(process.execPath, [BIN_PATH, 'fmt', '--check', tmpFile]);
    assert.equal(checkResult.stderr, '');
  } finally {
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
  }
});

test('CLI lint finds errors in broken tables and exits 1', async () => {
  const brokenFile = path.join(FIXTURES_DIR, 'broken-tables.md');
  let error;
  try {
    await execFileAsync(process.execPath, [BIN_PATH, 'lint', brokenFile]);
  } catch (err) {
    error = err;
  }

  assert(error, 'Expected lint to exit with code 1');
  assert.equal(error.code, 1);
  assert.match(error.stderr, /inconsistent-columns/);
  assert.match(error.stderr, /missing-header-separator/);
  assert.match(error.stderr, /trailing-spaces/);
});

test('CLI from-csv converts CSV file to Markdown table on stdout', async () => {
  const csvFile = path.join(FIXTURES_DIR, 'sample.csv');
  const { stdout } = await execFileAsync(process.execPath, [BIN_PATH, 'from-csv', csvFile]);

  assert.match(stdout, /\| city\s+\| country\s+\| population\s+\| notes/);
  assert.match(stdout, /\| Tokyo\s+\| Japan\s+\| 37400000\s+\| Megacity, capital/);
  assert.match(stdout, /\| New York\s+\| United States\s+\| 8336000\s+\| The "Big Apple"/);
});

test('CLI to-csv converts Markdown table to CSV format', async () => {
  const mdFile = path.join(FIXTURES_DIR, 'complex-tables.md');
  const { stdout } = await execFileAsync(process.execPath, [BIN_PATH, 'to-csv', mdFile]);

  assert.match(stdout, /Country,Code,Capital,Status/);
  assert.match(stdout, /Japan,JP,東京 \(Tokyo\),🚀 Launching/);
});

test('CLI from-json and to-json roundtrip', async () => {
  const jsonFile = path.join(FIXTURES_DIR, 'sample.json');
  const { stdout: mdOut } = await execFileAsync(process.execPath, [BIN_PATH, 'from-json', jsonFile]);

  assert.match(mdOut, /\| id\s+\| service\s+\| status\s+\| latency_ms/);
  assert.match(mdOut, /API Gateway/);

  // Pipe through to-json by writing to a temporary md file
  const tmpMd = path.join(FIXTURES_DIR, 'tmp-json-table.md');
  fs.writeFileSync(tmpMd, mdOut, 'utf-8');

  try {
    const { stdout: jsonOut } = await execFileAsync(process.execPath, [BIN_PATH, 'to-json', tmpMd]);
    const parsed = JSON.parse(jsonOut);
    assert.equal(parsed.length, 3);
    assert.equal(parsed[0].service, 'API Gateway');
    assert.equal(parsed[1].status, 'operational');
  } finally {
    if (fs.existsSync(tmpMd)) fs.unlinkSync(tmpMd);
  }
});

test('CLI sort by column', async () => {
  const tmpFile = path.join(FIXTURES_DIR, 'tmp-sort.md');
  fs.writeFileSync(
    tmpFile,
    '| Animal | Speed |\n| --- | ---: |\n| Cheetah | 120 |\n| Snail | 0.05 |\n| Horse | 70 |\n',
    'utf-8'
  );

  try {
    const { stdout } = await execFileAsync(process.execPath, [
      BIN_PATH,
      'sort',
      '--by',
      'Speed',
      '--desc',
      tmpFile,
    ]);

    const lines = stdout.trim().split('\n');
    assert.match(lines[2], /Cheetah/);
    assert.match(lines[3], /Horse/);
    assert.match(lines[4], /Snail/);
  } finally {
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
  }
});
