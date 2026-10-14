import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const cli = path.join(root, 'node_modules/secretlint/bin/secretlint.js');
function git(args) { return execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }); }
function checkPolicy(name, content) {
  const basename = path.posix.basename(name);
  if (/^(\.env($|\.)|.*\.env($|\.)|.*\.(pem|key|p12|pfx)$)/.test(basename) && basename !== '.env.example') {
    console.error('Secret scan: prohibited credential file found (contents withheld).');
    process.exit(1);
  }
  if (basename === '.env.example' && content.split(/\r?\n/).some((line) => line.trim() && !/^[A-Z][A-Z0-9_]*=$/.test(line))) {
    console.error('Secret scan: .env.example must contain names with empty values only.');
    process.exit(1);
  }
}
function scan(content, name) {
  checkPolicy(name, content);
  const result = spawnSync(process.execPath, [cli, '--stdinFileName', name, '--no-color', '--no-terminalLink'], {
    cwd: root, input: content, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
  });
  if (result.status !== 0) {
    // Never forward upstream output: this protects against accidental scanner disclosure.
    console.error(`Secret scan failed for ${name}: suspected credential or scanner failure; contents withheld.`);
    process.exit(1);
  }
}
const files = [...new Set(git(['ls-files', '-z', '--cached', '--others', '--exclude-standard']).split('\0').filter(Boolean))];
// Scan one aggregate for performance, retaining policy checks per file.
const contents = files.map((file) => {
  const content = readFileSync(path.join(root, file), 'utf8');
  checkPolicy(file, content);
  return content;
});
scan(contents.join('\n'), 'working-tree.txt');
const commits = git(['rev-list', 'HEAD']).trim().split('\n').filter(Boolean);
const seen = new Set();
let historical = 0;
for (const commit of commits) {
  const entries = git(['ls-tree', '-rz', commit]).split('\0').filter(Boolean);
  const commitContents = [];
  for (const entry of entries) {
    const [metadata, name] = entry.split('\t');
    const [, type, oid] = metadata.split(' ');
    if (type !== 'blob') continue;
    const content = git(['cat-file', 'blob', oid]);
    checkPolicy(name, content);
    if (!seen.has(oid)) { seen.add(oid); historical++; commitContents.push(content); }
  }
  if (commitContents.length) scan(commitContents.join('\n'), 'git-history.txt');
}
console.log(`Secret scan passed: ${files.length} repository files; ${historical} unique historical blobs across ${commits.length} commits. No credential contents printed.`);
