# Plan: cloze type parity — phone app, Firefox RDM, Mobile First simulator

Branch: `feature/cloze-mobile-parity`. Read this whole file before touching code.

## Goal

The cloze review text (Japanese sentence, grammar label, English sentence,
Japanese note, English note) must render the way the Bunpro Android app renders
it on a Pixel 6, in all three places:

1. The real phone (already correct — must not change).
2. Firefox Responsive Design Mode (RDM) at 412×915, DPR 2.625.
3. The "Mobile simulator" extension (Mobile First) used by the MCP Firefox
   session. Today it renders the page in a 360 CSS px iframe.

Reference images (do not commit, they live outside the repo):

- App (truth): `~/.cursor/projects/home-mws-git-better-bunpro/assets/Screenshot_20261024-230258-240c872c-0be0-4f6a-9bbf-424bf53eae5c.png`
- RDM: `~/.cursor/projects/home-mws-git-better-bunpro/assets/image-da962045-b7ac-4311-995b-bc740e726dfc.png`
- Mobile First after the failed attempt: `~/.cursor/projects/home-mws-git-better-bunpro/assets/image-c8680654-fe0f-4fdd-a43a-1f9a70768d90.png`

## Hard rules

- **No manual tweaking.** Never write a font-size, line-height, or scale number
  chosen to make a screenshot look right. Every size must come from Bunpro's own
  stylesheet plus a measured device parameter (CSS viewport width, DPR, Android
  font scale). If you catch yourself typing `1.375rem` into `src/`, stop.
- A real phone must render exactly as it does now.
- Do not commit `.tmp/`. Do not bump `package.json` (stays `0.10.6`). Do not push.
  Commit only if the user asks.
- Never submit a review answer. Never change Bunpro quiz settings.
- Firefox: only the MCP profile `/home/mws/.config/mozilla/firefox/0FdAaoTJ.Profile 1`.
  Never touch `6awon870.default-release`. Bring-up follows
  `.cursor/rules/mcp-session-stub-update.mdc` exactly.
- Do not touch the hint cycle, keyboard hold, or prompt scroll code. This plan is
  about type size only.
- Write scratch files under `.tmp/`, never `/tmp`.

## What is already known (do not re-derive)

Bunpro's quiz font rules (live CSS `_next/static/css/096c8c1662e78238.css`, a copy
is in `.tmp/live-css/a.css`). Tailwind spacing in this build is 1 unit = 1px.

| Element | base (<640) | ≥640 | ≥768 with `article.min-h-dvh` | ≥1024 |
|---|---|---|---|---|
| `.bp-quiz-question` | 1.1875rem / 2.125rem | 1.5rem / 2.75rem | — | 2.5rem / 4.25rem |
| `.bp-quiz-trans` | 0.75rem / 0.875rem | 1rem / 1.5rem | 1.375rem / 1.7875rem | 1.375rem / 1.7875rem |
| `.bp-quiz-tense` | 0.75rem / 0.875rem | 1rem / 1.25rem | 1.375rem / 1.7875rem | — |
| notes `div.grid` (`text-extra-small sm:text-large`) | 0.75rem / 0.875rem | 1.1875rem / 1.4375rem | — | — |

- The article gets `bp-quiz-fixed-height` when `innerWidth < 768`, otherwise
  `min-h-dvh`. So the 768 article rule never applies below 768.
- At 360 or 412 CSS px every one of these is the base column: English sentence
  and both notes are the same 12px. That is what RDM shows (image 3). The app
  does not look like that, so the app is applying something on top of the CSS.
  Finding that "something" is Phase 1.
- CSS media queries use CSS px. DPR does not change computed rem sizes. A 412 px
  frame at DPR 2.625 and a 412 px frame at DPR 4 lay out identically.
- Rough app measurements from the reference screenshot (460 px wide image of a
  1080 px screen; assumes 412 CSS px). Use these only as a sanity check, never as
  values to write into CSS. Line pitch: Japanese ≈ 37 CSS px, English sentence
  ≈ 29.5, Japanese note ≈ 30.5, English note ≈ 26. Japanese glyph ≈ 20 px.
  The base rules predict 34 / 14 / 14 / 14. The English sentence and notes are
  boosted much more than the Japanese sentence. That uneven boost is the clue.
  Small text grows much more than large text. Verify the cause in Phase 1; do
  not assume it.
