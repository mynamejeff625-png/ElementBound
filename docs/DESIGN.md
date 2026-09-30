# Element Bound — Design System

The binding UI/UX decisions for Element Bound. Agents implement from this file
(AGENTS.md §9). The research, audit, and reasoning behind it live in the Owner's
"UI/UX Foundation & Living GDD" document; this file holds only what code needs.
Owner: Claude (design) · Owner approval required to change a decision.

Status: **Phase 1 (foundation)**. Sections marked *Phase N* are decided but not
built yet; do not implement them early.

---

## 1. Goals (acceptance targets)

| Goal | Target |
|---|---|
| Duel fits one screen | 0 px vertical or horizontal scroll at 375×667 and 390×844 *(Phase 3)* |
| Touch targets | Every tappable element has a hit area ≥ 44×44 px |
| Readable text | Contrast ≥ 4.5:1 (≥ 3:1 at ≥ 24 px); no duel text under 11 px; text never sits directly on background art without a plate or scrim |
| Few words in the duel | No sentences except one short effect line per card; detail lives in Inspect |
| One component system | Every button comes from ≤ 5 variants driven by shared tokens |
| No inline styles | 0 `style="…"` attributes in HTML or templates (the CSP blocks them) |

## 2. Tokens (`css/tokens.css`)

All colors, fonts, sizes, spacing, radii, and timings come from these custom
properties. Component CSS never uses a raw hex value or pixel size that has a
token.

### Color

| Token | Value | Use |
|---|---|---|
| `--eb-ink` | `#EEF1F7` | Primary text |
| `--eb-ink-quiet` | `#B9C2D6` | Secondary text |
| `--eb-plate` | `rgba(17, 21, 31, 0.92)` | Panel, card body, button face |
| `--eb-plate-edge` | `#0D111B` | Dark gap line inside frames |
| `--eb-bronze-hi` | `#E4CFA3` | Frame highlight, primary frame |
| `--eb-bronze-lo` | `#8A7250` | Frame shadow, standard frame |
| `--eb-select` | `#FFF3DC` | Selected card, active attacker |
| `--eb-target` | `#FF6B6B` | Valid attack target, damage preview |
| `--eb-drop` | `#9FD8FF` | Valid summon slot |
| `--eb-danger` | `#D46A6A` | Danger button frame (leave, forfeit) |
| `--eb-hp-hi` / `--eb-hp-lo` | `#FF7A6A` / `#B8231C` | Vitality segments (gradient) |
| `--eb-essence-hi` / `--eb-essence-lo` | `#E6FBFF` / `#1F4FAE` | Essence gems, cost gems (gradient) |

### Elements

Same values as `EB_FX_COLOR` in `js/game.js`; that object must read from these
tokens (or both from one shared list) so they cannot drift.

| Element | Token | Value | Glyph (never color alone) |
|---|---|---|---|
| Fire | `--eb-el-fire` | `#FF704D` | flame |
| Water | `--eb-el-water` | `#55C7FF` | wave |
| Nature | `--eb-el-nature` | `#67D77A` | leaf |
| Earth | `--eb-el-earth` | `#D0A25C` | stone |
| Lightning | `--eb-el-lightning` | `#FFE45D` | bolt |
| Air | `--eb-el-air` | `#BDEAFF` | swirl |
| Magma | `--eb-el-magma` | `#FF633F` | flame over stone |
| Storm | `--eb-el-storm` | `#AA91FF` | bolt in cloud |
| Bloom | `--eb-el-bloom` | `#6BE8AE` | leaf with droplet |

### Type

Fonts are self-hosted in `assets/fonts/` (see its README for the `@font-face`
rules). No third-party font or style hosts: the CSP forbids them.

| Token | Value |
|---|---|
| `--eb-font-display` | `"Cinzel", Georgia, serif` (names, numbers, headings; weights 600–800) |
| `--eb-font-ui` | `"Nunito Sans", system-ui, sans-serif` (UI text, card effects; 400–800) |
| `--eb-text-xs` … `--eb-text-3xl` | `11px`, `13px`, `15px`, `19px`, `24px`, `32px` |

