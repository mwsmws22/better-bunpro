import { GM_getValue, GM_setValue } from '$';
import { findMonkeySandbox } from '../gm/sandbox';

/**
 * Every persisted value goes through here so that swapping the userscript GM
 * storage for `chrome.storage` is a one-file change.
 */

type Listener = (key: string) => void;
type GmGet = <T>(key: string, defaultValue?: T) => T;
type GmSet = (key: string, value: unknown) => void;

const listeners = new Set<Listener>();

export function readStored<T>(key: string, fallback: T): T {
  try {
    const read = resolveGmGet();
    if (!read) {
      return fallback;
    }
    const stored = read<T | undefined>(key, undefined);
    return stored === undefined ? fallback : stored;
  } catch {
    return fallback;
  }
}

export function writeStored<T>(key: string, value: T): void {
  try {
    resolveGmSet()?.(key, value);
  } catch {
    // Dev / missing grant — keep in-memory listeners only.
  }
  for (const listener of listeners) {
    listener(key);
  }
}

export function onStoredChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function resolveGmGet(): GmGet | undefined {
  if (typeof GM_getValue === 'function') {
    return GM_getValue;
  }
  const sandbox = findMonkeySandbox();
  if (typeof sandbox?.GM_getValue === 'function') {
    return sandbox.GM_getValue;
  }
  if (typeof sandbox?.GM?.getValue === 'function') {
    return sandbox.GM.getValue;
  }
  return undefined;
}

function resolveGmSet(): GmSet | undefined {
  if (typeof GM_setValue === 'function') {
    return GM_setValue;
  }
  const sandbox = findMonkeySandbox();
  if (typeof sandbox?.GM_setValue === 'function') {
    return sandbox.GM_setValue;
  }
  if (typeof sandbox?.GM?.setValue === 'function') {
    return sandbox.GM.setValue;
  }
  return undefined;
}
