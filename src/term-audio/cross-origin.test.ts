// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const gm = vi.hoisted(() => ({
  GM_xmlhttpRequest: undefined as unknown,
  GM: undefined as { xmlHttpRequest?: unknown } | undefined,
}));

vi.mock('$', () => gm);

describe('warnIfGmBridgeMissing', () => {
  beforeEach(() => {
    gm.GM_xmlhttpRequest = undefined;
    gm.GM = undefined;
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('alerts once when neither GM form is available', async () => {
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { warnIfGmBridgeMissing } = await import('./cross-origin');
    warnIfGmBridgeMissing();
    warnIfGmBridgeMissing();

    expect(alert).toHaveBeenCalledTimes(1);
    expect(alert.mock.calls[0]?.[0]).toMatch(/GM_xmlhttpRequest/);
    expect(alert.mock.calls[0]?.[0]).toMatch(/Update or Reinstall/);
    expect(document.documentElement.dataset.bbGmBridge).toBe('missing');
  });

  it('does not alert when GM_xmlhttpRequest is a function', async () => {
    gm.GM_xmlhttpRequest = vi.fn();
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});

    const { warnIfGmBridgeMissing } = await import('./cross-origin');
    warnIfGmBridgeMissing();

    expect(alert).not.toHaveBeenCalled();
    expect(document.documentElement.dataset.bbGmBridge).toBe('ok');
  });

  it('does not alert when only GM.xmlHttpRequest is a function', async () => {
    gm.GM = { xmlHttpRequest: vi.fn() };
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});

    const { warnIfGmBridgeMissing } = await import('./cross-origin');
    warnIfGmBridgeMissing();

    expect(alert).not.toHaveBeenCalled();
    expect(document.documentElement.dataset.bbGmBridge).toBe('ok');
  });

  it('uses document.__monkeyWindow-* when $ imports are undefined', async () => {
    const xml = vi.fn();
    Object.defineProperty(document, '__monkeyWindow-test', {
      value: { GM_xmlhttpRequest: xml },
      configurable: true,
    });
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});

    const { warnIfGmBridgeMissing } = await import('./cross-origin');
    warnIfGmBridgeMissing();

    expect(alert).not.toHaveBeenCalled();
    expect(document.documentElement.dataset.bbGmBridge).toBe('ok');

    delete (document as Document & Record<string, unknown>)['__monkeyWindow-test'];
  });
});
