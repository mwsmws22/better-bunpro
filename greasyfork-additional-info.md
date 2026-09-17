Small quality-of-life tweaks for [Bunpro](https://bunpro.jp) — features I wish Bunpro had. "Better" is just alliteration; if they want to ship any of these themselves, that would be great.

Open settings from the **sliders icon** in the site header (between Search and Help), in the quiz toolbar, or Tampermonkey → Better Bunpro → Settings.

### Play real speakers instead of TTS audio

When Bunpro would play TTS (text-to-speech) vocab audio, this prefers a recording from a Japanese speaker — looked up the same way [Yomitan](https://github.com/yomidevs/yomitan) does (JapanesePod101, then Jisho). Play buttons are **white** for TTS and **blue** for real audio; the tooltip reveals the source (JPod101, Jisho, Bunpro TTS, or Bunpro Recording).

### Show unverified example sentences for A1+ vocab

After a correct answer, show example sentences for A1+ vocab that Bunpro's website hides (the mobile app already has this feature). A different sentence rotates each review session.

### Add a wrong answer as a synonym

After a missed vocab translation, an **Add as synonym** button next to your guess (or press `S`) saves it and marks the review correct — no need to dig through More Info.

### Don't spoil the answer on a wrong guess

On Manual Translation–style reviews, Bunpro shows the correct answer as soon as you miss — so undo is pointless. With this on, a wrong guess is not submitted: nothing is revealed and your text stays so you can try again. To give up: clear the box and press `Enter`, or press `Enter` again on the same wrong answer.

### Edit a wrong answer with Left Arrow

After a wrong typed answer, `Left Arrow` undoes without deleting — the full guess stays so you can fix a mistake in the middle. (`Backspace` still deletes the last character.)

### Cycle example sentences with Tab

After a correct answer, press `Tab` to cycle through other example sentences for the same item. Your grade and the sentence your next review starts on stay unchanged.

Idea from [Joseph G](https://greasyfork.org/en/users/1613422-joseph-g)'s [Bunpro Sentence Cycle](https://greasyfork.org/en/scripts/584571-bunpro-sentence-cycle).

Source: [github.com/mwsmws22/better-bunpro](https://github.com/mwsmws22/better-bunpro)
