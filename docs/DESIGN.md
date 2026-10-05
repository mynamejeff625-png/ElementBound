# Element Bound — Design System

The binding UI/UX decisions for Element Bound. Agents implement from this file
(AGENTS.md §9). The research, audit, and reasoning behind it live in the Owner's
"UI/UX Foundation & Living GDD" document; this file holds only what code needs.
Owner: Claude (design) · Owner approval required to change a decision.

Status: **Phase 1 (foundation) in progress** (issue #39). Sections marked *Phase N* are decided but not
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

Framed component fills use `--eb-plate`; cards use the depth-specific
`--eb-card-plate` in §3a. No solid color blocks or orange UI chrome. Element
color appears only where it carries meaning (medallions, card badges, effects).

### 3a. Depth and light

Light comes from above throughout Element Bound, so shadows fall downward. The
visual hierarchy has three levels: the background; resting cards and plates
using `--eb-shadow-rest`; and lifted or selected cards using
`--eb-shadow-lift`. Card interiors use `--eb-card-plate` to darken toward the
edges and keep attention on their center. Card names, short effect lines, and
stats use `--eb-text-shadow` for legibility.

Glow is semantic, not decorative. Use `--eb-glow-select` only for something
selected, playable, or indicating the player's turn. Cost diamonds and the
small dark stat plates always remain inside the card frame's inner opening so
the bronze trim never competes with their values. Lift transitions animate the
opacity of a shadow layer rather than animating `box-shadow` itself.

Every screen except the main menu uses one calm, static background layer on
`body::before`: the environment art is blurred by `--eb-bg-blur` (`3px`) and
darkened with `--eb-bg-brightness` (`.45`, about 55% darker). The layer is
promoted once and never animated. The main menu's own artwork covers it
completely. Never use `backdrop-filter` for this page-wide treatment.

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
| Online deck picker | `.mp-deck-trigger`, `.mp-deck-sheet` | Medallion trigger; Prime/Hybrid listbox options; selected glow plus check | 2 |
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

Primary buttons (`.primary` and `.eb-btn--primary`) use a deep-blue vertical
gradient, inset bronze double rim and top highlight, `--eb-shadow-lift`, and
Cinzel text; pressing scales them to `.96`. Secondary `.ghost` buttons use a
darker gradient, one bronze rim, and `--eb-shadow-rest`.

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
- Layering: screen content < sticky bars < sheets and the Inspect/zoom view <
  dialogs < toasts. A sheet or zoom view always covers everything beneath it,
  including dials and animated items (use fixed layer tokens, e.g.
  `--eb-z-sheet: 100`, never ad-hoc z-index values).

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

### 5a. Medallions (`assets/medallions/`) and card frame (`assets/frames/`)

Two icon tiers:

| Tier | What | Format | Used at |
|---|---|---|---|
| **Medallions** | Painted bronze-and-stone badges, art by the Owner | 256×256 WebP with transparent background (~26 KB each) | **32 px and larger**: Codex deck dial, deck picker, Bender plates, the L card's art window, result screen, Trial seals |
| **Glyphs** | The SVG sprite above | `assets/icons.svg` | **Below 32 px**: HP counter, status coins, inline text, small cards |

Never show a medallion below 32 px; its detail turns to noise. Medallions are
`<img>` elements with meaningful `alt` text (e.g. "Fire") unless a visible label
sits next to them (then `alt=""`).

| File | Represents | Replaces |
|---|---|---|
| `fire.webp` `water.webp` `nature.webp` `earth.webp` `lightning.webp` `air.webp` | Prime elements | 🔥 💧 🌿 🪨 ⚡ 🌪️ |
| `magma.webp` `storm.webp` `bloom.webp` | Hybrid elements | 🌋 🌩️ 🌱 |
| `heart.webp` | Vitality (large contexts only) | ❤️ |
| `trophy.webp` | Victory, Trial mastered | 🏆 |
| `draw.webp` | Duel draw | ⚖️ |

**Card frames** (both 356×466, same shape, so the same 9-slice values apply).
One file serves every card size through CSS 9-slice; no per-size frames are needed.

| File | Use |
|---|---|
| `assets/frames/card-frame-bronze.webp` | **Default** for every card |
| `assets/frames/card-frame-gold.webp` | Special states only: the selected card, and later rare/legendary cards |

```css
.eb-card{border-style:solid;border-color:transparent;
  border-image:url("../assets/frames/card-frame-bronze.webp") 40 fill / var(--eb-card-frame) stretch}
.eb-card.is-selected{border-image-source:url("../assets/frames/card-frame-gold.webp")}
/* --eb-card-frame: S 12px · M 18px · L 30px */
```

The card body under the frame is `--eb-plate`. Cards stay **glyph and color**
(no painted card art): the L card's art window shows the card's element
medallion. Pending from the Owner: the frame at ≈ 1024 px tall (the current
466 px sources are slightly soft on the L card on high-density phones).

## 6. Motion

**Rule: nothing on screen changes abruptly.** Every change of screen, sheet,
card, deck or icon state is animated, and each screen phase ships its own
transitions (motion is not deferred to Phase 4; Phase 4 only adds polish and
effects).

| Change | Motion | Duration |
|---|---|---|
| Menu screen to menu screen | Symmetric side-by-side push: both screens move 100% with no opacity overlap; forward enters from the right and back mirrors it | 380 ms, `--eb-ease-move` |
| Sheet open / close | Rises from the bottom / sinks back; backdrop fades | 300 ms / 250 ms |
| Card zoom (Codex, Inspect) | Shared element: the card grows from its exact grid position into the L card | 300 ms |
| Deck dial | Medallions glide along the dial and resize smoothly; the card list slides with it | 300 ms |
| Icon or state swap (e.g. selected, disabled, tab) | Cross-fade and/or scale | `--eb-dur-lift` 150 ms |
| Tap feedback | Pressed state | `--eb-dur-tap` 80 ms |

Use `--eb-ease-in` (`cubic-bezier(.4,0,1,1)`) for elements leaving and
`--eb-ease-soft` (`cubic-bezier(.22,.61,.36,1)`) for panels arriving. When one
panel replaces another in the same space, the outgoing panel leaves first and
the incoming panel starts about 160 ms later; never use a simultaneous
cross-fade for that replacement.

All menu-level navigation uses one symmetric push. The outgoing and incoming
screens travel the same distance with `--eb-ease-move`
(`cubic-bezier(.65,0,.35,1)`) over 380 ms, so they remain side by side and never
overlap. The shared calm background stays fixed; leaving Home first fades its
full-art layer over 250 ms. Reduced motion replaces movement with a 150 ms
cross-fade.

**Swipe physics** (dial, card list, zoomed card carousel, and later the hand):
- The content follows the finger 1:1 while dragging (no animation during the drag).
- On release it snaps to the nearest item with `--eb-ease`, 300 ms. A quick
  flick (> 0.3 px/ms) or a drag past 25% of an item's width moves to the next item.
- Motion is interruptible: grabbing mid-animation takes over from the current position.
- Horizontal swipes use `touch-action: pan-y` so vertical scrolling still works;
  a drag longer than 8 px never also counts as a tap.
- Animate only `transform` and `opacity` (smooth on phones); never animate
  `width`, `height`, `top` or `left` in shipped code.

Under reduced motion, slides and zooms become 150 ms cross-fades and swipes snap
without easing.

**Duel timings *(Phase 3–4)*:**

| Event | Token | Duration |
|---|---|---|
| Tap highlight | `--eb-dur-tap` | 80 ms |
| Card lift on select | `--eb-dur-lift` | 150 ms |
| Summon | `--eb-dur-summon` | 250 ms |
| Attack lunge + hit | `--eb-dur-attack` | 300 ms |
| Damage number float | `--eb-dur-float` | 600 ms |
| Turn banner | `--eb-dur-banner` | 900 ms |

Never rely on vibration for information (iPhone browsers don't support it).

## 7. Screens

### Main menu *(Phase 2)*

The portrait menu keeps its top-left corner empty for a future profile control.
What's New occupies the safe-area-aware top-right corner, followed vertically by
the separate transparent logo, version stamp, one large Play button, paired
Play with Friends / Element Trials buttons, and Codex / How to Play links. It
must not scroll at 375×667 or 390×844. The online lobby lives on the separate
Play with Friends screen and preserves its existing control IDs.

On the first menu visit after load, the full-bright plain environment holds for
1.2 seconds and fades over 1.5 seconds to the calm background. Later visits are
already calm; reduced motion starts calm. What's New shows a dot until the
current release is opened, stores `ebSeenVersion`, and uses a dismissible,
focus-managed information sheet.

### Codex *(Phase 2)*

1. **Deck dial (top):** a horizontal, snap-scrolling row of the 9 medallions
   (6 Prime, then 3 Hybrid). The centered medallion is enlarged (64 px, others
   40 px) with the deck name and style below it (e.g. "Blazing Fist · Pressure").
   Swipe or tap a medallion to center it; arrow keys work too. It replaces the
   wrapping filter chips.
2. **Card list (below):** that deck's cards as S cards in 3 columns, grouped
   Manifestations → Techniques → Response. One scroll area for the screen.
3. **Zoom:** tapping a card animates it from its grid position into the L card
   in an Inspect sheet (shared-element transition, `--eb-dur-attack` 300 ms,
   `--eb-ease`; reduced motion → cross-fade). Inside: full rules text, "How to
   use it", and chips for only the keywords this card uses. Swipe left/right for
   the previous/next card; swipe down, tap outside, or X to close. One close
   control only (no duplicate Close + Cancel).

The Codex grows into the game's library after the menu phases: search and
keyword filters across all cards, glossary entries with “Try it” links, a “How
this deck wins” guide for each deck, and eventually collection and cosmetic
views. Those library features are not part of the deck-select work.

### Deck select *(Phase 2)*

Deck select reuses the Codex card browser: the same nine-medallion dial, sliding
deck grids, framed S cards, and shared L-card zoom. It shows every card in the
centered deck and fits without horizontal or vertical page scrolling at both
375×667 and 390×844. The primary Select control stays anchored in one thumb
position at the bottom of the screen.

Its dial, labels, dots, grid container, and grid wrappers share the Codex CSS
exactly. Only the S-card size and the grid rows and gaps needed by that size may
differ. Deck-specific transitions belong to dedicated wrappers, never the
shared carousel elements.

Selecting a deck locks and emphasizes its centered medallion, fades the card
grid down, and slides the Easy / Medium / Hard opponent choice into the same
space. The bottom control changes in place to Start Duel. “Change deck” reverses
the transition. Hard remains the display label for the existing internal
`'Difficult'` key, and the last difficulty choice is remembered locally.

### Element Trials *(Phase 2)*

Trials are a nine-chapter journey map following one winding, S-shaped river:
six always-open Prime nodes alternate along the main path and three Hybrid
nodes sit on short side branches. Cleared stretches become solid glowing
bronze; uncleared stretches remain dim and dotted. The newly cleared stretch
lights once when the player returns to the map (or appears immediately with
reduced motion). Hybrid branches unlock after both parents earn at least one
star. Each chapter has Set up, Cash in and Full combo steps; the first two roll out over
time, while each Prime's existing puzzle is its Full combo step.

Trials teach through a symbol strip rather than objective paragraphs. Card
tokens use medallions and names, status tokens use status glyphs, and payoff
tokens use sword/damage or shield symbols. Hourglass, sword, shield and Essence
goal badges state constraints with accessible labels. Done, next, later and
missed states combine shape, check/cross marks, opacity and framing so color is
never the only signal.

Hints grow only when the player is stuck: level 1 rings and numbers the next
card after 20 seconds or one wrong card; level 2 connects it to the target after
another delay or mistake. Reduced motion keeps those guides static. Rewind
restarts immediately. A completion earns one star, no Rewind earns a second,
and no wrong moves earns a third; idle hints never reduce stars. The device
keeps the best chapter result. The recap replays the symbols and marks its combo cards as mastered in the Codex and deck
select.

Every trial must fail without its combo. Trial setups use real card rules where
possible and a naive attack or wrong ordering cannot accidentally complete the
lesson. Water now Soaks Tide Brute before its scripted strike, visibly reducing
4 damage to 2; Nature Seeds Grove Beast with Sproutling before Verdant Mend adds
Growth; Air gives Sky Raptor Momentum so its printed rule can bypass Guard. Air
step ② Cash in will teach the deferred swap → Weakened lesson.

### Field anchors

Trial overlays are layout-agnostic and may locate duel UI only through these
attributes: hand cards use `data-eb-anchor="hand-card"` plus `data-eb-card`;
slots use `data-eb-anchor="slot"`, `data-eb-side` and `data-eb-slot`; Bender
plates use `data-eb-anchor="bender"` and `data-eb-side`. Positions come from the
anchor's `getBoundingClientRect()` and update when the viewport changes. The
Phase 3 field redesign must preserve this contract so the journey-map trials,
hints and outcome overlays run unchanged on the new field.

### Cards: fewer words

| Size | Shows |
|---|---|
| S (hand, slate, Codex list) | Cost gem, name, element glyph, ATK/HP icons with numbers, one `short` effect line (≤ 28 chars) |
| M | Adds the type line |
| L (Inspect) | Adds the element medallion art window, full rules text, "How to use it", keyword chips |

The glossary never repeats inside a card; basic terms live in Help.

## 8. Sound *(Phase 4)*

| Event | Sound |
|---|---|
| Card played from hand to field | Card-launch sound |
| A card effect triggers (Technique, Response, on-summon, Resonance) | Effect sound |
| Any button or navigation tap | Soft UI tap |

Rules: a **mute toggle** in Settings, remembered on the device; nothing plays
before the player's first tap (iPhone browsers block audio until then); sound
never carries information that isn't also shown on screen; only sounds with a
license that allows use in the game (e.g. CC0), recorded in an
`assets/sounds/README.md`.

## 9. Roadmap

| Phase | Scope | Gate to the next phase |
|---|---|---|
| 1 · Foundation | Tokens, components CSS, `EB_UI`, SVG icons replace emoji, fonts applied, inline styles removed | Every screen still works; only icons, fonts and spacing look different |
| 2 · Menus and sheets | Home, Trials, Codex (deck dial + zoom, §7), Help rebuilt from components; medallions replace the element glyphs at ≥ 32 px; sheets and dialogs replace `modal()` | All High-severity menu audit items closed |
| 3 · New duel screen (behind a toggle) | Slate, fanned hand, Bender plates, tap-to-target, Inspect sheet, framed cards with the `short` effect line, 60 s turn timer online; host Trials exclusively through the field-anchor contract | Zero scroll at 375×667; playtest on both layouts; all Trial overlays still work without layout-specific selectors |
| 4 · Feel | Motion, sound (§8), coin flip, result screen; old duel screen removed | First summon within 60 s for new players |
| 5 · Profiles and cosmetics | Accounts, gems, Bender cosmetics, App Check | — |

## 10. Decisions log

| Date | Decision |
|---|---|
| 2026-09-27 | Match length 3–5 min (fast decks) to 5–8 min (slow); audience casual friends first, inviting to ranked |
| 2026-09-30 | Cards stay glyph and color with the Owner's card frame (bronze by default, gold for selected/special); the L card's art window shows the element medallion |
| 2026-09-30 | Smooth, fluid transitions everywhere: no abrupt screen, card, or icon changes; swipes follow the finger (§6) |
| 2026-09-30 | Owner-made medallions replace emoji at ≥ 32 px; SVG glyphs below 32 px |
| 2026-09-30 | Codex uses a horizontal medallion deck dial with a zoom into the card |
| 2026-09-30 | Sound: card launch, card effect, and UI tap sounds, with a mute toggle |
| 2026-09-30 | Online turn timer: 60 s (ranked value decided when ranked exists) |
| 2026-10-01 | Soft depth makes cards float under light from above; glow only marks selected, playable, or your-turn states |
| 2026-10-01 | Card stats sit on small dark plates |
| 2026-10-01 | AI difficulty display labels are Easy / Medium / Hard; the internal key `'Difficult'` stays unchanged until an explicit rename task |
| 2026-10-01 | The rival deck in single player is random and revealed on the coin-flip screen |
| 2026-10-01 | Developer tools (System Check and Balance Lab) move off the main menu and open by long-pressing the version text |
| 2026-10-01 | Element Trials start with a short required basics lesson, then allow free element choice; hybrids unlock after both parents; guidance starts locked to the highlighted card and loosens into hints |
| 2026-10-01 | Guided tutorial tips come after the Phase 3 duel screen; the journey map may be built earlier on the current Trials |
| 2026-10-01 | Deck select shows every card in the centered deck and supports the shared card zoom |
| 2026-10-01 | Select swaps the card grid for difficulty choices in place while the main button stays under the player's thumb |
| 2026-10-01 | The Codex becomes the library with search, glossary links, and per-deck guides |
| 2026-10-01 | Calm background (about 55% darker plus a soft blur) on every screen except the main menu, including the duel |
| 2026-10-01 | When one panel replaces another in the same space, the outgoing panel leaves first and the incoming panel begins about 160 ms later |
| 2026-10-03 | The main-menu logo is a separate transparent layer cropped from `image-3`; the plain full art fades to the calm background after the first load |
| 2026-10-03 | The online lobby lives on its own Play with Friends screen |
| 2026-10-03 | Developer tools open from either a long-press or five taps on the version stamp |
| 2026-10-04 | Every menu screen uses one symmetric 380 ms push; reduced motion uses a 150 ms cross-fade |
| 2026-10-04 | The online deck picker uses medallions and a keyboard-accessible listbox while the hidden native select remains authoritative |
| 2026-10-04 | Trials teach combos through symbols; each chapter has three steps that can roll out over time |
| 2026-10-04 | Trial stars keep the best result locally; the third-star condition was revised after Owner playtesting on 2026-10-05 |
| 2026-10-04 | The Phase 3 field must support Trial overlays through stable hand-card, slot and Bender anchors |
| 2026-10-05 | The Trials map follows one winding river; cleared stretches glow and newly cleared progress lights once |
| 2026-10-05 | Trial stars mean complete / no Rewind / no wrong moves; idle reading time and automatic hints are free |
| 2026-10-05 | Every trial must fail without its combo; Water, Nature and Air use clearer real-rule lessons, while Air's swap → Weakened lesson moves to step ② |
