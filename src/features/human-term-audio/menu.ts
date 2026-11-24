import { element } from '../../dom';
import { listFeatures, setFeatureEnabled } from '../registry';
import { descriptionNodes } from '../../settings/description';
import { buildSwitch } from '../../settings/switch';
import {
  audioMenuActive,
  readAudioMenu,
  writeAudioFlag,
  writeSpeakerSurface,
  type SpeakerSurface,
} from '../../term-audio/options';

const SURFACES: readonly { id: SpeakerSurface; label: string }[] = [
  { id: 'reviews', label: 'Reviews' },
  { id: 'vocab', label: 'Vocab page' },
  { id: 'both', label: 'Reviews and vocab page' },
];

const AUDIO_FEATURE_ID = 'human-term-audio';

/** Nested Audio rows. Each switch is its own setting; the feature runs if any is on. */
export function buildAudioMenu(): HTMLElement {
  const menu = readAudioMenu();
  const radios = buildSurfaceRadios(menu.surface, menu.realSpeakers);

  return element('ul', { class: 'bb-audio-menu' }, [
    element('li', {}, [
      optionRow(
        'Annotate audio',
        'Show the source when you hover a play button.',
        menu.annotate,
        (enabled) => {
          writeAudioFlag('annotate', enabled);
          publish();
        },
      ),
    ]),
    element('li', {}, [
      optionRow(
        'Color real vs TTS',
        'Blue when a real recording will play. White when it is text-to-speech.',
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
        'Only when the clip is the term itself: a sentence with no audio (A5 and similar), or a translation question with no sentence. Sentence clips stay on Bunpro’s file.',
        menu.realSpeakers,
        (enabled) => {
          writeAudioFlag('realSpeakers', enabled);
          setRadiosEnabled(radios, enabled);
          publish();
        },
      ),
      radios,
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
): HTMLElement {
  const copy = element('div', { class: 'bb-audio-option-copy' }, [
    element('div', { class: 'font-bold' }, [title]),
    element(
      'p',
      { class: 'bb-feature-desc text-small text-tertiary-fg' },
      descriptionNodes(description),
    ),
  ]);
  return element('div', { class: 'bb-audio-option' }, [
    copy,
    buildSwitch(title, checked, onToggle),
  ]);
}

function buildSurfaceRadios(selected: SpeakerSurface, enabled: boolean): HTMLFieldSetElement {
  const field = element('fieldset', { class: 'bb-audio-radios' }, [
    element('legend', { class: 'bb-feature-desc text-small text-tertiary-fg' }, ['Use on']),
  ]);
  for (const option of SURFACES) {
    const input = element('input', { type: 'radio', name: 'bb-audio-surface', value: option.id });
    input.checked = option.id === selected;
    input.disabled = !enabled;
    input.addEventListener('change', () => {
      if (!input.checked) {
        return;
      }
      writeSpeakerSurface(option.id);
      publish();
    });
    field.append(element('label', { class: 'text-small text-secondary-fg' }, [input, option.label]));
  }
  return field;
}

function setRadiosEnabled(field: HTMLFieldSetElement, enabled: boolean): void {
  for (const input of field.querySelectorAll('input')) {
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
