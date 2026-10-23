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
/**
 * Examples list speakers are Bunpro-accent (blue) in the DOM. Treat unpainted
 * Play controls as TTS white immediately so they do not flash blue while we
 * resolve classic / Gemini / ElevenLabs. \`bb-audio-real\` still wins for recordings.
 */
.bp-reviewable-root [id^="study-question-"] button[title="Play audio"] {
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
/**
 * Improved web mobile experience: pin the review shell to the visible
 * viewport (visualViewport height) so the soft keyboard does not leave a gap.
 * Bunpro nests the quiz <article> under a centering wrapper inside #js-quiz.
 */
html.bb-mobile-web,
html.bb-mobile-web body {
  height: var(--bb-vv-height, 100dvh);
  max-height: var(--bb-vv-height, 100dvh);
  overflow: hidden;
}
html.bb-mobile-web body {
  position: relative;
  top: var(--bb-vv-offset-top, 0px);
}
html.bb-mobile-web #js-page-top {
  min-height: 0 !important;
  height: var(--bb-vv-height, 100dvh) !important;
  max-height: var(--bb-vv-height, 100dvh) !important;
  overflow: hidden;
}
html.bb-mobile-web #js-quiz {
  min-height: 0 !important;
  height: var(--bb-vv-height, 100dvh) !important;
  max-height: var(--bb-vv-height, 100dvh) !important;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
html.bb-mobile-web #js-quiz > div:not(#quiz-metadata-element) {
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
  max-height: none;
  width: 100%;
  align-items: stretch;
}
html.bb-mobile-web #js-quiz article:not(.bp-reviewable-root):not(.bp-modal-container) {
  flex: 1 1 auto !important;
  align-self: stretch !important;
  box-sizing: border-box !important;
  min-height: var(--bb-vv-height, 100dvh) !important;
  height: var(--bb-vv-height, 100dvh) !important;
  max-height: var(--bb-vv-height, 100dvh) !important;
  width: 100%;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
html.bb-mobile-web #js-quiz article:not(.bp-reviewable-root):not(.bp-modal-container) > header {
  flex: 0 0 auto;
}
html.bb-mobile-web #js-quiz article:not(.bp-reviewable-root):not(.bp-modal-container) > section {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  display: flex !important;
  flex-direction: column !important;
  align-items: center;
  justify-content: flex-start;
  /* Bunpro quiz section uses grid gap-6 (6px); flex replaces grid so restore it. */
  gap: 0.375rem !important;
}
/**
 * Optically center the prompt in the section. Auto margins eat free space
 * above/below the prompt group; keep kanji + revealed answer meanings flush
 * (do not put margin-bottom:auto on the term when the answer <p> is visible).
 */
html.bb-mobile-web #js-quiz article:not(.bp-reviewable-root):not(.bp-modal-container) > section > .bp-quiz-question,
html.bb-mobile-web #js-quiz article:not(.bp-reviewable-root):not(.bp-modal-container) > section > [class*='QuestionFlash'] {
  margin-top: auto;
}
/**
 * Cloze type matched to the native app. Flash terms stay on Bunpro's
 * 1.1875rem cap. Furigana stays at 46% so the sentence size does not enlarge it.
 */
