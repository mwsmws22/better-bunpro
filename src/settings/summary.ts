import { element, svgIcon } from '../dom';

const CARET_SHAPES =
  '<path d="M9.29 6.71a1 1 0 0 0 0 1.41L13.17 12l-3.88 3.88a1 1 0 1 0 1.41 1.41l4.59-4.59a1 1 0 0 0 0-1.41L10.7 6.7a1 1 0 0 0-1.41.01" fill="currentColor"/>';

/** Last word and chevron stay on one line, so the chevron never wraps alone. */
export function buildSummary(title: string): HTMLElement {
  const caret = svgIcon('bb-feature-caret', CARET_SHAPES);
  const words = title.split(' ');
  const lastWord = words.pop() ?? '';
  const lead = words.length > 0 ? `${words.join(' ')} ` : '';
  const tail = element('span', { class: 'bb-feature-title-tail' }, [lastWord, caret]);
  return element('summary', { class: 'bb-feature-about-summary font-bold' }, lead ? [lead, tail] : [tail]);
}
