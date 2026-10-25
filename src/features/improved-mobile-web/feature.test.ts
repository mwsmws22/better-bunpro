// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { improvedMobileWebFeature } from './feature';
import { MOBILE_WEB_CLASS } from './mobile-gate';
import { PROMPT_SCROLLING_CLASS, reviewPage } from './prompt-scroll';
import { BB_VV_HEIGHT, BB_VV_OFFSET_TOP } from './visual-viewport';

describe('improvedMobileWebFeature', () => {
  beforeEach(() => {
    document.documentElement.className = '';
    document.documentElement.style.removeProperty(BB_VV_HEIGHT);
    document.documentElement.style.removeProperty(BB_VV_OFFSET_TOP);
    document.getElementById('bb-styles')?.remove();
    vi.stubGlobal('innerWidth', 390);
    vi.stubGlobal('innerHeight', 800);
    vi.stubGlobal('outerHeight', 800);
    vi.stubGlobal('visualViewport', {
      height: 800,
      offsetTop: 0,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    vi.stubGlobal('navigator', {
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
    });
  });

  afterEach(() => {
    improvedMobileWebFeature.stop();
    document.documentElement.className = '';
    document.documentElement.style.removeProperty(BB_VV_HEIGHT);
    document.documentElement.style.removeProperty(BB_VV_OFFSET_TOP);
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('marks html and syncs viewport height while running on mobile', () => {
    improvedMobileWebFeature.start();

    expect(document.documentElement.classList.contains(MOBILE_WEB_CLASS)).toBe(true);
    expect(document.documentElement.style.getPropertyValue(BB_VV_HEIGHT)).toBe('800px');
    const styles = document.getElementById('bb-styles')?.textContent ?? '';
    expect(styles).toContain(`html.${MOBILE_WEB_CLASS}`);
    expect(styles).toContain('bb-vv-height');
    expect(styles).toContain('justify-content: safe center');
    expect(styles).toContain('touch-action: pan-y');
    expect(styles).toContain('overscroll-behavior: none');
    expect(styles).not.toContain('overscroll-behavior-y: auto');
    expect(styles).toContain('position: fixed');
    expect(styles).toContain('height: var(--bb-vv-height, 100dvh)');
    expect(styles).not.toContain('margin-bottom: 1px');
    expect(styles).not.toContain('bb-vv-offset-top');
    expect(document.documentElement.style.getPropertyValue(BB_VV_OFFSET_TOP)).toBe('');
    const root = rootShellRule(styles);
    expect(root).toContain('html.bb-mobile-web,');
    expect(root).toContain('html.bb-mobile-web body');
    expect(root).toContain('overflow: hidden');
    expect(root).toContain('margin: 0');
    expect(root).toContain('top: 0');
    expect(root).not.toContain('margin-bottom');
    const page = ruleFor(styles, 'html.bb-mobile-web #js-page-top');
    expect(page).toContain('display: flex');
    expect(page).toContain('flex-direction: column');
    expect(page).toContain('height: var(--bb-vv-height, 100dvh)');
    const quiz = ruleFor(styles, 'html.bb-mobile-web #js-quiz');
    expect(quiz).toContain('flex: 1 1 0');
    expect(quiz).toContain('height: auto');
    expect(quiz).not.toContain('var(--bb-vv-height');
    const article = ruleFor(
      styles,
      'html.bb-mobile-web #js-quiz article:not(.bp-reviewable-root):not(.bp-modal-container)',
    );
    expect(article).toContain('min-height: 0');
    expect(article).toContain('height: 100%');
    expect(article).not.toContain('var(--bb-vv-height');
    expect(styles).toContain(
      'article:not(.bp-reviewable-root):not(.bp-modal-container) > footer {\n  flex: 0 0 auto;',
    );
    expect(styles).toContain(PROMPT_SCROLLING_CLASS);
    expect(styles).toContain(
      'html.bb-mobile-web #js-quiz .bp-quiz-question button::before {\n  bottom: 0.4em !important;\n}',
    );
    expect(styles).toContain(
      [
        'html.bb-mobile-web #js-quiz .bp-quiz-question button:has(> .text-primary-accent)::before,',
        'html.bb-mobile-web #js-quiz .bp-quiz-question button:has(> .text-correct)::before,',
        'html.bb-mobile-web #js-quiz .bp-quiz-question button:has(> .text-incorrect)::before {',
        '  bottom: 0 !important;',
        '}',
      ].join('\n'),
    );
    expect(styles).toContain(
      [
        'html.bb-mobile-web #js-quiz:has(#quiz-metadata-element[data-meta-is-revealing="true"][data-meta-is-correct="false"][data-meta-input=""]) .bp-quiz-question button > .text-correct {',
        '  color: rgb(var(--c-incorrect) / 1);',
        '}',
      ].join('\n'),
    );
  });

  it('keeps the document at the top instead of a scrolled layout viewport', () => {
    const meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = 'width=device-width, height=device-height, initial-scale=1, minimum-scale=1';
    document.head.append(meta);
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    vi.stubGlobal('scrollY', 240);

    improvedMobileWebFeature.start();

    expect(meta.content).toBe('width=device-width, initial-scale=1, minimum-scale=1');
    expect(meta.content).not.toContain('height=device-height');
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
    expect(document.documentElement.style.getPropertyValue(BB_VV_OFFSET_TOP)).toBe('');

    improvedMobileWebFeature.stop();
    expect(meta.content).toContain('height=device-height');
    meta.remove();
  });

  it('clears the mobile marker and viewport vars when stopped', () => {
    improvedMobileWebFeature.start();
    improvedMobileWebFeature.stop();

    expect(document.documentElement.classList.contains(MOBILE_WEB_CLASS)).toBe(false);
    expect(document.documentElement.style.getPropertyValue(BB_VV_HEIGHT)).toBe('');
  });

  it('keeps answer focus when Hint is pressed while the keyboard is up', () => {
    vi.stubGlobal('innerHeight', 800);
    vi.stubGlobal('visualViewport', {
      height: 500,
      offsetTop: 0,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    const { input, span } = mountHintPress();
    input.focus();

    let focusedDuringClick = false;
    span.parentElement!.addEventListener('click', () => {
      input.blur();
      focusedDuringClick = document.activeElement === input;
    });
    span.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    span.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    span.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(focusedDuringClick).toBe(true);
    expect(document.activeElement).toBe(input);
  });

  it('keeps answer focus when the simulator frame shrinks for the keyboard', () => {
    vi.stubGlobal('screen', { height: 1440, width: 2560 });
    const { input, span } = mountHintPress();
    vi.stubGlobal('innerHeight', 500);
    vi.stubGlobal('visualViewport', {
      height: 500,
      offsetTop: 0,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    input.focus();

    let focusedDuringClick = false;
    span.parentElement!.addEventListener('click', () => {
      input.blur();
      focusedDuringClick = document.activeElement === input;
    });
    span.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    span.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    span.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(focusedDuringClick).toBe(true);
    expect(document.activeElement).toBe(input);
  });

  it('keeps answer focus when the simulator frame is already keyboard-short', () => {
    vi.stubGlobal('screen', { height: 1440, width: 2560 });
    vi.stubGlobal('innerWidth', 390);
    vi.stubGlobal('innerHeight', 480);
    vi.stubGlobal('visualViewport', {
      height: 480,
      offsetTop: 0,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    const { input, span } = mountHintPress();
    input.focus();

    let focusedDuringClick = false;
    span.parentElement!.addEventListener('click', () => {
      input.blur();
      focusedDuringClick = document.activeElement === input;
    });
    span.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    span.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    span.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(focusedDuringClick).toBe(true);
    expect(document.activeElement).toBe(input);
  });

  it('keeps the answer focused when an empty answer is submitted', () => {
    vi.useFakeTimers();
    const { input, button } = mountEmptySubmit();
    input.focus();
    let submitted = false;
    button.addEventListener('mousedown', () => input.blur());
    button.addEventListener('click', () => {
      submitted = true;
      input.blur();
    });

    pressSubmit(button);

    expect(submitted).toBe(true);
    expect(document.activeElement).toBe(input);
    vi.advanceTimersByTime(0);
    input.blur();
    expect(document.activeElement).not.toBe(input);
  });

  it('keeps the answer focused when Enter submits an empty answer', () => {
    vi.useFakeTimers();
    const { input } = mountEmptySubmit();
    input.focus();
    input.addEventListener('keydown', () => input.blur());

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(document.activeElement).toBe(input);
    vi.advanceTimersByTime(0);
    input.blur();
    expect(document.activeElement).not.toBe(input);
  });

  it('does not focus the answer when an empty submit happens with the keyboard hidden', () => {
    const { input, button } = mountEmptySubmit();

    pressSubmit(button);

    expect(document.activeElement).not.toBe(input);
  });

  it('keeps the answer focused when a graded answer is submitted', () => {
    vi.useFakeTimers();
    const { input, button } = mountEmptySubmit();
    input.value = 'ねる';
    input.focus();
    button.addEventListener('mousedown', () => input.blur());
    button.addEventListener('click', () => input.blur());

    pressSubmit(button);

    expect(document.activeElement).toBe(input);
    vi.advanceTimersByTime(0);
    input.blur();
    expect(document.activeElement).not.toBe(input);
  });

  it('keeps the answer focused when Enter submits a graded answer', () => {
    vi.useFakeTimers();
    const { input } = mountEmptySubmit();
    input.value = 'ねる';
    input.focus();
    input.addEventListener('keydown', () => input.blur());

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(document.activeElement).toBe(input);
    vi.advanceTimersByTime(0);
    input.blur();
    expect(document.activeElement).not.toBe(input);
  });

  it('does not open the keyboard when a graded answer is submitted with it hidden', () => {
    const { input, button } = mountEmptySubmit();
    input.value = 'ねる';

    pressSubmit(button);

    expect(document.activeElement).not.toBe(input);
  });

  it('focuses the answer field when a review page loads', () => {
    const input = mountReview();

    expect(document.activeElement).toBe(input);
  });

  it('focuses the answer field when it appears on a review', async () => {
    document.body.innerHTML = reviewMarkup(1);
    improvedMobileWebFeature.start();
    const input = document.createElement('input');
    input.id = 'js-manual-input';
    document.body.append(input);

    await flushObservers();

    expect(document.activeElement).toBe(input);
  });

  it('does not reopen the keyboard after the back gesture dismisses it', async () => {
    const input = mountReview();
    input.blur();
    document.getElementById('quiz-metadata-element')!.setAttribute('data-meta-is-correct', 'true');
    document.body.append(document.createElement('span'));

    await flushObservers();

    expect(document.activeElement).not.toBe(input);
  });

  it('focuses the answer field again on the next review', async () => {
    const input = mountReview(1);
    input.blur();
    document.getElementById('quiz-metadata-element')!.setAttribute(
      'data-meta-info',
      JSON.stringify({ id: 2, type: 'vocab' }),
    );

    await flushObservers();

    expect(document.activeElement).toBe(input);
  });

  it('focuses the answer field again when the review page loads again', () => {
    const input = mountReview();
    input.blur();

    improvedMobileWebFeature.stop();
    improvedMobileWebFeature.start();

    expect(document.activeElement).toBe(input);
  });

  it('paints a given-up blank incorrect and leaves a correct answer green', () => {
    improvedMobileWebFeature.start();
    document.documentElement.style.setProperty('--c-incorrect', '200 76 82');
    document.documentElement.style.setProperty('--c-correct', '103 188 105');
    const bunpro = document.createElement('style');
    bunpro.textContent = '.text-correct { color: rgb(var(--c-correct) / 1); }';
    document.head.append(bunpro);
    document.body.innerHTML = `
      <div id="js-quiz">
        <div id="quiz-metadata-element" data-meta-is-revealing="true" data-meta-is-correct="false" data-meta-input=""></div>
        <div class="bp-quiz-question"><button><span class="text-correct">答え</span></button></div>
      </div>
    `;
    const blank = document.querySelector('.text-correct') as HTMLElement;
    const givenUp = getComputedStyle(blank).color;

    const meta = document.getElementById('quiz-metadata-element')!;
    meta.setAttribute('data-meta-is-correct', 'true');
    meta.setAttribute('data-meta-input', '答え');
    const correct = getComputedStyle(blank).color;

    bunpro.remove();
    document.documentElement.style.removeProperty('--c-incorrect');
    document.documentElement.style.removeProperty('--c-correct');
    expect(givenUp).toContain('--c-incorrect');
    expect(correct).toContain('--c-correct');
    expect(givenUp).not.toBe(correct);
  });

  it('does not open the keyboard when Hint is pressed while it is hidden', () => {
    vi.stubGlobal('outerHeight', 2000);
    vi.stubGlobal('screen', { height: 1440, width: 2560 });
    const { input, span } = mountHintPress();
    let focusedDuringClick = false;
    span.parentElement!.addEventListener('click', () => {
      input.focus();
      focusedDuringClick = document.activeElement === input;
    });
    span.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    span.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(focusedDuringClick).toBe(false);
    expect(document.activeElement).not.toBe(input);
  });

  it('shows the prompt scrollbar only while that section scrolls', () => {
    vi.useFakeTimers();
    document.body.innerHTML = `
      <div id="js-quiz"><article><section></section></article></div>
    `;
    improvedMobileWebFeature.start();
    const section = document.querySelector('section')!;
    section.dispatchEvent(new Event('scroll'));

    expect(document.documentElement.classList.contains(PROMPT_SCROLLING_CLASS)).toBe(true);
    vi.advanceTimersByTime(700);
    expect(document.documentElement.classList.contains(PROMPT_SCROLLING_CLASS)).toBe(false);
    vi.useRealTimers();
  });

  it('drags the prompt with a mouse the way the simulator drags a finger', () => {
    const section = mountScrollablePrompt();
    improvedMobileWebFeature.start();

    dragPrompt(section, 'mouse', 100, 40);

    expect(section.scrollTop).toBe(60);
  });

  it('leaves a real touch pan to the browser', () => {
    const section = mountScrollablePrompt();
    improvedMobileWebFeature.start();

    dragPrompt(section, 'touch', 100, 40);

    expect(section.scrollTop).toBe(0);
  });

  it('returns the prompt to the top when a viewport resize makes it fit', () => {
    let scrollHeight = 400;
    let clientHeight = 100;
    const section = mountPromptWithGeometry(
      () => scrollHeight,
      () => clientHeight,
    );
    const viewport = window.visualViewport as VisualViewport & {
      addEventListener: ReturnType<typeof vi.fn>;
    };
    improvedMobileWebFeature.start();
    section.scrollTop = 70;

    scrollHeight = 90;
    clientHeight = 120;
    for (const [, listener] of viewport.addEventListener.mock.calls.filter(
      ([type]) => type === 'resize',
    )) {
      listener(new Event('resize'));
    }

    expect(section.scrollTop).toBe(0);
  });

  it('keeps the answer focused when the prompt is dragged with the keyboard up', () => {
    vi.stubGlobal('innerWidth', 390);
    vi.stubGlobal('innerHeight', 480);
    vi.stubGlobal('screen', { height: 1440, width: 2560 });
    const section = mountScrollablePrompt();
    const input = document.createElement('input');
    input.id = 'js-manual-input';
    document.body.append(input);
    improvedMobileWebFeature.start();
    input.focus();

    section.addEventListener('mousedown', () => input.blur());
    section.dispatchEvent(pointerAt('pointerdown', 'mouse', 100, 1));
    section.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));

    expect(document.activeElement).toBe(input);
    section.dispatchEvent(pointerAt('pointerup', 'mouse', 40, 0));
    expect(document.activeElement).toBe(input);
  });

  it('keeps a focused answer field focused when the prompt is dragged', () => {
    const section = mountScrollablePrompt();
    const input = document.createElement('input');
    input.id = 'js-manual-input';
    document.body.append(input);
    improvedMobileWebFeature.start();
    input.focus();

    section.addEventListener('mousedown', () => input.blur());
    section.dispatchEvent(pointerAt('pointerdown', 'mouse', 100, 1));
    section.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));

    expect(document.activeElement).toBe(input);
  });

  it('keeps the answer focused when a prompt tap blurs after pointerup', () => {
    const section = mountScrollablePrompt();
    const input = document.createElement('input');
    input.id = 'js-manual-input';
    document.body.append(input);
    improvedMobileWebFeature.start();
    input.focus();

    section.addEventListener('mousedown', () => input.blur());
    section.dispatchEvent(pointerAt('pointerdown', 'touch', 80, 1));
    section.dispatchEvent(pointerAt('pointerup', 'touch', 80, 0));
    section.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));

    expect(document.activeElement).toBe(input);

    section.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    input.blur();
    expect(document.activeElement).not.toBe(input);
  });

  it('does not open the keyboard when the prompt is tapped while it is hidden', () => {
    const section = mountScrollablePrompt();
    const input = document.createElement('input');
    input.id = 'js-manual-input';
    document.body.append(input);
    improvedMobileWebFeature.start();

    section.dispatchEvent(pointerAt('pointerdown', 'touch', 80, 1));
    section.dispatchEvent(pointerAt('pointerup', 'touch', 80, 0));
    section.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(document.activeElement).not.toBe(input);
  });

  it('reloads the page when a touch pulls down from the top of the prompt', () => {
    const reload = vi.spyOn(reviewPage, 'reload').mockImplementation(() => {});
    const section = mountScrollablePrompt();
    improvedMobileWebFeature.start();

    section.dispatchEvent(pointerAt('pointerdown', 'touch', 40, 1));
    section.dispatchEvent(pointerAt('pointerup', 'touch', 40 + 80, 0));

    expect(reload).toHaveBeenCalledOnce();
  });

  it('does not reload when the pull is short or the prompt is already scrolled', () => {
    const reload = vi.spyOn(reviewPage, 'reload').mockImplementation(() => {});
    const section = mountScrollablePrompt();
    improvedMobileWebFeature.start();

    section.dispatchEvent(pointerAt('pointerdown', 'touch', 40, 1));
    section.dispatchEvent(pointerAt('pointerup', 'touch', 60, 0));
    expect(reload).not.toHaveBeenCalled();

    section.scrollTop = 30;
    section.dispatchEvent(pointerAt('pointerdown', 'touch', 40, 1));
    section.dispatchEvent(pointerAt('pointerup', 'touch', 200, 0));
    expect(reload).not.toHaveBeenCalled();
  });

  it('does not focus the answer field when dragging with the keyboard hidden', () => {
    const section = mountScrollablePrompt();
    const input = document.createElement('input');
    input.id = 'js-manual-input';
    document.body.append(input);
    improvedMobileWebFeature.start();

    section.dispatchEvent(pointerAt('pointerdown', 'mouse', 100, 1));

    expect(document.activeElement).not.toBe(input);
  });

  it('does not mark html on a wide desktop viewport', () => {
    vi.stubGlobal('innerWidth', 1280);
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Firefox/140.0' });

    improvedMobileWebFeature.start();

    expect(document.documentElement.classList.contains(MOBILE_WEB_CLASS)).toBe(false);
    expect(document.documentElement.style.getPropertyValue(BB_VV_HEIGHT)).toBe('');
  });
});

function rootShellRule(styles: string): string {
  const start = styles.indexOf('html.bb-mobile-web,');
  const end = styles.indexOf('html.bb-mobile-web #js-page-top');
  return styles.slice(start, end);
}

function ruleFor(styles: string, selector: string): string {
  const start = styles.indexOf(`${selector} {`);
  const end = styles.indexOf('}', start);
  return styles.slice(start, end + 1);
}

function mountScrollablePrompt(): HTMLElement {
  return mountPromptWithGeometry(() => 400, () => 100);
}

function mountPromptWithGeometry(
  scrollHeight: () => number,
  clientHeight: () => number,
): HTMLElement {
  document.body.innerHTML = `
    <div id="js-quiz"><article><section><p>prompt</p></section></article></div>
  `;
  const section = document.querySelector('section') as HTMLElement;
  let top = 0;
  Object.defineProperty(section, 'scrollHeight', { configurable: true, get: scrollHeight });
  Object.defineProperty(section, 'clientHeight', { configurable: true, get: clientHeight });
  Object.defineProperty(section, 'scrollTop', {
    configurable: true,
    get: () => top,
    set: (value: number) => {
      top = value;
    },
  });
  return section;
}

const DRAG_PAST_START = 20;

function dragPrompt(section: HTMLElement, pointerType: string, fromY: number, toY: number): void {
  const midY = fromY - DRAG_PAST_START;
  section.dispatchEvent(pointerAt('pointerdown', pointerType, fromY, 1));
  section.dispatchEvent(pointerAt('pointermove', pointerType, midY, 1));
  section.dispatchEvent(pointerAt('pointermove', pointerType, toY, 1));
  section.dispatchEvent(pointerAt('pointerup', pointerType, toY, 0));
}

function pointerAt(type: string, pointerType: string, clientY: number, buttons: number): PointerEvent {
  return new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    pointerId: 1,
    pointerType,
    button: 0,
    buttons,
    clientY,
  });
}

function reviewMarkup(id: number, session = 'session-1'): string {
  return `
    <div id="quiz-metadata-element"
      data-meta-session-id="${session}"
      data-meta-info='{"id":${id},"type":"vocab"}'
      data-meta-input-mode="manual"></div>
  `;
}

function mountReview(id = 1): HTMLInputElement {
  document.body.innerHTML = `
    ${reviewMarkup(id)}
    <input id="js-manual-input" />
  `;
  improvedMobileWebFeature.start();
  return document.getElementById('js-manual-input') as HTMLInputElement;
}

async function flushObservers(): Promise<void> {
  for (let i = 0; i < 5; i += 1) {
    await Promise.resolve();
  }
}

function mountEmptySubmit(): { input: HTMLInputElement; button: HTMLButtonElement } {
  document.body.innerHTML = `
    <input id="js-manual-input" />
    <button class="InputManual__button"><span>submit</span></button>
  `;
  improvedMobileWebFeature.start();
  return {
    input: document.getElementById('js-manual-input') as HTMLInputElement,
    button: document.querySelector('.InputManual__button') as HTMLButtonElement,
  };
}

function pressSubmit(button: HTMLElement): void {
  const control = button.querySelector('span') ?? button;
  control.dispatchEvent(new Event('pointerdown', { bubbles: true }));
  control.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
  control.dispatchEvent(new Event('pointerup', { bubbles: true }));
  control.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

function mountHintPress(): { input: HTMLInputElement; span: Element } {
  document.body.innerHTML = `
    <input id="js-manual-input" />
    <button title="Toggle the hint level"><span>Hint</span></button>
  `;
  improvedMobileWebFeature.start();
  return {
    input: document.getElementById('js-manual-input') as HTMLInputElement,
    span: document.querySelector('button span')!,
  };
}
