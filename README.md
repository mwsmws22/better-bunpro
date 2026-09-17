# Better Bunpro

Tampermonkey script for [Bunpro](https://bunpro.jp) — features I wish Bunpro had. Published on [Greasy Fork](https://greasyfork.org/en/scripts/595616-better-bunpro).

Built with [vite-plugin-monkey](https://github.com/lisonge/vite-plugin-monkey). The file to publish is `dist/better-bunpro.user.js`.

## Features

- Example sentences for A1+ vocab after a correct answer (when Bunpro shows none)
- Tab to cycle example sentences
- Don't spoil the answer on a wrong typed guess
- Add a missed vocab translation as a synonym (button or **S**)
- Left Arrow to re-edit a wrong answer without deleting the last character
- Real speaker audio instead of synthesised term TTS

Full Greasy Fork descriptions: [`greasyfork-additional-info.md`](./greasyfork-additional-info.md).

## Settings

Open the panel from the sliders icon in the site header (between Search and Help), in the quiz toolbar next to Bunpro's own settings and styling icons, or from **Settings** in the Tampermonkey menu. Feature toggles persist via `GM_setValue`.

## Development

```shell
npm install
npm run dev        # serves the script with live reload
npm test
npm run typecheck
npm run build      # writes dist/better-bunpro.user.js
```

## Greasy Fork releases

Greasy Fork only picks up a new release when **`package.json` `version` changes** and lands on `main` (so the built `@version` in `dist/` changes too). Before pushing behaviour changes to `main`:

1. Bump `version` in `package.json` (and `package-lock.json`)
2. Update `greasyfork-additional-info.md` if user-visible behaviour changed
3. `npm run build`
4. Commit version + info + `dist/` together, then push

Sync URL for Greasy Fork (webhook):

`https://raw.githubusercontent.com/mwsmws22/better-bunpro/main/dist/better-bunpro.user.js`
