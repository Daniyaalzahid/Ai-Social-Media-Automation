import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { rules } from '@secretlint/secretlint-rule-preset-recommend';

// These are diagnostic identifiers from installed rule definitions, never matches.
const diagnosticIds = new Map(rules.map(rule => [rule.meta.id, new Set(Object.keys(rule.messages ?? {}))]));
const MAX_DIAGNOSTICS = 10;
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
/** Importable test seam; the CLI always uses spawnSync and the real repository. */
export function scanInput(entries, name, { root, run = spawnSync, report = console.error }) {
  // Keep the existing UTF-8 aggregate and single-newline joining semantics.
  const content = entries.map(entry => entry.content).join('\n');
  const input = name === 'working-tree.txt' ? 'working-tree.txt' : 'git-history.txt';
  const fail = classification => {
    report(JSON.stringify({ scanner: 'Secretlint', classification, input }));
    return false;
  };
  let result;
  try {
    result = run(process.execPath, [path.join(root, 'node_modules/secretlint/bin/secretlint.js'), '--stdinFileName', name, '--no-color', '--no-terminalLink', '--format', 'json'], {
      cwd: root, input: content, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
    });
  } catch { return fail('SCANNER_EXECUTION_FAILURE'); }
  if (result.error || result.signal || ![0, 1].includes(result.status)) return fail('SCANNER_EXECUTION_FAILURE');
  let groups;
  try { groups = JSON.parse(result.stdout); } catch { return fail('SCANNER_OUTPUT_PARSE_FAILURE'); }
  if (!Array.isArray(groups) || groups.some(group => !group || typeof group !== 'object' || !Array.isArray(group.messages))) return fail('SCANNER_OUTPUT_PARSE_FAILURE');
  const messages = groups.flatMap(group => group.messages);
  if (messages.some(message => !message || typeof message !== 'object')) return fail('SCANNER_OUTPUT_PARSE_FAILURE');
  if (!messages.length) return result.status === 0 || fail('SCANNER_EXECUTION_FAILURE');

  let offset = 0;
  const segments = entries.map(entry => {
    const segment = { ...entry, start: offset, end: offset + entry.content.length };
    offset = segment.end + 1;
    return segment;
  });
  const findings = messages.slice(0, MAX_DIAGNOSTICS).map(message => {
    const knownIds = diagnosticIds.get(message.ruleId);
    const finding = {
      ruleId: knownIds ? message.ruleId : 'UNKNOWN_RULE',
      diagnosticId: knownIds?.has(message.messageId) ? message.messageId : 'UNKNOWN_DIAGNOSTIC',
      severity: ['error', 'warning', 'info'].includes(message.severity) ? message.severity : 'unknown',
    };
    const [start, end] = Array.isArray(message.range) ? message.range : [];
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end <= start || end > content.length) return finding;
    const segment = segments.find(entry => start >= entry.start && end <= entry.end);
    // Source attribution comes only from our input map, not scanner paths/loc.
    const safePath = segment && segment.path.length <= 240 && !segment.path.split('/').some(part => part === '..' || part === '.') && /^(?:[A-Za-z0-9_.-]+\/)*[A-Za-z0-9_.-]+$/.test(segment.path);
    if (safePath) {
      const before = segment.content.slice(0, start - segment.start);
      finding.path = segment.path;
      finding.line = before.split('\n').length;
      finding.column = before.length - before.lastIndexOf('\n');
    } else {
      const before = content.slice(0, start);
      finding.aggregateLine = before.split('\n').length;
      finding.aggregateColumn = before.length - before.lastIndexOf('\n');
    }
    return finding;
  });
  report(JSON.stringify({ scanner: 'Secretlint', classification: 'SECRET_FINDING', input, findingCount: messages.length, findings, additionalFindingCount: Math.max(0, messages.length - MAX_DIAGNOSTICS) }));
  return false;
}

function main() {
  const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
  function git(args) { return execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }); }
  function scan(entries, name) {
    checkPolicy(name, entries.map(entry => entry.content).join('\n'));
    if (!scanInput(entries, name, { root })) process.exit(1);
  }
const files = [...new Set(git(['ls-files', '-z', '--cached', '--others', '--exclude-standard']).split('\0').filter(Boolean))];
// Scan one aggregate for performance, retaining policy checks per file.
const contents = files.map((file) => {
  const content = readFileSync(path.join(root, file), 'utf8');
  checkPolicy(file, content);
  return { path: file, content };
});
scan(contents, 'working-tree.txt');
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
    if (!seen.has(oid)) { seen.add(oid); historical++; commitContents.push({ path: name, content }); }
  }
  if (commitContents.length) scan(commitContents, 'git-history.txt');
}
console.log(`Secret scan passed: ${files.length} repository files; ${historical} unique historical blobs across ${commits.length} commits. No credential contents printed.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