html.bb-mobile-web #js-quiz article:not(.bp-reviewable-root):not(.bp-modal-container) > section > [class*='QuestionFlash'] {
  font-size: 1.1875rem !important;
  line-height: 2.125rem !important;
}
html.bb-mobile-web #js-quiz .bp-quiz-question,
html.bb-mobile-web #js-quiz .bp-quiz-question * {
  font-size: 1.23rem !important;
  line-height: 1.55rem !important;
}
/* The blank's underline sits on the line box. The sentence line-height puts it through the kana. */
html.bb-mobile-web #js-quiz .bp-quiz-question button,
html.bb-mobile-web #js-quiz .bp-quiz-question button * {
  line-height: 2.125rem !important;
}
html.bb-mobile-web #js-quiz .bp-quiz-question rt,
html.bb-mobile-web #js-quiz .bp-quiz-question .hide-furigana {
  font-size: 46% !important;
  line-height: 1 !important;
}
html.bb-mobile-web #js-quiz .bp-quiz-tense {
  font-size: 0.75rem !important;
  line-height: 0.875rem !important;
}
html.bb-mobile-web #js-quiz .bp-quiz-trans-wrap,
html.bb-mobile-web #js-quiz .bp-quiz-trans-wrap .bp-quiz-trans:not(.bp-quiz-trans--hint),
html.bb-mobile-web #js-quiz .bp-quiz-trans-wrap .bp-quiz-trans:not(.bp-quiz-trans--hint) * {
  font-size: 1.06rem !important;
  line-height: 1.86rem !important;
}
html.bb-mobile-web #js-quiz article:not(.bp-reviewable-root):not(.bp-modal-container) > section > .bp-quiz-trans-wrap {
  margin-top: 0;
  margin-bottom: auto;
  min-height: 0.875rem; /* --text-extra-small--line-height */
}
html.bb-mobile-web #js-quiz article:not(.bp-reviewable-root):not(.bp-modal-container) > section > .bp-quiz-trans-wrap:has(+ .bb-sentence-slot),
html.bb-mobile-web #js-quiz article:not(.bp-reviewable-root):not(.bp-modal-container) > section > .bp-quiz-trans-wrap:has(+ aside[data-bb-study-question]),
html.bb-mobile-web #js-quiz article:not(.bp-reviewable-root):not(.bp-modal-container) > section > .bp-quiz-trans-wrap:has(+ aside[id^='study-question-']) {
  margin-bottom: 0;
}
/* Pre-answer: only a hidden spacer follows — center the term alone. */
html.bb-mobile-web #js-quiz article:not(.bp-reviewable-root):not(.bp-modal-container) > section > .bp-quiz-question:not(:has(+ .bp-quiz-trans-wrap)):has(+ p.opacity-0),
html.bb-mobile-web #js-quiz article:not(.bp-reviewable-root):not(.bp-modal-container) > section > [class*='QuestionFlash']:not(:has(+ .bp-quiz-trans-wrap)):has(+ p.opacity-0),
html.bb-mobile-web #js-quiz article:not(.bp-reviewable-root):not(.bp-modal-container) > section > .bp-quiz-question:not(:has(+ *)),
html.bb-mobile-web #js-quiz article:not(.bp-reviewable-root):not(.bp-modal-container) > section > [class*='QuestionFlash']:not(:has(+ *)) {
  margin-bottom: auto;
}
/* Post-answer: meanings flush under the term; center that pair when no example. */
html.bb-mobile-web #js-quiz article:not(.bp-reviewable-root):not(.bp-modal-container) > section > .bp-quiz-question + p:not(.opacity-0),
html.bb-mobile-web #js-quiz article:not(.bp-reviewable-root):not(.bp-modal-container) > section > [class*='QuestionFlash'] + p:not(.opacity-0) {
  margin-bottom: auto;
  text-align: center;
  width: 100%;
}
html.bb-mobile-web #js-quiz article:not(.bp-reviewable-root):not(.bp-modal-container) > section > .bp-quiz-question + p:not(.opacity-0):has(+ .bb-sentence-slot),
html.bb-mobile-web #js-quiz article:not(.bp-reviewable-root):not(.bp-modal-container) > section > [class*='QuestionFlash'] + p:not(.opacity-0):has(+ .bb-sentence-slot),
html.bb-mobile-web #js-quiz article:not(.bp-reviewable-root):not(.bp-modal-container) > section > .bp-quiz-question + p:not(.opacity-0):has(+ aside[data-bb-study-question]),
html.bb-mobile-web #js-quiz article:not(.bp-reviewable-root):not(.bp-modal-container) > section > [class*='QuestionFlash'] + p:not(.opacity-0):has(+ aside[data-bb-study-question]),
html.bb-mobile-web #js-quiz article:not(.bp-reviewable-root):not(.bp-modal-container) > section > .bp-quiz-question + p:not(.opacity-0):has(+ aside[id^='study-question-']),
html.bb-mobile-web #js-quiz article:not(.bp-reviewable-root):not(.bp-modal-container) > section > [class*='QuestionFlash'] + p:not(.opacity-0):has(+ aside[id^='study-question-']) {
  margin-bottom: 0;
}
/**
 * Example sentence (unverified / cycle) belongs in the centered prompt group,
 * not parked under margin-bottom:auto against the answer bar.
 */
html.bb-mobile-web #js-quiz article:not(.bp-reviewable-root):not(.bp-modal-container) > section > .bb-sentence-slot,
html.bb-mobile-web #js-quiz article:not(.bp-reviewable-root):not(.bp-modal-container) > section > aside[data-bb-study-question],
html.bb-mobile-web #js-quiz article:not(.bp-reviewable-root):not(.bp-modal-container) > section > aside[id^='study-question-'] {
  margin-top: 0.75rem;
  margin-bottom: auto;
  max-width: 100%;
}
/**
 * Example cards: Bunpro text-body / text-extra-small tokens.
 */
html.bb-mobile-web #js-quiz .bb-sentence-slot .bp-ddw,
html.bb-mobile-web #js-quiz aside[data-bb-study-question] .bp-ddw {
  font-size: 1rem !important;
  line-height: 1.25rem !important;
}
html.bb-mobile-web #js-quiz .bb-sentence-slot .bp-sdw,
html.bb-mobile-web #js-quiz aside[data-bb-study-question] .bp-sdw {
  font-size: 0.75rem !important;
  line-height: 0.875rem !important;
}
/* Invisible Bunpro spacers / empty hint rows bias the prompt upward — drop them. */
html.bb-mobile-web #js-quiz article:not(.bp-reviewable-root):not(.bp-modal-container) > section > p.opacity-0 {
  display: none !important;
}
html.bb-mobile-web #js-quiz article:not(.bp-reviewable-root):not(.bp-modal-container) > section > .bp-quiz-leading-hint:has(.opacity-0),
html.bb-mobile-web #js-quiz article:not(.bp-reviewable-root):not(.bp-modal-container) > section > div.grid:has(> p.opacity-0):not(:has(> :not(p))) {
  display: none !important;
}
html.bb-mobile-web #js-quiz article:not(.bp-reviewable-root):not(.bp-modal-container) > footer {
  flex: 0 0 auto;
}
html.bb-mobile-web #js-quiz .bp-quiz-console,
html.bb-mobile-web #js-quiz .InputManual {
  flex: 0 0 auto;
}
html.bb-mobile-web #js-quiz .InputManual > div.p-6 {
  display: none;
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
