import { readStored, writeStored } from '../settings/store';
import { type SpeakerSurface } from './speaker-surface';

export { speakerSurface, surfaceChecked, type SpeakerSurface } from './speaker-surface';

export interface AudioMenu {
  annotate: boolean;
  color: boolean;
  realSpeakers: boolean;
  surface: SpeakerSurface;
  download: boolean;
}

const MIGRATED = 'audio.migrated';
const LEGACY_ENABLED = 'feature.human-term-audio.enabled';

const KEYS = {
  annotate: 'audio.annotate',
  color: 'audio.color',
  realSpeakers: 'audio.real-speakers',
  surface: 'audio.speaker-surface',
  download: 'audio.download',
} as const;

/** First read in this page snapshots the old on/off switch into the submenu. */
let migratedThisPage = false;

export function readAudioMenu(): AudioMenu {
  ensureMigrated();
  return {
    annotate: readStored(KEYS.annotate, true),
    color: readStored(KEYS.color, true),
    realSpeakers: readStored(KEYS.realSpeakers, true),
    surface: readSurface(),
    download: readStored(KEYS.download, true),
  };
}

export function realSpeakersOn(where: 'reviews' | 'vocab'): boolean {
  const menu = readAudioMenu();
  if (!menu.realSpeakers) {
    return false;
  }
  return menu.surface === 'both' || menu.surface === where;
}

export function audioMenuActive(menu: AudioMenu = readAudioMenu()): boolean {
  return menu.annotate || menu.color || menu.realSpeakers || menu.download;
}

export function writeAudioFlag(flag: 'annotate' | 'color' | 'realSpeakers' | 'download', enabled: boolean): void {
  ensureMigrated();
  writeStored(KEYS[flag], enabled);
}

export function writeSpeakerSurface(surface: SpeakerSurface): void {
  ensureMigrated();
  writeStored(KEYS.surface, surface);
}

/**
 * The old feature was one switch. Snapshot it once so turning a single submenu
 * item on does not flip the others back to that switch.
 */
function ensureMigrated(): void {
  if (migratedThisPage) {
    return;
  }
  migratedThisPage = true;
  if (readStored(MIGRATED, false)) {
    return;
  }
  const on = readStored<boolean | null>(LEGACY_ENABLED, null) !== false;
  writeStored(KEYS.annotate, readStored(KEYS.annotate, on));
  writeStored(KEYS.color, readStored(KEYS.color, on));
  writeStored(KEYS.realSpeakers, readStored(KEYS.realSpeakers, on));
  writeStored(KEYS.surface, readSurface());
  writeStored(KEYS.download, readStored(KEYS.download, on));
  writeStored(MIGRATED, true);
}

function readSurface(fallback: SpeakerSurface = 'both'): SpeakerSurface {
  const value = readStored(KEYS.surface, fallback);
  if (value === 'reviews' || value === 'vocab' || value === 'both' || value === 'none') {
    return value;
  }
  return 'both';
}
