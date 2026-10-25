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
  display: block;
  cursor: pointer;
  list-style: none;
  user-select: none;
}
.bb-feature-about-summary::-webkit-details-marker {
  display: none;
}
.bb-feature-about-summary::marker {
  content: '';
}
.bb-feature-about-summary > span {
  display: inline;
}
.bb-feature-title-tail {
  white-space: nowrap;
}
.bb-feature-caret {
  display: inline-block;
  width: 1.125em;
  height: 1.125em;
  margin-inline-start: 0.15em;
  vertical-align: -0.2em;
  color: rgb(var(--c-primary-accent) / 1);
  transition: transform 120ms ease;
}
/* Phone width: the card uses the screen and scrolls inside the visible
   viewport instead of floating as a narrow desktop dialog. */
html.bb-mobile-web #bb-settings-panel {
  padding: 0.75rem 0.5rem;
}
html.bb-mobile-web .bb-panel-card {
  width: 100%;
  max-height: calc(var(--bb-vv-height, 100dvh) - 1.5rem);
}
html.bb-mobile-web .bb-panel-card > header,
html.bb-mobile-web .bb-panel-card > div {
  padding: 0.85rem 0.9rem;
}
html.bb-mobile-web .bb-panel-card ul {
  gap: 0.85rem;
}
html.bb-mobile-web .bb-panel-card li {
  gap: 0.75rem;
}
html.bb-mobile-web .bb-feature-about-summary {
  font-size: 0.95rem;
  line-height: 1.35;
}
.bb-feature-about[open] .bb-feature-caret {
  transform: rotate(90deg);
}
.bb-panel-card li:has(.bb-feature-about[open]) {
  align-items: flex-start;
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
/* The document does not scroll. It stays pinned to the top of the visible
   viewport: no extra height, no margin, and no offset. A pull down from the
   top of the prompt reloads the page. */
html.bb-mobile-web,
html.bb-mobile-web body {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: var(--bb-vv-height, 100dvh);
  max-height: var(--bb-vv-height, 100dvh);
  margin: 0;
  overflow: hidden;
  overscroll-behavior: none;
}
html.bb-mobile-web #js-page-top {
  display: flex;
  flex-direction: column;
  min-height: 0 !important;
  height: var(--bb-vv-height, 100dvh) !important;
  max-height: var(--bb-vv-height, 100dvh) !important;
  overflow: hidden;
}
html.bb-mobile-web #js-quiz {
  flex: 1 1 0;
  min-height: 0 !important;
  height: auto !important;
  max-height: none !important;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
html.bb-mobile-web #js-quiz > div:not(#quiz-metadata-element) {
  flex: 1 1 0;
  min-height: 0;
  height: auto;
  max-height: none;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: stretch;
}
html.bb-mobile-web #js-quiz article:not(.bp-reviewable-root):not(.bp-modal-container) {
  flex: 1 1 0 !important;
  align-self: stretch !important;
  box-sizing: border-box !important;
  min-height: 0 !important;
  height: 100% !important;
  max-height: 100% !important;
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
  overflow-x: hidden;
  overflow-y: auto;
  overflow-anchor: none;
  /* A finger pans this scroller. The simulator's drag is a mouse gesture; prompt-scroll handles that.
     A pull down from the top reloads the page. Overscroll stays in this scroller. */
  touch-action: pan-y;
  overscroll-behavior: none;
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
  display: flex !important;
  flex-direction: column !important;
  align-items: center;
  /* Center the prompt when it fits. When the notes overflow the space above
     the keyboard, pin to the top so the sentence stays put and the rest scrolls. */
  justify-content: safe center;
  /* Bunpro quiz section uses grid gap-6 (6px); flex replaces grid so restore it. */
  gap: 0.375rem !important;
}
html.bb-mobile-web.bb-prompt-scrolling #js-quiz article:not(.bp-reviewable-root):not(.bp-modal-container) > section {
  scrollbar-color: rgb(255 255 255 / 0.45) transparent;
}
html.bb-mobile-web #js-quiz article:not(.bp-reviewable-root):not(.bp-modal-container) > section::-webkit-scrollbar {
  width: 0.25rem;
}
html.bb-mobile-web #js-quiz article:not(.bp-reviewable-root):not(.bp-modal-container) > section::-webkit-scrollbar-thumb {
  background: transparent;
  border-radius: 0.25rem;
}
html.bb-mobile-web.bb-prompt-scrolling #js-quiz article:not(.bp-reviewable-root):not(.bp-modal-container) > section::-webkit-scrollbar-thumb {
  background: rgb(255 255 255 / 0.45);
}
/**
 * Optically center the prompt in the section. Auto margins eat free space
 * above/below the prompt group; keep kanji + revealed answer meanings flush
 * (do not put margin-bottom:auto on the term when the answer <p> is visible).
 */
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
  line-height: 2.125rem !important;
}
/* Underline is before:bottom-4 on the blank. This line box keeps it under the kana.
   Empty, the line sits up on the sentence. Once a kana is typed, it drops so
   the glyph clears the line. A graded blank swaps the typed color for
   text-correct or text-incorrect; keep that same low line. The line box itself stays put. */
