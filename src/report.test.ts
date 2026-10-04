// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { alertOnce } from './report';

describe('alertOnce', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('alerts and warns once per topic', () => {
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    alertOnce('bridge-test-a', 'Bridge missing');
    alertOnce('bridge-test-a', 'Bridge missing again');

    expect(alert).toHaveBeenCalledTimes(1);
    expect(alert).toHaveBeenCalledWith('[Better Bunpro] Bridge missing');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith('[Better Bunpro] Bridge missing');
  });

  it('alerts again for a different topic', () => {
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    alertOnce('bridge-test-b', 'First');
    alertOnce('bridge-test-c', 'Second');

    expect(alert).toHaveBeenCalledTimes(2);
  });
});
