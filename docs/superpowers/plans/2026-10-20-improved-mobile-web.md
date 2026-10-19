# Improved web mobile experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Settings feature that fills Bunpro review UI to the visible viewport on mobile when enabled.

**Architecture:** Two-gate activation (settings + mobile detection); `visualViewport` synced to CSS vars; flex-column quiz shell under `html.bb-mobile-web`.

**Tech Stack:** TypeScript userscript, Vitest/jsdom, existing Feature registry + `styles.ts`.

## Global Constraints

- Feature id `improved-mobile-web`; title "Improved web mobile experience"; default enabled
- Mobile: width ≤ 640 **or** mobile UA
- No DOM injection into quiz; class on `<html>` only
- CSS only under `html.bb-mobile-web`

---

## File map

| Path | Role |
|---|---|
| `src/features/improved-mobile-web/mobile-gate.ts` | Detection + class toggle |
| `src/features/improved-mobile-web/visual-viewport.ts` | VV → CSS vars |
| `src/features/improved-mobile-web/feature.ts` | Feature wiring |
| `src/features/improved-mobile-web/*.test.ts` | Unit tests |
| `src/styles.ts` | Mobile layout CSS |
| `src/main.ts` | Register feature |

---

### Task 1: Mobile gate

- [ ] Write failing tests for `isMobileContext` and start/stop class toggle
- [ ] Implement `mobile-gate.ts`
- [ ] Tests pass

### Task 2: Visual viewport sync

- [ ] Write failing tests for var sync and teardown
- [ ] Implement `visual-viewport.ts`
- [ ] Tests pass

### Task 3: Feature + CSS

- [ ] Implement `feature.ts`; register in `main.ts`
- [ ] Add quiz flex-fill CSS in `styles.ts`
- [ ] Feature smoke test (class + styles present when started in mobile context)

### Task 4: Manual verify

- [ ] MCP Firefox + Mobile First: keyboard open/close fill; feature off noop
