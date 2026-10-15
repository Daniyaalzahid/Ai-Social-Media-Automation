import type { NextRequest } from 'next/server';
import { decodeBrowserJson } from '../auth/browser-security';
import { SecurityOperationError } from './sensitive';
export async function browserBody(request: NextRequest, maximumBytes: 4096 | 16384 = 4096): Promise<unknown> {
  if (request.headers.get('content-type') !== 'application/json') throw new SecurityOperationError();
  const reader = request.body?.getReader(); if (!reader) throw new SecurityOperationError();
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > maximumBytes) { await reader.cancel(); throw new SecurityOperationError(); } chunks.push(value); }
  return decodeBrowserJson(Buffer.concat(chunks));
}
