import 'server-only';
import { validateEnvironment, type EnvironmentSource, type ServerEnvironment } from './schema';

/** Call from server startup/request code when introduced; never from client code. */
export function loadServerEnvironment(source: EnvironmentSource = process.env): ServerEnvironment {
  return validateEnvironment(source);
}
