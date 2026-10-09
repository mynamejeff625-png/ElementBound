# Balance analysis tools

Scratch-grade Node scripts used for the balance research in issues #91, #95 and #99
(Oct 2026). They load `js/game.js`'s Balance Lab simulator (`EB_BALANCE`) in a
Node `vm`, so they measure **the current rules on this branch**. They are not
part of the game, not run in CI, and need no packages.

Run from the repo root, for example `node tools/balance/snowball.cjs '{}' 150`.

| Script | What it does |
|---|---|
| `harness.cjs` | Loads the simulator with optional **source patches** and an optional **modified card catalog** (`load(patches, catalog)`). Adds board logging: a snapshot each half-turn (`boardLog`) and every Manifestation's lifespan (`lives`). `games(B, seeds, opt, tag)` iterates all 81 matchups. |
| `analyze.cjs` | Board-presence report (#95): contested share, one-sided duels, comeback rate, win rate by board difference, per-round tables, per-deck lockouts and "died before attacking". |
| `snowball.cjs` | Who reaches 1, 2 and 3 units first and how often they win; win rate by field lead at the start of round 3. |
| `diag.cjs` | Lockout diagnostics: face damage dealt into empty fields, how long lockouts last, and how often the first side locked out loses. |
| `mech.cjs` | `measure(opt, seeds, tag, patches, catalog)`, the one-line summary used in #99: spread, decks in band, first player, first to 3, ±1/−2 board win rates, comeback, contested, rounds. It also holds **prototype rule patches** behind options: `lanes` (`'strict'`, `'open'`, `'guard'`, `'adjacent'`), `reach` (array of elements), `taunt`, `attackCap`, `exposed`, `strikeBackLive`. |
| `audit.cjs` | The card, effect and combo audit (handoff step 1). `cards <seeds> <tag>`: per-card early-hand win rate, play rate and turn, unit lifespan, died-before-attacking and damage per Essence, Technique fizzle, effect payoffs per duel, each deck's combo completion (also split by duel length), Resonance use, Exhaustion share. `skill <seeds> <tag>`: each deck piloted at Hard, Medium, Easy, **Random** (Hard's action budget, random choices) or **Hold** (keeps Hybrid payoffs until Resonance) against a Hard field; `PILOTS=Hard,Random` limits the list. It refuses to run if a patch anchor is missing. |
| `mulligan.cjs` | Opening-hand mulligan prototype (redraw everything but 2+ cost units, one 1-cost unit and the Response): baseline vs mulligan deck rates, first player, and win rate by opening-hand quality. |
| `hybrid.cjs` | Why Hybrid combos fail: on each turn the signature card is in hand, whether "parent + parent + signature" was missing a parent card, Essence or slots, or was feasible; plus Storm's Tempest Striker set-up. |
| `hybridfix.cjs` | *Historical: its planner shipped in 1.15.0, so it refuses to run on current `main` (anchors changed).* Hybrid fix prototypes: the **planner** AI (`simPlan`), Resonance carry, "Hybrid cards count as a parent", extra copies (`extraCopies`), and Storm's Striker trigger. Reports each Hybrid's guide-combo completion and all decks' win rates. |
| `proto103.cjs` | Charged (C1, C2) and draw-variance (D1 opening guarantee, D2 second-player mulligan, D3 self-targeting 1-drops) prototypes. Accepts a modified catalog (`run(name,seeds,tag,catalog)`). |
| `package103.cjs` | *Historical: shipped in 1.15.0–1.17.0, so it refuses to run on current `main`.* The #103 recommended package measured together (planner + Storm extras + C2 + Spark Runner 2/1 + D2). `STORM_EXTRA` sets Storm's extra cards. |
| `statpass.cjs` + `evalworker.cjs` | Greedy ±1 stat search (one stat, one point per card at most) with 2 evaluations in parallel. It starts with the worst out-of-band deck and verifies on two fresh 200-seed sets. This found the 1.13.1 Arc Runner change. |

**Things to know:**
- **Patches are string replacements on `js/game.js`.** The harness **skips any patch whose anchor text is missing**, so after code changes a prototype option can silently do nothing. Always compare against a no-option baseline run, and check that the option actually changes the numbers.
- **Some old prototype options now exist as real rules and are skipped:**
  - `noDepletion` and `escalate` → 1.11.1, growing Exhaustion;
  - `wardEmpty` → 1.12.0, Rally Ward;
  - `underdogDraw` → 1.13.0, Second Wind.
- **Noise:**
  - At 40 seeds, a deck's win rate moves about ±2 points from run to run. At 150 seeds it's about ±1; at 200, slightly less.
  - Compare candidates on the **same seed tag** (common random numbers), then verify on a different tag.
- **CI gate:** `tests/deck-band-1.13.1.cjs` is the deterministic version of the 45–55% check (60 seeds, about 7 s).
- **Hard rival:** the simulator chooses cards like the live Hard rival (`score()` mirrors `techScore`/`bodyScore`, 1.10.3). It places Manifestations in the first empty slot and attacks with `ebPickAITarget`.