Labels are Title Case. ALL CAPS only for tiny tags (≤ 11 px) with added letter
spacing.

### Space, radius, motion

| Group | Tokens | Values |
|---|---|---|
| Spacing | `--eb-space-1` … `--eb-space-6` | `4, 8, 12, 16, 24, 32` px |
| Radius | `--eb-radius-sm`, `--eb-radius-md`, `--eb-radius-lg` | `6, 9, 14` px |
| Motion | `--eb-dur-tap`, `--eb-dur-lift`, `--eb-dur-summon`, `--eb-dur-attack`, `--eb-dur-float`, `--eb-dur-banner` | `80, 150, 250, 300, 600, 900` ms |
| Easing | `--eb-ease` | `cubic-bezier(0.2, 0.8, 0.2, 1)` |

Under `@media (prefers-reduced-motion: reduce)`, every duration token becomes
`1ms` except `--eb-dur-float` and `--eb-dur-banner`, which become `200ms` (a fade).

## 3. Frames: minimal fill, detailed outline

Every framed element uses the same three-line edge, drawn with inset shadows
(no borders, so frames never change layout size):

```css
/* standard frame */
box-shadow:
  inset 0 0 0 1px var(--eb-bronze-lo),
  inset 0 0 0 3px var(--eb-plate-edge),
  inset 0 0 0 4px color-mix(in srgb, var(--eb-bronze-lo) 60%, transparent);
```

| Variant | Outer line | Extra |
|---|---|---|
| Primary | `--eb-bronze-hi` | soft inner glow `inset 0 0 12px color-mix(in srgb, var(--eb-bronze-hi) 25%, transparent)` |
| Secondary | `--eb-bronze-lo` | — |
| Quiet | single 1 px line in `--eb-ink-quiet` at 40% | no gap line |
| Danger | `--eb-danger` | — |

Fills are `--eb-plate` only. No solid color blocks; no orange UI chrome. Element
color appears only where it carries meaning (medallions, card badges, effects).

## 4. Components (`css/components.css`, `js/ui.js`)

BEM classes; every state is a modifier class or attribute, never a hand-written
style. The engine and game code set states; CSS draws them.

| Component | Class | Variants / states | Phase |
|---|---|---|---|
| Button | `.eb-btn` | `--primary` `--secondary` `--quiet` `--danger`; `:active`, `[disabled]`, `.is-loading` | 1 |
| Icon button | `.eb-icon-btn` | `--framed`; `[disabled]`, `.has-badge` | 1 |
| Chip | `.eb-chip` | `.is-on` | 1 |
| Status coin | `.eb-coin` | `.is-fading` | 1 |
| List tile | `.eb-tile` | `.is-done`, `.is-locked` | 1 |
| Sheet | `.eb-sheet` | choice, inspect, info | 1 (CSS + helper only; `modal()` migrates in Phase 2) |
| Dialog | `.eb-dialog` | confirm only | 1 (CSS + helper only) |
| Toast / banner | `.eb-toast` | toast, banner | 1 (CSS + helper only) |
| Text input | `.eb-input` | `.is-error`, `[disabled]` | 2 |
| Game card | `.eb-card` | sizes XS 56×78, S 104×146, M 160×224, L 280×392 | 3 |
| Slot | `.eb-slot` | `.is-drop`, `.is-invalid`, `.is-pending` | 3 |
| Bender plate | `.eb-plate` | `.is-turn`, `.is-target`, `.is-hit`, `.is-danger` | 3 |
| Meter | `.eb-meter` | HP (30 segments), Essence (7 gems) | 3 |

Every interactive class guarantees a ≥ 44×44 px hit area (padding or a
`::before` hit box), even when the drawn shape is smaller.

