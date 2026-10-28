/** Project only bounded transport metadata. Never serialize an exception, its
 * message/cause, request, response, headers, object key, body or environment. */
type Operation = 'Configuration' | 'Initialize' | 'PutObject' | 'GetObject' | 'HeadObject' | 'DeleteObject' | 'ListObjectsV2';
const codes = new Set([
  'AccessDenied', 'InvalidAccessKeyId', 'SignatureDoesNotMatch', 'ExpiredToken', 'InvalidToken',
  'AuthorizationHeaderMalformed', 'CredentialsProviderError', 'NoSuchBucket', 'NoSuchKey', 'NotFound',
  'InvalidRequest', 'InvalidArgument', 'InvalidDigest', 'BadDigest', 'NotImplemented', 'MethodNotAllowed',
  'PreconditionFailed', 'ConditionalRequestConflict', 'EntityTooLarge', 'RequestTimeout', 'RequestTimeTooSkewed',
  'SlowDown', 'ServiceUnavailable', 'InternalError', 'PermanentRedirect', 'TooManyRequests',
  'TimeoutError', 'AbortError', 'NetworkingError', 'MediaError', 'Error',
  'ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'EAI_AGAIN', 'ETIMEDOUT', 'EACCES', 'ENOSPC', 'EMFILE',
  'CERT_HAS_EXPIRED', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'ERR_TLS_CERT_ALTNAME_INVALID', 'DEPTH_ZERO_SELF_SIGNED_CERT',
]);
function field(value: unknown, key: string): unknown {
  if (!value || typeof value !== 'object') return undefined;
  // Do not invoke unknown accessors or coerce arbitrary objects to strings.
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  return descriptor && 'value' in descriptor ? descriptor.value : undefined;
}
function code(value: unknown) { return typeof value === 'string' && codes.has(value) ? value : 'Unavailable'; }
export function logObjectStorageError(operation: Operation, error: unknown, credentials: readonly string[] = []) {
  try {
    const metadata = field(error, '$metadata'), retryable = field(error, '$retryable');
    const status = field(metadata, 'httpStatusCode'), attempts = field(metadata, 'attempts');
    const id = field(metadata, 'requestId');
    // Recognized opaque request-id forms only. In particular session/CSRF tokens,
    // base64 keys, URLs and arbitrary upstream text cannot become log values.
    const requestId = typeof id === 'string' && /^(?:[a-fA-F0-9]{16}|[a-fA-F0-9]{24}|[a-fA-F0-9]{32}|[a-fA-F0-9]{40}|[a-fA-F0-9]{48}|[a-fA-F0-9]{64}|[A-Z0-9]{16}|[a-fA-F0-9]{8}(?:-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12})$/.test(id)
      && !credentials.some(secret => secret.length > 0 && id.includes(secret)) ? id : 'Unavailable';
    const fault = field(error, '$fault');
    const line = [
      'MEDIA_STORAGE_ERROR', `operation=${operation}`, `name=${code(field(error, 'name'))}`,
      `code=${code(field(error, 'Code') ?? field(error, 'code'))}`,
      `status=${typeof status === 'number' && Number.isInteger(status) && status >= 100 && status <= 599 ? status : 'Unavailable'}`,
      `requestId=${requestId}`, `fault=${fault === 'client' || fault === 'server' ? fault : 'Unavailable'}`,
      `retryable=${retryable && typeof retryable === 'object' ? 'true' : 'Unavailable'}`,
      `throttling=${field(retryable, 'throttling') === true ? 'true' : 'false'}`,
      `attempts=${typeof attempts === 'number' && Number.isInteger(attempts) && attempts >= 1 && attempts <= 10 ? attempts : 'Unavailable'}`,
    ].join(' ');
    console.error(line);
  } catch { /* Diagnostics must never alter the generic failure or expose a raw exception. */ }
}