html.bb-mobile-web #js-quiz .bp-quiz-question button,
html.bb-mobile-web #js-quiz .bp-quiz-question button * {
  line-height: 2.125rem !important;
}
html.bb-mobile-web #js-quiz .bp-quiz-question button::before {
  bottom: 0.4em !important;
}
html.bb-mobile-web #js-quiz .bp-quiz-question button:has(> .text-primary-accent)::before,
html.bb-mobile-web #js-quiz .bp-quiz-question button:has(> .text-correct)::before,
html.bb-mobile-web #js-quiz .bp-quiz-question button:has(> .text-incorrect)::before {
  bottom: 0 !important;
}
/* Empty cloze give-up fills the blank from the alternate answer, and Bunpro
   marks that text text-correct even though the attempt is wrong. Paint that
   blank with the incorrect color. A correct attempt keeps text-correct. */
html.bb-mobile-web #js-quiz:has(#quiz-metadata-element[data-meta-is-revealing="true"][data-meta-is-correct="false"][data-meta-input=""]) .bp-quiz-question button > .text-correct {
  color: rgb(var(--c-incorrect) / 1);
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
html.bb-mobile-web #js-quiz .bp-quiz-trans-wrap .bp-quiz-trans,
html.bb-mobile-web #js-quiz .bp-quiz-trans-wrap .bp-quiz-trans * {
  font-size: 0.9rem !important;
  line-height: 1.58rem !important;
}
/* Keep the sentence, English, and notes at their line spacing when the fourth
   hint overflows the screen. A shrinkable English block lets the notes slide
   up into it. The section scrolls instead. */
html.bb-mobile-web #js-quiz article:not(.bp-reviewable-root):not(.bp-modal-container) > section > .bp-quiz-question,
html.bb-mobile-web #js-quiz article:not(.bp-reviewable-root):not(.bp-modal-container) > section > .bp-quiz-trans-wrap,
html.bb-mobile-web #js-quiz article:not(.bp-reviewable-root):not(.bp-modal-container) > section > div.grid {
  flex-shrink: 0;
}
html.bb-mobile-web #js-quiz article:not(.bp-reviewable-root):not(.bp-modal-container) > section > .bp-quiz-trans-wrap {
  margin-top: 0;
  margin-bottom: 0;
}
/* A hidden hint step must not leave a gap. The word hint leaves Bunpro's
   absolute overlay so it joins the centered stack. */