- The reference screenshot is the **Bunpro Android app**. It is a Flutter app
  that shows bunpro.jp inside **Android System WebView (Chromium)**. So the
  extra enlarging step comes from Chromium WebView, configured by the app's
  WebView settings. The APK's Dart strings include the webview_flutter calls
  `setUseWideViewPort`, `setLoadWithOverviewMode`, and the `textZoom` settings
  API, but the values the app passes are not known. "APK logic" means
  Bunpro's CSS **plus** those WebView settings. We have the CSS. We are
  missing the settings, and Phase 1 must find them. Leading suspects:
  Chromium text autosizing, a WebView `textZoom` that follows Android
  `font_scale`, or a wide/overview viewport.
- The user browses on the phone with Firefox for Android plus Better Bunpro.
  That is a different engine from the app (Gecko), so it is not the reference.
- Mobile First facts: the top tab stays on `https://bunpro.jp/...`. The extension
  replaces the page body with `.iframe-wrapper > iframe.iframe.portrait`, and the
  quiz runs inside that iframe (same origin, `iframe.contentDocument` works).
  The iframe is 360 CSS px wide, and DPR reports 4. Injecting this on the
  **top** document made the iframe report `innerWidth 412`:
  `.iframe-wrapper, iframe.iframe.portrait { width: 412px !important; height: 915px !important; }`.
  The extension's custom-size option is paid. Its unpacked copy is in `.tmp/mobile-sim/`.
- The userscript `@match` is `https://bunpro.jp/*`, so Better Bunpro runs in both
  the top frame and the simulator iframe.

## Phase 0 — remove the failed attempt (uncommitted)

The last attempt replayed the ≥768 rules inside the 360 px iframe and zoomed the
quiz. That is a hand-picked breakpoint, and it produced image 1. Remove it:

1. Delete `src/features/improved-mobile-web/apk-quiz-fonts.ts`,
   `apk-quiz-fonts.test.ts`, `apk-sim-scale.ts`, `apk-sim-scale.test.ts`.
2. In `src/features/improved-mobile-web/feature.ts`, remove the
   `startApkSimScale` / `stopApkSimScale` import and calls.
3. In `src/styles.ts`, delete the `html.bb-mobile-web.bb-apk-sim #js-quiz { zoom: ... }`
   rule and its comment. **Keep** the other uncommitted `styles.ts` change, which
   deleted the old hand-tuned cloze font overrides (`1.23rem`, forced
   `1.375rem` / `1.1875rem`, lightbulb `1.25rem`). Those were manual tweaks and
   must stay gone.
4. `npx vitest run` and `npx tsc --noEmit` pass. Run them from the repo root.
5. `git diff --stat` should now show only `src/styles.ts` (font overrides removed)
   plus this plan file.

## Phase 1 — get ground truth from the phone (no code changes)

Goal: one JSON per environment with the computed type of every cloze element,
so environments are compared by numbers, not by eye.

### 1a. The measurement snippet

