# Improved web mobile experience — design

## Goal

A Better Bunpro settings feature that improves Bunpro’s **web** review UI on phones (and narrow/RDM viewports), starting with filling the visible viewport so closing the soft keyboard leaves no black/empty gap — closer to the native app.

Later tweaks stay under the same feature unless they need their own setting.

## Locked decisions

| Decision | Choice |
|---|---|
| Title | Improved web mobile experience |
| Feature id | `improved-mobile-web` |
| Default | enabled |
| Activation | Feature on **and** mobile context |
| Mobile context | viewport width ≤ 640px (Bunpro `sm`) **OR** mobile UA |
| Layout approach | `visualViewport` → CSS custom properties + flex column |
| Marker class | `html.bb-mobile-web` |
| v1 scope | Review quiz shell fill only |

## Behaviour

1. Feature **off** → no class, no listeners, no layout CSS from this feature.
2. Feature **on**, not mobile → listeners may watch resize/UA, but no `bb-mobile-web` and no VV CSS vars applied for layout.
3. Feature **on**, mobile → `html.bb-mobile-web`; sync `--bb-vv-height` and `--bb-vv-offset-top` from `visualViewport` (fallback `window.innerHeight`); review quiz shell becomes a full visible-height flex column with the answer bar at the bottom.
4. Leaving mobile or stopping the feature clears class and vars.

## Architecture

- `mobile-gate.ts` — detect mobile; toggle class; notify when active flips.
- `visual-viewport.ts` — while active, keep CSS vars in sync; teardown clears.
- `feature.ts` — registry `Feature`; start/stop wires gate + viewport + `injectStyles()`.
- CSS in `styles.ts` under `html.bb-mobile-web` only.

Remount-safe: class on `<html>`, no injected review DOM.

## Non-goals (v1)

- Toolbar / chrome redesign
- Safe-area-only polish beyond height sync
- Non-review pages
- Separate settings for sub-tweaks

## Success criteria

- Keyboard open: answer bar sits on the visible bottom (above keyboard).
- Keyboard closed: question area + answer bar fill the viewport; no leftover void.
- Desktop wide + feature on: unchanged Bunpro layout.
- Feature off: unchanged Bunpro layout.
