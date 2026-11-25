import { requestBlob } from './cross-origin';
import { readAudioMenu } from './options';

const REPLAY_ID = 'bb-answer-bar-replay';

let listening = false;

/** Right-click a play control to save the clip that control would play. */
export function startAudioDownloads(): void {
  if (listening) {
    return;
  }
  document.addEventListener('contextmenu', onContextMenu, true);
  listening = true;
}

export function stopAudioDownloads(): void {
  if (!listening) {
    return;
  }
  document.removeEventListener('contextmenu', onContextMenu, true);
  listening = false;
}

function onContextMenu(event: MouseEvent): void {
  if (!readAudioMenu().download) {
    return;
  }
  const control = playControlFor(event);
  if (!control) {
    return;
  }
  const url = resolvedAudioUrl(control);
  if (!url) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  void downloadResolvedAudio(control, url);
}

/**
 * The answer-bar play button is disabled until the card is answered. A
 * right-click then lands on the bar around it, not on the button.
 */
function playControlFor(event: MouseEvent): HTMLElement | null {
  return audioControlFrom(event.target) ?? playControlAt(event.clientX, event.clientY);
}

function playControlAt(x: number, y: number): HTMLElement | null {
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }
  if (typeof document.elementsFromPoint !== 'function') {
    return null;
  }
  for (const node of document.elementsFromPoint(x, y)) {
    const control = audioControlFrom(node);
    if (control) {
      return control;
    }
  }
  return null;
}

export function audioControlFrom(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) {
    return null;
  }
  const button = target.closest('button');
  if (!(button instanceof HTMLElement)) {
    return null;
  }
  if (button.id === REPLAY_ID) {
    return button;
  }
  if (button.dataset.bbResolvedUrl || button.dataset.bbPlayUrl) {
    return button;
  }
  if (button.dataset.bbAudioTitle === 'Play audio' || button.title === 'Play audio') {
    return button;
  }
  const icon = button.querySelector('svg')?.getAttribute('data-name');
  if (icon === 'PLAY_CIRCLE_FILLED' || icon === 'PAUSE') {
    return button;
  }
  return null;
}

export function resolvedAudioUrl(control: HTMLElement): string | null {
  return control.dataset.bbPlayUrl || control.dataset.bbResolvedUrl || null;
}

export function audioDownloadName(url: string, control: HTMLElement): string {
  const fromPath = mp3Name(url);
  if (fromPath) {
    return fromPath;
  }
  const label = (control.title || 'audio').replace(/[\\/:*?"<>|]+/g, '').trim();
  return `${label || 'audio'}.mp3`;
}

async function downloadResolvedAudio(control: HTMLElement, url: string): Promise<void> {
  const blob = await clipBlob(url);
  saveBlob(blob, audioDownloadName(url, control));
}

/**
 * Bunpro's own CDN allows a page fetch. `GM_xmlhttpRequest` rejects that host
 * unless it is listed in `@connect`, so try the page first and use the grant
 * only for hosts the page cannot read (dictionary audio).
 */
async function clipBlob(url: string): Promise<Blob> {
  if (!url.startsWith('blob:')) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return response.blob();
      }
    } catch {
      // Fall through to the userscript grant.
    }
  }
  if (url.startsWith('blob:')) {
    return blobFromPage(url);
  }
  return requestBlob({ url });
}

async function blobFromPage(url: string): Promise<Blob> {
  const response = await fetch(url);
  return response.blob();
}

function saveBlob(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  link.rel = 'noopener';
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

function mp3Name(url: string): string | null {
  if (url.startsWith('blob:')) {
    return null;
  }
  try {
    const last = decodeURIComponent(new URL(url).pathname.split('/').pop() ?? '');
    if (last.toLowerCase().endsWith('.mp3') && last.length > 4 && last.length < 180) {
      return last;
    }
  } catch {
    return null;
  }
  return null;
}
