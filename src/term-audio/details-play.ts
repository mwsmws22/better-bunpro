/**
 * Details pitch play on a sentence review. The answer bar must not go through
 * the global TTS rewrite (that swap was loading the term recording on sentence
 * clicks), so this button plays the term recording itself.
 */

let listening = false;
let current: HTMLMediaElement | null = null;

export function startDetailsPlay(): void {
  if (listening) {
    return;
  }
  document.addEventListener('click', onDetailsClick, true);
  listening = true;
}

export function stopDetailsPlay(): void {
  if (!listening) {
    return;
  }
  document.removeEventListener('click', onDetailsClick, true);
  listening = false;
  if (typeof current?.pause === 'function') {
    current.pause();
  }
  current = null;
}

function onDetailsClick(event: MouseEvent): void {
  const button = detailsButton(event.target);
  if (!button || button.dataset.bbOwnPlay !== 'true') {
    return;
  }
  const url = button.dataset.bbResolvedUrl;
  if (!url) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  play(url);
}

function detailsButton(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) {
    return null;
  }
  const button = target.closest('.DetailsPitchAccent button');
  if (!(button instanceof HTMLElement)) {
    return null;
  }
  const icon = button.querySelector('svg')?.getAttribute('data-name');
  if (icon !== 'PLAY_CIRCLE_FILLED' && icon !== 'PAUSE') {
    return null;
  }
  return button;
}

function play(url: string): void {
  current?.pause();
  const audio = new Audio(url);
  current = audio;
  void audio.play().catch(() => {
    if (current === audio) {
      current = null;
    }
  });
}
