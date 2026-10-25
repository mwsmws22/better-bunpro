/**
 * vite-plugin-monkey hangs the Tampermonkey sandbox on `document.__monkeyWindow-*`.
 * Imports from `$` are captured when that client module loads, and Vite has been
 * seen to leave them undefined. Callers resolve GM from this holder at use time.
 */
export interface MonkeySandbox {
  GM_getValue?: <T>(key: string, defaultValue?: T) => T;
  GM_setValue?: (key: string, value: unknown) => void;
  GM_xmlhttpRequest?: (details: object) => void;
  GM?: {
    getValue?: <T>(key: string, defaultValue?: T) => T;
    setValue?: (key: string, value: unknown) => void;
    xmlHttpRequest?: (details: object) => void;
  };
}

export function findMonkeySandbox(): MonkeySandbox | undefined {
  for (const key of Object.getOwnPropertyNames(document)) {
    if (!key.startsWith('__monkeyWindow-')) {
      continue;
    }
    const holder = (document as unknown as Record<string, MonkeySandbox | undefined>)[key];
    if (holder && typeof holder === 'object') {
      return holder;
    }
  }
  return undefined;
}
