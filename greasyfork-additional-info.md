Fixes and features for [Bunpro](https://bunpro.jp) I wish were natively implemented in Bunpro.

Open settings from the **sliders icon** in the site header (between Search and Help), in the quiz toolbar, or Tampermonkey → Better Bunpro → Settings.

### Play real speakers instead of TTS audio

When Bunpro would play TTS (text-to-speech) vocab audio, this prefers a recording from a Japanese speaker — looked up the same way [Yomitan](https://github.com/yomidevs/yomitan) does. Play buttons are **white** for TTS and **blue** for real audio; the tooltip reveals the source (JPod101, Jisho, Bunpro TTS, or Bunpro Recording).

After you answer, the answer-bar control is a simple **play ↔ pause** toggle (click or `P`) — including when Bunpro autoplays on a correct answer — without opening Bunpro’s X / timer player bar. Sentence audio stays on Bunpro’s clip; term-only cards can fall back to a JPod recording in the same control.

### Show unverified example sentences for A1+ vocab

After a correct answer, show example sentences for A1+ vocab that Bunpro's website hides (the mobile app already has this feature). A different sentence rotates each review session.

### Add a wrong answer as a synonym

After a missed vocab translation, an **Add as synonym** button next to your guess (or press `S`) saves it and marks the review correct — no need to dig through More Info.

### Don't spoil the answer on a wrong guess

On Manual Translation reviews, Bunpro shows the correct answer as soon as you miss — so undo is pointless. With this on, a wrong guess is not submitted: nothing is revealed and you can try again. This is similar to how Cloze reviews already work. To give up, press `Enter`.

### Edit a wrong answer with Left Arrow

After a wrong typed answer, `Left Arrow` undoes without deleting — the full guess stays so you can fix a mistake in the middle. (`Backspace` still deletes the last character.)

This is meant to be used with "Quiz – Undo Action" set to "Clear Last Character" in review settings. 

### Cycle example sentences with Tab

After a correct answer, press `Tab` to cycle through other example sentences for the same item. Your grade and the sentence your next review starts on stay unchanged. Idea from [Joseph G](https://greasyfork.org/en/users/1613422-joseph-g)'s [Bunpro Sentence Cycle](https://greasyfork.org/en/scripts/584571-bunpro-sentence-cycle).

### Fully hide review SRS

Bunpro’s **Review SRS → Hide** only conceals the level (Beginner / Seasoned / …) before you answer; after a wrong answer, give-up, or correct it still flashes. This keeps that chip hidden for the whole review. Turn on Bunpro’s Hide as well so the level stays gone before submit too.

<hr>

Source: [github.com/mwsmws22/better-bunpro](https://github.com/mwsmws22/better-bunpro)

Side note, "better" is just an alliteration with a nice ring; no shade intended. If Bunpro wants to ship any of these themselves, that is fine by me.