Save as `.tmp/measure-cloze.js`. Run it in the quiz document (inside the
simulator iframe, use `iframe.iframe.portrait`'s `contentDocument`/`contentWindow`).
Show hint level 4 first (all of Japanese, English, Japanese note, English note).
Hint clicks need the React handler, because `element.click()` is ignored:
call `button[title="Toggle the hint level"]`'s `__reactProps*.onClick()` once per
level, with a `setTimeout` of about 300ms between calls.

```js
(doc = document, win = window) => {
  const pick = (sel) => {
    const el = doc.querySelector(sel);
    if (!el) return null;
    const cs = win.getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return { fontSize: cs.fontSize, lineHeight: cs.lineHeight, fontFamily: cs.fontFamily, w: r.width, h: r.height };
  };
  const html = win.getComputedStyle(doc.documentElement);
  return {
    ua: navigator.userAgent,
    innerWidth: win.innerWidth, innerHeight: win.innerHeight, dpr: win.devicePixelRatio,
    visualViewport: win.visualViewport && [win.visualViewport.width, win.visualViewport.height, win.visualViewport.scale],
    mq: { sm: win.matchMedia('(min-width:640px)').matches, md: win.matchMedia('(min-width:768px)').matches, lg: win.matchMedia('(min-width:1024px)').matches },
    htmlFontSize: html.fontSize, dataFontSize: doc.documentElement.dataset.fontSize,
    textSizeAdjust: html.getPropertyValue('-webkit-text-size-adjust') || html.getPropertyValue('text-size-adjust'),
    htmlClass: doc.documentElement.className,
    articleClass: doc.querySelector('#js-quiz article')?.className,
    notoJP: doc.fonts ? doc.fonts.check('16px "Noto Sans JP"') : null,
    question: pick('.bp-quiz-question'),
    tense: pick('.bp-quiz-tense'),
    english: pick('.bp-quiz-trans:not(.opacity-0)'),
    noteJa: pick('#js-quiz div.grid > p:first-child'),
    noteEn: pick('#js-quiz div.grid > p:last-child'),
  };
}
```

### 1b. Phone device parameters (needs the phone on USB with debugging on)

`adb devices` currently lists nothing. Ask the user to plug in the Pixel 6 with
USB debugging enabled, then wait. Then record the output of these in
`.tmp/ground-truth/phone-device.txt`:

```bash
adb shell wm size
adb shell wm density
adb shell settings get system font_scale
adb shell getprop ro.sf.lcd_density
```

### 1c. Phone computed styles

The source of truth is the **Bunpro app's WebView**. Try these in order and stop
at the first that works. Open a grammar review in the app and show hint level 4
first.

1. **Inspect the app WebView with DevTools.** Run
   `adb shell cat /proc/net/unix | grep devtools_remote`. If the app exposes
   `webview_devtools_remote_<pid>`, run
   `adb forward tcp:9333 localabstract:webview_devtools_remote_<pid>`. Then list
   targets with `curl -s localhost:9333/json` and run the snippet through the
   DevTools websocket with `Runtime.evaluate`. In the same session, also
   evaluate `navigator.userAgent`, `innerWidth`, and `devicePixelRatio`.
2. **Make the WebView debuggable.** Open the WebView developer UI with
   `adb shell am start -a "com.android.webview.SHOW_DEV_UI"`. Check whether its
   Flags page offers remote debugging for all WebViews. If it does, enable it,
   restart the app, and retry step 1. If it doesn't, try the same in an Android
   emulator: a Pixel 6 non-Play ("Google APIs") image, with the extracted APK
   installed via `adb install-multiple .tmp/bunpro-apk/*.apk`. Ask the user
   before installing anything on the real phone.
3. **Read the app's WebView settings from the binary.** Use a Flutter AOT
   decompiler (for example `blutter`) on
   `.tmp/bunpro-apk/arm64-extract/lib/arm64-v8a/libapp.so`. Find the calls to
   `setTextZoom`, `setUseWideViewPort`, `setLoadWithOverviewMode`, and
   `setLayoutAlgorithm`, and record the arguments.
4. **Accessibility tree, as a last resort.** Run
   `adb shell uiautomator dump /sdcard/ui.xml && adb pull /sdcard/ui.xml .tmp/ground-truth/`.
   This gives WebView text-node bounds in device px. Divide by DPR for CSS px.
   These are measured numbers, not eyeballed ones, but they give box sizes
   only, not computed font sizes.

Save `.tmp/ground-truth/phone-app.json` (and `app-webview-settings.txt` if step 3
ran). Also record `adb shell settings get system font_scale`; the WebView may
follow it.

### 1d. Firefox RDM computed styles

In the MCP Firefox, open RDM at 412×915, DPR 2.625, with the Android UA. The user
may need to do the RDM toggle by hand. Run the snippet at hint level 4. Save as
`.tmp/ground-truth/rdm.json`.

### 1e. Mobile First computed styles

Run the snippet in the simulator iframe at hint level 4. Save as
`.tmp/ground-truth/mobile-first.json`.

### 1f. Write the diagnosis

Fill in the table below in `.tmp/ground-truth/diagnosis.md`, then show it to the
user before Phase 2. Each row is a candidate cause. Mark it confirmed or ruled
out, with the number that shows it.

| Candidate | How to tell |
|---|---|
| Different CSS viewport width | `innerWidth` differs between phone and RDM |
| Wide / overview viewport (`setUseWideViewPort`, `setLoadWithOverviewMode`) | the app's `innerWidth` is larger than 412, or `mq.md` is true |
| WebView `textZoom` or Android `font_scale` | `textZoom` ≠ 100 in the settings, or `font_scale` ≠ 1.0. The app's computed `fontSize` is larger than the table rule at the same `innerWidth` |
| Chromium text autosizing (`TEXT_AUTOSIZING` layout algorithm) | small text boosted more than large text at the same `innerWidth`; `setLayoutAlgorithm` arg in the settings |
| Different breakpoint / article class | `mq` or `articleClass` differ |
| `data-font-size` setting differs | `dataFontSize` / `htmlFontSize` differ |
| Font face differs (Firefox fallback for Japanese) | `notoJP` false, or same `fontSize` but different element widths |
| Better Bunpro CSS differs | `htmlClass` lacks `bb-mobile-web` on one side |

If the phone numbers match none of these, stop and report. Do not guess.

## Phase 2 — make Better Bunpro reproduce the phone, from parameters only

Implement only the branch that Phase 1 confirmed.

- **Viewport width differs.** No Better Bunpro font code is needed; Phase 3
  fixes the simulator's width.
- **`textZoom` / `font_scale` or Chromium text autosizing confirmed.**
  Gecko has no Chromium autosizer, so this needs Better Bunpro code that
  replays the **Chromium algorithm**. Do not write a curve fitted to the
  screenshot.
  - Port the relevant function from Chromium source
    (`third_party/blink/renderer/core/layout/text_autosizer.cc`, and how
    WebView maps `textZoom` into it) into a pure function in
    `src/features/improved-mobile-web/text-scale.ts`. Cite the Chromium file and
    revision in one comment.
  - Its inputs are only the specified CSS size, the container width, and the
    measured WebView setting (the `textZoom` / `font_scale` value from Phase 1),
    kept as one named constant that cites `phone-app.json`.
  - Apply it only outside the app WebView: desktop Firefox in RDM or in Mobile
    First, never on a real phone.
  - Unit-test it so that each expected value comes from Chromium's formula,
    then check it against `phone-app.json` within 0.5px.
  - Stop and show the user the ported function before wiring it in.
- **Font face differs.** Make sure the Japanese font Bunpro asks for is loaded in
  Firefox. Check the `@font-face` / `font-family` that Bunpro already ships;
  do not add a new font.
- **Setting differs.** Report to the user; that is a Bunpro account setting, not code.

Reuse map for whatever you write. Fill it in before any code:

| Behaviour | Comes from |
|---|---|
| mobile detection | `mobile-gate.ts` `isMobileContext` — reuse |
| style injection | `injectStyles()` in `src/styles.ts` — reuse |
| feature start/stop | `feature.ts` `start()` / `stop()` — extend |

## Phase 3 — make Mobile First render like RDM

Only DPR and CSS width differ between Mobile First and RDM, and DPR does not
affect layout. So give the iframe the phone's CSS viewport, and shrink it
visually without changing its CSS size.

1. New dev-only module `src/dev/mobile-first-viewport.ts`, started from `src/main.ts`
   only when `import.meta.env.DEV` is true, so it never ships in `dist/`.
2. It runs in the **top** frame only (`window.top === window`). It finds
   `.iframe-wrapper > iframe.iframe.portrait`, and if there is none, does nothing.
3. It sets the iframe's CSS size to the phone viewport from Phase 1
   (`innerWidth` × `innerHeight` of `phone-app.json`; Pixel 6 default is 412×915). Put
   these in two named constants with a comment that names `phone-app.json` as the
   source.
4. To keep it inside the extension's phone frame, apply
   `transform: scale(k)` with `transform-origin: top left` to the iframe, where
   `k = originalWrapperWidth / phoneWidth`. Read the original width from the
   wrapper's `getBoundingClientRect()` before resizing. A transform does not
   change the iframe's `innerWidth`, so media queries still see 412.
5. Re-apply on top-window `resize`, and when the extension re-renders the
   wrapper (a `MutationObserver` on `document.body`, `childList: true`).
6. Verify: the `mobile-first.json` snapshot now has `innerWidth` 412, and its
   `mq`, `articleClass`, and every `fontSize` / `lineHeight` equal `rdm.json`.
   DPR may still differ; that is fine.
7. Check the keyboard: the extension's on-screen keyboard and the visual-viewport
   sync must still work. Focus `#js-manual-input`, confirm the keyboard shows, and
   confirm the answer bar sits above it. Do not type a correct answer.

## Phase 4 — acceptance

All of these, with evidence saved under `.tmp/ground-truth/`:

- [ ] `mobile-first.json` and `rdm.json` match on `innerWidth`, `mq`,
      `articleClass`, and every element's `fontSize` and `lineHeight`.
- [ ] Both match `phone-app.json` on every element's `fontSize` and `lineHeight`
      within 0.5px, or the remaining gap is explained by one confirmed cause the
      user has accepted.
- [ ] Screenshots of Mobile First and RDM at hint level 4, saved beside the app
      screenshot. English sentence visibly larger than the English note, and the
      Japanese sentence only a little larger than English, as in the app.
- [ ] `git grep -nE '1\.375rem|1\.1875rem|1\.7875rem|1\.4375rem' src/` returns
      only rules that existed before this plan. Today that is the flash-term
      `1.1875rem` cap.
- [ ] `npx vitest run` and `npx tsc --noEmit` pass.
- [ ] A real phone (`adb` screenshot of Firefox Android with Better Bunpro, the user's phone browser) looks unchanged.
- [ ] Nothing committed or pushed unless the user asked.

## Stop and ask the user when

- The phone is not connected (Phase 1b).
- None of the Phase 1c routes to the app WebView works.
- The Phase 1 numbers fit none of the candidate causes.
- Matching would need any number that is not from Bunpro's CSS or a measured
  device parameter.
