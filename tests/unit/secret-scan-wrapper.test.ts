import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';

// Exercise the actual wrapper export and failing process exit without changing
// its CLI, scanner configuration, repository input, or environment bindings.
const wrapper = pathToFileURL(path.resolve('scripts/secret-scan.mjs')).href;
const program = `
import { scanInput } from ${JSON.stringify(wrapper)};
let input='';for await(const chunk of process.stdin)input+=chunk;
const spec=JSON.parse(input);
const options={root:process.cwd()};
if(spec.mode!=='real')options.run=()=>{
 if(spec.mode==='throw')throw new Error(spec.sentinel);
 return spec.result;
};
process.exitCode=scanInput(spec.entries,'working-tree.txt',options)?0:1;
`;
type Entry = { path: string; content: string };
const entries: Entry[] = [{ path: 'tests/fixture.ts', content: 'first\nSYNTHETIC_ONLY_SOURCE_CONTEXT\nlast' }];
function message(extra: Record<string, unknown> = {}) {
  return { ruleId: '@secretlint/secretlint-rule-basicauth', messageId: 'BasicAuth', severity: 'error', range: [6, 12], ...extra };
}
function invoke(spec: Record<string, unknown>) {
  const result = spawnSync(process.execPath, ['--input-type=module', '--eval', program], {
    input: JSON.stringify({ entries, ...spec }), encoding: 'utf8',
  });
  // Avoid matcher output disclosing a regression's raw captured material.
  expect(result.error === undefined).toBe(true);
  return { status: result.status, output: result.stdout + result.stderr };
}
function simulated(messages: unknown[], extra: Record<string, unknown> = {}) {
  return invoke({ result: { status: 1, stdout: JSON.stringify([{ filePath: 'untrusted-path', messages }]), stderr: 'SYNTHETIC_ONLY_STDERR' }, ...extra });
}
function metadata(output: string) {
  try { return JSON.parse(output); } catch { throw new Error('Safe wrapper diagnostic was not structured JSON.'); }
}