`window.EB_UI` (in `js/ui.js`) is the only way new UI is built:
`button(opts)`, `iconButton(opts)`, `icon(name, opts)`, `sheet(opts)`,
`dialog(opts)`, `toast(text, opts)`. Helpers return DOM elements built with
`createElement`/`textContent` (no `innerHTML` with interpolated text) and never
set inline styles.

### Layout rules

- One Primary button per screen: Home → Play; Duel → End Turn; Result → Rematch.
- Sheets for choices and information (rise from the bottom, in thumb reach);
  dialogs only to confirm irreversible actions (leave duel, forfeit).
- Close is always an X at top-right, plus tap-outside and swipe-down.
  Back is always an arrow at top-left. "Cancel" appears only when aborting a choice.
- Rules-critical sheets (Response Window) have no generic close: they exit only
  through a game action such as Pass.
- Frequent actions live in the bottom third of the screen; rare ones (settings,
  exit, log) at the top.

## 5. Icons (`assets/icons.svg`)

One SVG sprite, used as `<svg class="eb-icon"><use href="assets/icons.svg#name"></use></svg>`
through `EB_UI.icon(name)`. Same-origin, so the CSP allows it. Every symbol has
`viewBox="0 0 24 24"`, uses `currentColor`, and has no embedded styles, images
or scripts. Decorative icons get `aria-hidden="true"`; meaningful icons get an
accessible name (`aria-label` or visible text).

| Set | Style | Symbols |
|---|---|---|
| Elements | filled silhouette | `fire` `water` `nature` `earth` `lightning` `air` `magma` `storm` `bloom` |
| Statuses | filled silhouette, readable at 12 px | `burning` `charged` `guard` `soaked` `seeded` `momentum` `armor` `growth` `weakened` `token` |
| UI | 1.75 px stroke, round caps and joins, no fill | `back` `close` `log` `settings` `hand` `deck` `wake` `recycle` `trophy` `heart` |

Element glyphs must stay distinguishable by shape alone (Fire vs Magma, Water vs
Air are close in hue). Hybrids combine their parents' shapes.

**Emoji are not used anywhere in rendered UI.** The emoji map `E` in
`lib/cardCatalog.js` is shared data read by the server; leave it in place, but
the browser renders `EB_UI.icon(key)` in HTML and the element **name** in plain
text (event log, `textContent`, titles).

## 6. Motion *(Phase 4)*

| Event | Token | Duration |
|---|---|---|
| Tap highlight | `--eb-dur-tap` | 80 ms |
| Card lift on select | `--eb-dur-lift` | 150 ms |
| Summon | `--eb-dur-summon` | 250 ms |
| Attack lunge + hit | `--eb-dur-attack` | 300 ms |
| Damage number float | `--eb-dur-float` | 600 ms |
| Turn banner | `--eb-dur-banner` | 900 ms |

Never rely on vibration for information (iPhone browsers don't support it).

## 7. Roadmap

| Phase | Scope | Gate to the next phase |
|---|---|---|
| 1 · Foundation | Tokens, components CSS, `EB_UI`, SVG icons replace emoji, fonts applied, inline styles removed | Every screen still works; only icons, fonts and spacing look different |
| 2 · Menus and sheets | Home, Trials, Codex, Help rebuilt from components; sheets and dialogs replace `modal()` | All High-severity menu audit items closed |
| 3 · New duel screen (behind a toggle) | Slate, fanned hand, Bender plates, tap-to-target, Inspect sheet, card `short` effect line | Zero scroll at 375×667; playtest on both layouts |
| 4 · Feel | Motion, sound, coin flip, result screen; old duel screen removed | First summon within 60 s for new players |
| 5 · Profiles and cosmetics | Accounts, gems, Bender cosmetics, App Check | — |

## 8. Open decisions

- Card art: painted art or glyph-and-color? (The L card reserves an art window either way.)
- Sound: at launch or later? (Changes Phase 4 scope.)
- Turn timer: 60 s casual / 45 s ranked, to be playtested before locking.
