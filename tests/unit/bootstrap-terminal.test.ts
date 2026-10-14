import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('secure CLI input boundary', () => {
  it('rejects noninteractive input and password arguments before opening a database', () => {
    for (const args of [[], ['--password'], ['--password=']]) {
      const result = spawnSync(process.execPath, ['scripts/owner-bootstrap.mjs', ...args], { input: 'must-not-be-used', encoding: 'utf8', timeout: 10000 });
      expect(result.status).toBe(1);
      expect(result.stdout + result.stderr).not.toContain('must-not-be-used');
      expect(result.stdout + result.stderr).toContain('secure interactive terminal');
    }
  });
  it('reads a real pseudo-terminal without echoing the generated secret', () => {
    const script = `
import os,pty,select,secrets,subprocess,tempfile,time,json,sys
with tempfile.TemporaryDirectory(prefix='bsa-tty-') as directory:
 filename=os.path.join(directory,'input.mjs')
 module=os.path.join(sys.argv[1],'src/server/auth/terminal.ts')
 with open(filename,'w') as f:
  f.write('import {readProtectedLine} from '+json.dumps(module)+'; const value=await readProtectedLine(process.stdin,process.stderr,"Hidden: ",true); console.log(JSON.stringify({bytes:Buffer.byteLength(value)}));')
 master,slave=pty.openpty()
 child=subprocess.Popen([sys.argv[2],filename],stdin=slave,stdout=slave,stderr=slave)
 os.close(slave)
 secret=secrets.token_hex(24).encode()
 captured=b'';sent=False;deadline=time.monotonic()+8
 while time.monotonic()<deadline:
  ready,_,_=select.select([master],[],[],0.1)
  if ready:
   try: chunk=os.read(master,4096)
   except OSError: break
   if not chunk: break
   captured+=chunk
   if not sent and b'Hidden: ' in captured:
    os.write(master,secret+b'\\r');sent=True
  if child.poll() is not None and not ready: break
 if child.poll() is None:child.kill()
 code=child.wait();os.close(master)
 print(json.dumps({'success':code==0 and b'"bytes":48' in captured,'leaked':secret in captured}))
`;
    const result = spawnSync('python3', ['-c', script, path.resolve('.'), process.execPath], { encoding: 'utf8', timeout: 10000 });
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({ success: true, leaked: false });
  });
  it.each(['hidden', 'ctrl_c', 'signal', 'error', 'invalid_utf8', 'cli_args'])('restores the real terminal and protects input on %s', (mode) => {
    const result = spawnSync('python3', ['tests/helpers/secure-terminal-probe.py', path.resolve('.'), process.execPath, mode], { encoding: 'utf8', timeout: 25000 });
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({ successes: mode === 'hidden' ? 1 : 0, safeFailures: mode === 'hidden' ? 0 : 1, restored: true, leaked: false, unexpectedSuccess: false });
  });
});
