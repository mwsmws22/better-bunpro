import { element } from '../dom';

/** The same pill switch the settings rows use. */
export function buildSwitch(
  label: string,
  checked: boolean,
  onToggle: (enabled: boolean) => void,
): HTMLButtonElement {
  const button = element('button', { role: 'switch', 'aria-label': label });

  const paint = (enabled: boolean) => {
    button.setAttribute('aria-checked', String(enabled));
    button.className = `bb-switch ${enabled ? 'bg-primary-accent' : 'bg-tertiary-bg'}`;
  };

  button.addEventListener('click', () => {
    const next = button.getAttribute('aria-checked') !== 'true';
    onToggle(next);
    paint(next);
  });
  paint(checked);

  return button;
}