describe('secret scan safe diagnostics', () => {
  it('reports static identifiers and mapped source location, never source or raw JSON', () => {
    const result = simulated([message({ message: 'SYNTHETIC_ONLY_MATCH', data: { credential: 'SYNTHETIC_ONLY_DATA' }, loc: { start: { line: 999, column: 999 } } })]);
    expect(result.status).toBe(1);
    expect(metadata(result.output)).toEqual({ scanner: 'Secretlint', classification: 'SECRET_FINDING', input: 'working-tree.txt', findingCount: 1, additionalFindingCount: 0, findings: [{ ruleId: '@secretlint/secretlint-rule-basicauth', diagnosticId: 'BasicAuth', severity: 'error', path: 'tests/fixture.ts', line: 2, column: 1 }] });
    expect(result.output.includes('SYNTHETIC_ONLY')).toBe(false);
    expect(result.output.includes('filePath')).toBe(false);
    expect(result.output.includes('sourceContent')).toBe(false);
  });
  it.each(['password', 'bearer', 'api-key', 'oauth-code', 'cookie', 'session-id', 'authorization', 'database-url', 'query-secret', 'environment-secret', 'private-key', 'capability-url'])('withholds the synthetic %s family from every untrusted field', family => {
    const sentinel = `SYNTHETIC_ONLY_${family}`;
    const result = simulated([message({ ruleId: sentinel, messageId: sentinel, severity: sentinel, message: sentinel, data: sentinel, docsUrl: sentinel, loc: sentinel })], { entries: [{ path: 'tests/fixture.ts', content: `first\n${sentinel}` }] });
    expect(result.status).toBe(1);
    expect(result.output.includes('SYNTHETIC_ONLY')).toBe(false);
    expect(metadata(result.output).findings[0].ruleId).toBe('UNKNOWN_RULE');
    expect(metadata(result.output).findings[0].diagnosticId).toBe('UNKNOWN_DIAGNOSTIC');
  });
  it('bounds metadata to ten findings with an exact additional count', () => {
    const result = simulated(Array.from({ length: 13 }, () => message()));
    expect(result.status).toBe(1);
    expect(metadata(result.output).findingCount).toBe(13);
    expect(metadata(result.output).findings).toHaveLength(10);
    expect(metadata(result.output).additionalFindingCount).toBe(3);
  });
  it('maps a second source file using UTF-16 offsets, not aggregate lines or bytes', () => {
    const result = simulated([message({ range: [4, 6] })], { entries: [{ path: 'tests/first.ts', content: 'é\n' }, { path: 'tests/second.ts', content: 'ab\ncd' }] });
    expect(metadata(result.output).findings[0]).toMatchObject({ path: 'tests/second.ts', line: 1, column: 2 });
  });
  it('labels cross-file ranges as aggregate locations instead of guessing a path', () => {
    const result = simulated([message({ range: [1, 5] })], { entries: [{ path: 'tests/first.ts', content: 'ab' }, { path: 'tests/second.ts', content: 'cd' }] });
    const finding = metadata(result.output).findings[0];
    expect(finding.path).toBeUndefined();
    expect(finding.aggregateLine).toBe(1);
    expect(finding.aggregateColumn).toBe(2);
  });
  it('does not expose external or traversing input paths', () => {
    const result = simulated([message()], { entries: [{ path: '../SYNTHETIC_ONLY_PATH', content: 'first\ncontent' }] });
    expect(result.output.includes('SYNTHETIC_ONLY')).toBe(false);
    expect(metadata(result.output).findings[0].path).toBeUndefined();
  });
  it.each([{ status: 2 }, { status: null, signal: 'SIGTERM' }, { status: null, error: { message: 'SYNTHETIC_ONLY_PROCESS_ERROR' } }])('fails safely on scanner execution failure %#', failure => {
    const result = invoke({ result: { ...failure, stdout: 'SYNTHETIC_ONLY_STDOUT', stderr: 'SYNTHETIC_ONLY_STDERR' } });
    expect(result.status).toBe(1);
    expect(metadata(result.output).classification).toBe('SCANNER_EXECUTION_FAILURE');
    expect(result.output.includes('SYNTHETIC_ONLY')).toBe(false);
  });
  it('withholds thrown scanner exceptions', () => {
    const result = invoke({ mode: 'throw', sentinel: 'SYNTHETIC_ONLY_THROW' });
    expect(result.status).toBe(1);
    expect(metadata(result.output).classification).toBe('SCANNER_EXECUTION_FAILURE');
    expect(result.output.includes('SYNTHETIC_ONLY')).toBe(false);
  });
  it.each(['SYNTHETIC_ONLY_MALFORMED', '{}', '[null]', '[{"messages":[null]}]'])('fails closed on malformed scanner output %#', stdout => {
    const result = invoke({ result: { status: 1, stdout, stderr: 'SYNTHETIC_ONLY_STDERR' } });
    expect(result.status).toBe(1);
    expect(metadata(result.output).classification).toBe('SCANNER_OUTPUT_PARSE_FAILURE');
    expect(result.output.includes('SYNTHETIC_ONLY')).toBe(false);
  });
  it('fails on scanner exit one without normal findings', () => {
    const result = simulated([]);
    expect(result.status).toBe(1);
    expect(metadata(result.output).classification).toBe('SCANNER_EXECUTION_FAILURE');
  });
  it('passes controlled clean input through the real scanner and wrapper', () => {
    const result = invoke({ mode: 'real', entries: [{ path: 'tests/fixture.ts', content: 'ordinary nonsecret text' }] });
    expect(result.status).toBe(0);
    expect(result.output.length).toBe(0);
  });
  it('rejects a controlled synthetic finding through the real scanner and wrapper', () => {
    const synthetic = ['AK', 'IA', 'Z'.repeat(16)].join('');
    const result = invoke({ mode: 'real', entries: [{ path: 'tests/fixture.ts', content: `credential=${synthetic}` }] });
    expect(result.status).toBe(1);
    expect(result.output.includes(synthetic)).toBe(false);
    expect(metadata(result.output).classification).toBe('SECRET_FINDING');
    expect(metadata(result.output).findings[0].ruleId).toBe('@secretlint/secretlint-rule-aws');
    expect(metadata(result.output).findings[0].path).toBe('tests/fixture.ts');
  });
});
