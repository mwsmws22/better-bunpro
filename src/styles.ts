/**
 * Everything visual is expressed with Bunpro's own utility classes so the UI
 * follows their theme; these are only the few rules we cannot borrow.
 * The 640px breakpoint is Bunpro's `sm:`.
 */
const STYLE_ID = 'bb-styles';

const CSS = `
.bb-sentence-slot {
  min-width: min(100%, 31.25rem);
  margin-top: 1.5rem;
}
@media (min-width: 640px) {
  .bb-sentence-slot {
    min-width: max(fit-content, 31.25rem);
    margin-top: 2rem;
  }
}
.bb-backdrop {
  background: rgb(0 0 0 / 0.5);
}
.bb-panel-card {
  width: min(100%, 34rem);
  max-height: min(80dvh, 40rem);
}
.bb-switch {
  position: relative;
  flex-shrink: 0;
  width: 2.75rem;
  height: 1.5rem;
  border-radius: 9999px;
  transition: background-color 150ms ease;
}
.bb-switch::after {
  content: '';
  position: absolute;
  top: 0.1875rem;
  left: 0.1875rem;
  width: 1.125rem;
  height: 1.125rem;
  border-radius: 9999px;
  background: rgb(var(--c-primary-bg) / 1);
  transition: transform 150ms ease;
}
.bb-switch[aria-checked='true']::after {
  transform: translateX(1.25rem);
}
.bb-feature-copy {
  display: grid;
  gap: 0.5rem;
  min-width: 0;
}
.bb-feature-about {
  min-width: 0;
}
.bb-feature-about-summary {
  display: flex;
  align-items: center;
  gap: 0.5em;
  cursor: pointer;
  list-style: none;
  user-select: none;
}
.bb-feature-about-summary::-webkit-details-marker {
  display: none;
}
.bb-feature-caret {
  flex-shrink: 0;
  width: 1.125em;
  height: 1.125em;
  color: rgb(var(--c-primary-accent) / 1);
  transition: transform 120ms ease;
}
.bb-feature-about[open] > .bb-feature-about-summary > .bb-feature-caret {
  transform: rotate(90deg);
}
.bb-feature-desc {
  margin-top: 0.5rem;
}
.bb-kbd {
  display: inline-block;
  margin: 0 0.1em;
  padding: 0.05em 0.4em;
  border: 1px solid rgb(var(--c-rim) / 1);
  border-radius: 0.35em;
  background: rgb(var(--c-tertiary-bg) / 1);
  color: rgb(var(--c-primary-fg) / 1);
  font: inherit;
  font-size: 0.92em;
  font-weight: 600;
  line-height: 1.35;
  white-space: nowrap;
  box-shadow: 0 1px 0 rgb(var(--c-rim) / 1);
}
.bb-add-synonym {
  width: min(100%, 36rem);
  margin: 0 auto;
  padding: 0 0.375rem 0.5rem;
}
/**
 * Outweigh Bunpro's \`text-primary-fg\` / \`text-primary-accent\` on the answer-bar
 * play and pause controls when a real recording (not TTS) will play after the
 * answer is in. Pause keeps Bunpro’s accent class while open — \`!important\`
 * beats it for white TTS and blue real-recording cues. Do not style CANCEL;
 * that close control stays Bunpro’s accent.
 */
button.bb-audio-real {
  color: rgb(var(--c-primary-accent) / 1) !important;
}
/**
 * Details pitch-accent play is Bunpro-accent by default — force primary fg when
 * only synthesised audio will play, so the tint means a real recording.
 */
button.bb-audio-tts {
  color: rgb(var(--c-primary-fg) / 1) !important;
}
/** Injected answer-bar toggle: swap play↔pause without remounting. */
#bb-answer-bar-replay .bb-replay-pause {
  display: none;
}
#bb-answer-bar-replay.bb-replay-playing .bb-replay-play {
  display: none;
}
#bb-answer-bar-replay.bb-replay-playing .bb-replay-pause {
  display: block;
}
/** Hide Bunpro’s answer-console audio chrome only while our toggle is mounted. */
.InputManual:has(#bb-answer-bar-replay) > button:has(svg[data-name="PLAY_CIRCLE_FILLED"]) {
  display: none !important;
}
.InputManual:has(#bb-answer-bar-replay) > button:has(svg[data-name="PAUSE"]) {
  display: none !important;
}
.InputManual:has(#bb-answer-bar-replay) > button:has(svg[data-name="CANCEL"]) {
  display: none !important;
}
html.bb-skipping-undo-modal .Modal,
html.bb-skipping-undo-modal #tooltip-portal,
html.bb-skipping-undo-modal .Toast {
  visibility: hidden !important;
  opacity: 0 !important;
}
/**
 * Bunpro’s Review SRS → Hide still shows this chip after submit. Force it off
 * for the whole review when Fully hide review SRS is enabled.
 */
html.bb-hide-srs li[title="Your SRS progress"] {
  display: none !important;
}
.bb-popover {
  width: max-content;
  max-width: min(20rem, calc(100vw - 1rem));
}
.bb-popover-term {
  line-height: 1.6;
}
/** A word in a sentence that can be looked up, hinted at only on hover. */
.bb-lookup-target {
  cursor: pointer;
}
/**
 * The element is named in the selector to outweigh the \`text-primary-fg\` Bunpro
 * leaves on the field: Bunpro's stylesheets are linked after this one, so an
 * equally specific rule of ours would lose.
 */
input.bb-wrong-guess {
  color: rgb(var(--c-incorrect) / 1);
}
input.bb-correct-guess {
  color: rgb(var(--c-correct) / 1);
}
.bb-shaking {
  animation: bb-shake 320ms ease;
}
@keyframes bb-shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-0.375rem); }
  40% { transform: translateX(0.375rem); }
  60% { transform: translateX(-0.25rem); }
  80% { transform: translateX(0.125rem); }
}
`;

export function injectStyles(): void {
  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    document.head.append(style);
  }
  // Always refresh so HMR / feature restart picks up new rules (hide Bunpro play, etc.).
  style.textContent = CSS;
}
