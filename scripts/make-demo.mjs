import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runCli } from '../src/cli.js';
import { stringWidth } from '../src/width.js';

// Run the same CLI handler as bin/md-table.js and capture its actual stdout.
// Keeping capture in-process makes regeneration independent of shell quoting.
const root = fileURLToPath(new URL('../', import.meta.url));
const destination = new URL('../docs/demo.svg', import.meta.url);
const args = ['fmt', '--stdout', 'test/fixtures/complex-tables.md'];
const command = `node bin/md-table.js ${args.join(' ')}`;
const originalCwd = process.cwd();
const originalWrite = process.stdout.write;
let output = '';
let exitCode;
try {
  process.chdir(root);
  process.stdout.write = (chunk) => {
    output += chunk.toString();
    return true;
  };
  exitCode = await runCli(['node', 'bin/md-table.js', ...args]);
} finally {
  process.stdout.write = originalWrite;
  process.chdir(originalCwd);
}
if (exitCode !== 0) throw new Error(`Demo command failed with exit code ${exitCode}`);

const lines = output.replace(/\r\n/g, '\n').trimEnd().split('\n');
if (lines.length < 15 || lines.length > 25) {
  throw new Error(`Expected 15–25 output lines, received ${lines.length}; review the demo fixture.`);
}
const escapeXml = (value) => value.replace(/[&<>"']/g, (ch) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
})[ch]);
const height = 144 + lines.length * 24;
const width = Math.max(840, Math.ceil((Math.max(...lines.map(stringWidth), stringWidth(`$ ${command}`)) * 9.1 + 56) / 10) * 10);
const rows = lines.map((line, index) =>
  `    <text x="28" y="${132 + index * 24}">${escapeXml(line)}</text>`
).join('\n');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title description">
  <title id="title">md-table-fmt terminal demo</title>
  <desc id="description">Real output of ${escapeXml(command)}: Unicode-aware Markdown tables, inline code, and escaped pipes.</desc>
  <rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="16" fill="#0d1117" stroke="#30363d"/>
  <path d="M17 1h${width - 34}a16 16 0 0 1 16 16v31H1V17A16 16 0 0 1 17 1" fill="#161b22"/>
  <circle cx="26" cy="25" r="6" fill="#ff5f57"/>
  <circle cx="48" cy="25" r="6" fill="#febc2e"/>
  <circle cx="70" cy="25" r="6" fill="#28c840"/>
  <text x="${width / 2}" y="30" fill="#8b949e" text-anchor="middle" font-family="ui-monospace, monospace" font-size="13">md-table-fmt</text>
  <g font-family="'DejaVu Sans Mono', 'Cascadia Mono', 'SFMono-Regular', Consolas, monospace" font-size="15" xml:space="preserve">
    <text x="28" y="85" fill="#7ee787">$ ${escapeXml(command)}</text>
  </g>
  <g fill="#e6edf3" font-family="'DejaVu Sans Mono', 'Cascadia Mono', 'SFMono-Regular', Consolas, monospace" font-size="15" xml:space="preserve">
${rows}
  </g>
</svg>
`;

if (process.argv.includes('--check')) {
  if (readFileSync(destination, 'utf8') !== svg) {
    throw new Error('docs/demo.svg is out of date. Run npm run demo.');
  }
  console.log(`Demo is current (${lines.length} output lines).`);
} else {
  mkdirSync(new URL('../docs/', import.meta.url), { recursive: true });
  writeFileSync(destination, svg, 'utf8');
  console.log(`Generated docs/demo.svg (${lines.length} output lines).`);
}
