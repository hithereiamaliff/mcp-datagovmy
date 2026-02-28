import { AsyncLocalStorage } from 'node:async_hooks';
import type { CredentialConfig } from './runtime-config.js';

interface RequestContext {
  credentials: CredentialConfig;
}

const storage = new AsyncLocalStorage<RequestContext>();

export function runWithRequestContext<T>(
  context: RequestContext,
  fn: () => Promise<T>
): Promise<T> {
  return storage.run(context, fn);
}

export function getRequestCredentials(): CredentialConfig | undefined {
  return storage.getStore()?.credentials;
}
