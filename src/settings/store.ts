import { GM_getValue, GM_setValue } from '$';

/**
 * Every persisted value goes through here so that swapping the userscript GM
 * storage for `chrome.storage` is a one-file change.
 */

type Listener = (key: string) => void;

const listeners = new Set<Listener>();

export function readStored<T>(key: string, fallback: T): T {
  try {
    if (typeof GM_getValue !== 'function') {
      return fallback;
    }
    const stored = GM_getValue<T | undefined>(key, undefined);
    return stored === undefined ? fallback : stored;
  } catch {
    return fallback;
  }
}

export function writeStored<T>(key: string, value: T): void {
  try {
    if (typeof GM_setValue === 'function') {
      GM_setValue(key, value);
    }
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
