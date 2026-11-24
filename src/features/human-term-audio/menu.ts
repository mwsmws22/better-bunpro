import { element } from '../../dom';
import { listFeatures, setFeatureEnabled } from '../registry';
import { descriptionNodes } from '../../settings/description';
import { buildSummary } from '../../settings/summary';
import { buildSwitch } from '../../settings/switch';
import {
  audioMenuActive,
  readAudioMenu,
  speakerSurface,
  surfaceChecked,
  writeAudioFlag,
  writeSpeakerSurface,
  type SpeakerSurface,
} from '../../term-audio/options';

const AUDIO_FEATURE_ID = 'human-term-audio';

/** Nested Audio rows. Each switch is its own setting; the feature runs if any is on. */
export function buildAudioMenu(): HTMLElement {
  const menu = readAudioMenu();
  const places = buildSurfaceChecks(menu.surface, menu.realSpeakers);

  return element('ul', { class: 'bb-audio-menu' }, [
    element('li', {}, [
      optionRow(
        'Annotate source',
        'Show the audio source when you hover a play button.',
        menu.annotate,
        (enabled) => {
          writeAudioFlag('annotate', enabled);
          publish();
        },
      ),
    ]),
    element('li', {}, [
      optionRow(
        'Color code human vs TTS',
        "Play button will be colored when it's a real human recording, else white when TTS.",
        menu.color,
        (enabled) => {
          writeAudioFlag('color', enabled);
          publish();
        },
      ),
    ]),
    element('li', {}, [
      optionRow(
        'Use real speakers instead of TTS',
        'A real speaker reads the term when the question has no clip of its own: a sentence with no audio (A5 and similar), or a translation question with no sentence.',
        menu.realSpeakers,
        (enabled) => {
          writeAudioFlag('realSpeakers', enabled);
          setPlacesEnabled(places, enabled);
          publish();
        },
        places,
      ),
    ]),
    element('li', {}, [
      optionRow(
        'Right-click to download',
        'Right-click a play button to save the clip that button would play.',
        menu.download,
        (enabled) => {
          writeAudioFlag('download', enabled);
          publish();
        },
      ),
    ]),
  ]);
}

function optionRow(
  title: string,
  description: string,
  checked: boolean,
  onToggle: (enabled: boolean) => void,
  extra?: HTMLElement,
): HTMLElement {
  const about = element('details', { class: 'bb-feature-about grow' }, [
    buildSummary(title),
    element(
      'p',
      { class: 'bb-feature-desc text-small text-tertiary-fg' },
      descriptionNodes(description),
    ),
  ]);
  const copy = extra
    ? element('div', { class: 'bb-audio-option-copy grow' }, [about, extra])
    : about;
  return element('div', { class: 'bb-audio-option' }, [copy, buildSwitch(title, checked, onToggle)]);
}

function buildSurfaceChecks(selected: SpeakerSurface, enabled: boolean): HTMLElement {
  const reviews = checkbox('Reviews', surfaceChecked(selected, 'reviews'));
  const vocab = checkbox('Vocab page', surfaceChecked(selected, 'vocab'));
  const row = element('div', { class: 'bb-audio-surfaces', role: 'group', 'aria-label': 'Use real speakers on' }, [
    reviews.label,
    vocab.label,
  ]);

  const publishPlaces = () => {
    writeSpeakerSurface(speakerSurface(reviews.input.checked, vocab.input.checked));
    publish();
  };
  reviews.input.addEventListener('change', publishPlaces);
  vocab.input.addEventListener('change', publishPlaces);
  setPlacesEnabled(row, enabled);
  return row;
}

function checkbox(label: string, checked: boolean): { label: HTMLLabelElement; input: HTMLInputElement } {
  const input = element('input', { type: 'checkbox' });
  input.checked = checked;
  const row = element('label', { class: 'text-small text-secondary-fg' }, [input, label]);
  return { label: row, input };
}

function setPlacesEnabled(row: HTMLElement, enabled: boolean): void {
  row.setAttribute('aria-disabled', String(!enabled));
  for (const input of row.querySelectorAll('input')) {
    input.disabled = !enabled;
  }
}

function publish(): void {
  const feature = listFeatures().find((item) => item.id === AUDIO_FEATURE_ID);
  if (!feature) {
    return;
  }
  setFeatureEnabled(feature, audioMenuActive());
}
