import type { ReadStream, WriteStream } from 'node:tty';
import { SecurityOperationError } from '../security/sensitive.ts';

/** Raw TTY input only: no echo, no readline history, no argv/environment password. */
export function readProtectedLine(input: ReadStream, output: WriteStream, prompt: string, hidden: boolean): Promise<string> {
  if (!input.isTTY || !output.isTTY || typeof input.setRawMode !== 'function') throw new SecurityOperationError();
  return new Promise((resolve, reject) => {
    const wasRaw = input.isRaw;
    const decoder = new TextDecoder('utf-8', { fatal: true });
    let value = '';
    let settled = false;
    function finish(error?: Error) {
      if (settled) return;
      settled = true;
      input.off('data', data); input.off('end', end); input.off('error', end);
      for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) process.off(signal, end);
      try { input.setRawMode(wasRaw); } catch { error = new SecurityOperationError(); }
      try { input.pause(); output.write('\n'); } catch { error = new SecurityOperationError(); }
      if (error) reject(new SecurityOperationError()); else resolve(value);
      value = '';
    }
    function end() { finish(new SecurityOperationError()); }
    function data(chunk: Buffer) {
      try {
      for (const character of decoder.decode(chunk, { stream: true })) {
        if (character === '\u0003' || character === '\u0004') { end(); return; }
        if (character === '\r' || character === '\n') { decoder.decode(); finish(); return; }
        if (character === '\u007f' || character === '\b') {
          const characters = [...value]; characters.pop(); value = characters.join('');
          if (!hidden) output.write('\b \b');
        } else if (character < ' ' || character === '\u001b') { end(); return; }
        else {
          value += character;
          if (Buffer.byteLength(value, 'utf8') > 1024) { end(); return; }
          if (!hidden) output.write(character);
        }
      }
      } catch { end(); }
    }
    try {
      for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) process.once(signal, end);
      input.on('data', data); input.once('end', end); input.once('error', end);
      input.setRawMode(true); output.write(prompt); input.resume();
    } catch { end(); }
  });
}