html.bb-mobile-web #js-quiz .bp-quiz-trans.opacity-0,
html.bb-mobile-web #js-quiz .bp-quiz-trans.invisible {
  display: none !important;
}
html.bb-mobile-web #js-quiz .bp-quiz-trans--hint {
  position: static !important;
}
html.bb-mobile-web #js-quiz article:not(.bp-reviewable-root):not(.bp-modal-container) > section > .bp-quiz-trans-wrap:not(:has(.bp-quiz-trans:not(.opacity-0))) {
  display: none !important;
}
html.bb-mobile-web #js-quiz article:not(.bp-reviewable-root):not(.bp-modal-container) > section > .bp-quiz-trans-wrap:has(.bp-quiz-trans:not(.opacity-0)) {
  margin-top: 0.2rem;
  text-align: center;
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
/* Invisible Bunpro spacers bias the prompt upward — drop them.
   A hint row stays up while one note is still hidden, so Bunpro can show
   the Japanese note and the English note on separate taps. */
html.bb-mobile-web #js-quiz article:not(.bp-reviewable-root):not(.bp-modal-container) > section > p.opacity-0 {
  display: none !important;
}
html.bb-mobile-web #js-quiz article:not(.bp-reviewable-root):not(.bp-modal-container) > section > .bp-quiz-leading-hint:not(:has(> :not(.opacity-0))),
html.bb-mobile-web #js-quiz article:not(.bp-reviewable-root):not(.bp-modal-container) > section > div.grid:not(:has(> :not(p.opacity-0))) {
  display: none !important;
}
/* A note that Bunpro has not revealed yet must not leave a blank line. */
html.bb-mobile-web #js-quiz article:not(.bp-reviewable-root):not(.bp-modal-container) > section > div.grid > p.opacity-0 {
  display: none !important;
}
html.bb-mobile-web #js-quiz article:not(.bp-reviewable-root):not(.bp-modal-container) > section > div.grid:has(> :not(p.opacity-0)) {
  /* Match the gap under the English to the gap between the two notes.
     Furigana sits in the note, so this gap is measured above the reading. */
  margin-top: -0.125rem;
  text-align: center;
}
html.bb-mobile-web #js-quiz article:not(.bp-reviewable-root):not(.bp-modal-container) > section > div.grid:has(> :not(p.opacity-0)) > p:first-child > svg {
  width: 0.95rem !important;
  height: 0.95rem !important;
  padding: 0 !important;
  vertical-align: baseline !important;
}
html.bb-mobile-web #js-quiz article:not(.bp-reviewable-root):not(.bp-modal-container) > section > div.grid:has(> :not(p.opacity-0)) > p:first-child .bp-ddw,
html.bb-mobile-web #js-quiz article:not(.bp-reviewable-root):not(.bp-modal-container) > section > div.grid:has(> :not(p.opacity-0)) > p:first-child .bp-ddw * {
  font-size: 0.95rem !important;
  line-height: 1.6rem !important;
}
html.bb-mobile-web #js-quiz article:not(.bp-reviewable-root):not(.bp-modal-container) > section > div.grid:has(> :not(p.opacity-0)) > p:last-child,
html.bb-mobile-web #js-quiz article:not(.bp-reviewable-root):not(.bp-modal-container) > section > div.grid:has(> :not(p.opacity-0)) > p:last-child * {
  font-size: 0.84rem !important;
  line-height: 1.45rem !important;
}
/* The note size rules match every descendant, which blows readings up to the
   kanji size and stretches each character to the reading's width. Keep
   furigana at the same proportion as the sentence. */
html.bb-mobile-web #js-quiz article:not(.bp-reviewable-root):not(.bp-modal-container) > section > div.grid:has(> :not(p.opacity-0)) > p:first-child .bp-ddw rt,
html.bb-mobile-web #js-quiz article:not(.bp-reviewable-root):not(.bp-modal-container) > section > div.grid:has(> :not(p.opacity-0)) > p:first-child .bp-ddw .hide-furigana,
html.bb-mobile-web #js-quiz article:not(.bp-reviewable-root):not(.bp-modal-container) > section > div.grid:has(> :not(p.opacity-0)) > p:last-child rt,
html.bb-mobile-web #js-quiz article:not(.bp-reviewable-root):not(.bp-modal-container) > section > div.grid:has(> :not(p.opacity-0)) > p:last-child .hide-furigana {
  font-size: 46% !important;
  line-height: 1 !important;
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
