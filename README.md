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

### Local MCP Firefox (agent debugging)

For Cursor + Firefox DevTools MCP against Bunpro, use the **MCP debug profile** only (never your personal Firefox profile). The launcher is [`scripts/firefox-mcp`](./scripts/firefox-mcp); optionally symlink it:

```shell
ln -sfn "$(pwd)/scripts/firefox-mcp" ~/bin/firefox-mcp
```

Typical bring-up:

```shell
npm run dev                              # Vite on http://127.0.0.1:5173
./scripts/firefox-mcp                    # fresh window: Bunpro reviews + TM install URL
```

That opens Tampermonkey’s update dialog for **server:Better Bunpro**. Update/reinstall the stub whenever Vite’s userscript header changed (version bump, `@connect`, etc.) so `GM_xmlhttpRequest` stays wired. Vite still serves latest code; a stale stub only breaks the privilege bridge (dictionary audio falls back to Bunpro TTS).

Cursor project rule: [`.cursor/rules/mcp-session-stub-update.mdc`](./.cursor/rules/mcp-session-stub-update.mdc) (bring-up ritual). Profile safety (never touch the personal Firefox profile) lives in your **user** Cursor rules, not this repo.

## Greasy Fork releases

Greasy Fork only picks up a new release when **`package.json` `version` changes** and lands on `main` (so the built `@version` in `dist/` changes too). Before pushing behaviour changes to `main`:

1. Bump `version` in `package.json` (and `package-lock.json`)
2. Update `greasyfork-additional-info.md` if user-visible behaviour changed
3. `npm run build`
4. Commit version + info + `dist/` together, then push

Sync URL for Greasy Fork (webhook):

`https://raw.githubusercontent.com/mwsmws22/better-bunpro/main/dist/better-bunpro.user.js`

## Greasy Fork webhook setup

1. **Script sync URL** (Greasy Fork → Better Bunpro → Update / Admin → sync from URL):

   `https://raw.githubusercontent.com/mwsmws22/better-bunpro/main/dist/better-bunpro.user.js`

2. **Your webhook payload URL + secret** (must be logged in):

   https://greasyfork.org/en/users/webhook-info  
   Click **Generate** if you do not have a secret yet. Copy the **Payload URL** and **Secret**.

3. **GitHub webhook** on this repo → Settings → Webhooks → Add webhook:

   | Field | Value |
   |---|---|
   | Payload URL | from Greasy Fork webhook-info (usually `https://api.greasyfork.org/users/1519982/webhook`) |
   | Content type | `application/json` |
   | Secret | from Greasy Fork webhook-info |
   | Events | Just the **push** event |
   | Active | checked |

After that, each push to `main` that **modifies** `dist/better-bunpro.user.js` (and bumps `@version`) updates Greasy Fork automatically.
