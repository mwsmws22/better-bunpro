// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('$', () => ({
  GM_getValue: undefined,
  GM_setValue: undefined,
}));

describe('readStored', () => {
  afterEach(() => {
    delete (document as Document & Record<string, unknown>)['__monkeyWindow-test'];
  });

  it('reads and writes through the Tampermonkey sandbox when $ imports are undefined', async () => {
    const values = new Map<string, unknown>();
    Object.defineProperty(document, '__monkeyWindow-test', {
      configurable: true,
      value: {
        GM_getValue: (key: string, fallback?: unknown) => (values.has(key) ? values.get(key) : fallback),
        GM_setValue: (key: string, value: unknown) => {
          values.set(key, value);
        },
      },
    });

    const { readStored, writeStored } = await import('./store');

    expect(readStored('feature.hide-srs.enabled', true)).toBe(true);
    writeStored('feature.hide-srs.enabled', false);
    expect(readStored('feature.hide-srs.enabled', true)).toBe(false);
  });
});
