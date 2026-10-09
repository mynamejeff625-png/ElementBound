# 02 · Work log since the Phase 2 exit (PRs #80–#109, 6–9 Oct 2026)

Every item below is merged to `main`. The Claude chat was the implementer for all of it, and the Owner approved and merged each one.
The issues hold the full reasoning and data: #81 (Phase 3 brainstorm), #83, #88, #91, #93, #95, #96, #99.

## Phase 2 exit

- **#80 · 1.8.6:** Phase 2 exit audit fixes. No menu screen uses `modal()` any more.

## Phase 3 · The Arena duel screen (issue #81)

Owner's brief: make the duel field feel immersive, put the hand in a fan, show tailored combo animations, use smooth in-field pop-ups instead of modals, and fit everything on one screen with no scrolling. Stay true to the current play style.

Owner's picks: build all of A (field), B (combo language) and C (no modals), plus D0 (Reserve); field first, then mechanics; prototype D2 Ascension and D1 Bender Arts in the Lab.

- **#82 · 1.9.0** (steps 3-1 to 3-3):
  - The Arena field: the rival on top, you at the bottom, the Rift in the middle, pedestals, the Chronicle sheet.
  - Fanned hand: scrub sideways, pull up 24 px to drag; drop on a slot to summon, release above the hand to cast.
  - Mini Codex cards with medallions and status chips that carry a word as well as the glyph.
  - Attacking: in-field aim arcs with a damage preview (`ebAttackPreview` on a clone of `G`) and a Guard shield.
  - Owner feedback built in: cards were hard to drag, card details stretched, fields overlapped, and the last-touched highlight stuck.
- **#84 · 1.9.1:** Balance Lab rule experiments (`EB_BALANCE.EXPERIMENTS`) for unit survival (issue #83). Prototyped B1 Strike Back, B2 Arrival Ward and the D1/D2 ideas, simulator-only.
- **#85 · 1.9.2** (3-4):
  - The choice panel in the thumb zone replaces every duel `modal()`.
  - "Held breath" while a Response is open (`responseContext`).
  - Single-player Responses can't be dismissed.
- **#86 · 1.9.3** (3-5): combo language (`PAYOFFS` map, threads, `COMBO_RX` beats), plus the Reserve (unspent Essence shown as a bluff).
- **#87 · 1.10.0** (3-6):
  - Terrain backdrop and a lethal moment.
  - The Arena becomes the default; `?arena=0` gives the classic layout.

## 3b · Speed and connection (issue #88)

Owner reported: "connection slowed" and a board that didn't update for over 30 s.

- **#89 · 1.10.1:**
  - The Response window drops from 30 s to **10 s**, and **Auto-pass** skips token-only windows.
  - Firestore uses REST (`preferRest`); the Vercel region is `cle1` (`vercel.json`); the Firestore location is nam5.
  - Slim views: each view keeps the last 40 events, while the room keeps 200.
  - `submit-move` replies with only `{ok, autoResolved, rev, serverNow}`.
  - Self-healing client:
    - it fetches the view if no snapshot arrives after 4 s or 8 s;
    - it re-subscribes with backoff;
    - it resyncs when the app returns to the foreground;
    - it times each move (`EB_NET`).
- **#90 · 1.10.2:**
  - 60 s online turn timer: `state.turnDeadline`, a `TURN_EXPIRED` move checked against the server clock, and paused during Response windows.
  - The Rift clock turns red and blinks at 10 s or less.

## Balance round 1: why decks differ (issue #91)

**Five reasons found:**
1. Hybrids beat Primes 57.8%.
2. Each Prime had 7 copies of one situational Technique. Verdant Mend did nothing about 69% of the time; Static Step's Charge rarely paid off.
3. Stat budgets differed by element: about 3.0 stat points per Essence for Earth against 2.4 for Fire.
4. Defensive decks couldn't close games out and lost to Card Depletion.
5. The first player won 58–60%.

**Fixes shipped:**
- **#92 · 1.10.3:** Balance Lab card choice now mirrors the live Hard rival (`score()` = `techScore`/`bodyScore`). It confirmed Nature's weakness was real, not a simulator artifact.
- **#94 · 1.11.0:** a second Technique for each Prime (#93): Searing Brand, Riptide, Wild Growth, Stone Fist, Recharge and Downdraft.
  - Added to the Codex (6 cards per Prime), the Tome (Techniques section on each element page) and the deck guides.
  - The phone smoke caught Riptide's short line clipping on the small Codex card; it was shortened.
  - Spread 14.7 → 9.4.

## Balance round 2: board presence and comebacks (issues #95, #96)

Owner: "When I lose momentum and my cards run out, the opponent gains the upper hand and I can't come back."

- **#95 finding:** the first side whose field was empty at the start of its own turn (round 3+) lost 96.6% of the time.
- **Causal chain:**
  1. Attacks are free.
  2. New units die before they act (41–70% of them).
  3. The trailing side runs out of cards.
  4. An empty field leaves the Bender open.
- **#97 · 1.11.1:**
  - **One deck-out rule everywhere:** growing Exhaustion (2, 3, 4…) and no Card Depletion loss. The online engine never had the Depletion loss, so this was a parity fix.
  - **Second parity fix found while checking:** live single-player ended every round after the *rival's* turn. In rival-first duels the player had +1 Essence every turn, and round effects expired a turn early. New `ebPassTurn()` ends the round at the starting seat.
  - Two stale in-game System Check items were fixed, and the phone smoke now runs the whole System Check.
- **#98 · 1.12.0:** **Rally Ward**.
  - The trigger is "from round 2" rather than "after a loss", because Re-cycle also puts cards in the Wake. It measured slightly better too.
  - New `warded` glyph, Ward chip, Tome page and `TARGET_WARDED` engine error.
  - #98 was accidentally merged into #97's branch, and #97 then shipped both together. Harmless.

## Balance round 3: snowball and the 45–55% goal (issue #99)

Owner's goal: every deck at 45–55%, balance by deck identity, cards staying on both fields, and no exponential advantage from filling the field first. Owner asked for inspiration from modern card games, matched to Element Bound's pace.

- **Mechanics tested** (adapted patterns): facing lanes (strict, open, adjacent, Guard-intercept, Reach), Second Wind (catch-up draw), command limit, Exposed attackers, Guard taunt, survivor strike-back, Bender Arts.
- **Owner's order:** Second Wind, then a lanes playtest toggle, then a ±1 stat pass.
- **#100 · 1.13.0:** **Second Wind**, the "low hand or 2+ behind" variant, picked by the Owner over "low hand only" and "any time behind". It keeps the first-player rate at 54%.
- **Lanes re-measured after Second Wind:** strict lanes add only 3–6 points of snowball relief but swing deck balance hugely (Earth and Magma about 70%, Fire and Lightning 25–30%). **Owner: "stat pass first, lanes later."** Lanes are parked; the data is on #99.
- **#101 · 1.13.1:** stat pass. A greedy ±1 search needed one change: **Arc Runner 3/3 → 4/3**. All 9 decks are now in 45–55%. New CI gate `tests/deck-band-1.13.1.cjs`.

## Audit round: cards, effects and combos (issue #103, 9 Oct)

The first task of the new chat (handoff step 1). Report: #103, with two decision comments.

- **Tools:** `tools/balance/audit.cjs` (per-card, effect, combo and skill-pilot tables) and `mulligan.cjs`.
- **What it found:** mostly rules bugs, not balance outliers. See 03 for the numbers.
- **#104 · 1.13.2 "True Rules":**
  - **Rival bug:** the live rival (`ai()`) summoned its own Response card as a stat-less unit. Its attack set Vitality to `NaN`. The legal-play filter now skips Response cards.
  - **Engine parity (online duels):**
    - Static Step now Charges on the *second* card; it used to need a third.
    - Gale Scout's Crosswind Momentum now counts in the attack that uses it (`attackBonus()` runs before ATK is read).
    - Tidelily Guardian's Resonance heal now exists online.
  - **Text:** Static Step says the Charge replaces the Flow.
  - **Test:** `tests/rules-parity-1.13.2.cjs`. One old fixture assumed the third-card Static Step.
- **#105 · 1.14.0 "Deep Roots":**
  - Root Keeper grows when healed. Its text had never been implemented.
  - Grove Beast gets +2 ATK per Growth. Its old text only restated the general rule.
  - Nature plays 2 Wild Growth and 5 Verdant Mend.
  - Why a deck-list change: any ±1 on Grove Beast moved Nature by 15–25 points (to 35% or 64%).
  - Test: `tests/growth-payoffs-1.14.0.cjs`.

## #103 follow-up package (9 Oct)

The analysis is on #103 (Hybrid combo diagnosis, Charged, draw variance). The Owner approved the full package and it shipped in three PRs:

- **#106 [docs]:** handoff updated to 1.14.0, plus the analysis scripts. Codex review led to anchor checks in every script and the 7-card early-hand cohort.
- **#107 · 1.15.0 "Resonant Rivals":** a shared Hybrid planner for the Hard rival and the Lab (AI only).
  - Combos: Magma 4 → 59%, Bloom 6 → 57–59%, Storm 1 → 20%.
  - Codex finding fixed: the planner now picks the cheapest affordable parent cards.
- **#108 · 1.16.0 "Live Wires":** the Charged rule change (a Bender Charge is released by any Lightning attack this round), plus Storm's 2nd Tempest Striker and 2nd Crosswind Spark (`HYBRID_EXTRAS`).
  - Charged released 4 → 69%; Storm combo about 49%.
  - Codex finding: rival targeting now counts the Charged +1. That pushed Lightning to 56–57%, so the Owner picked Arc Runner 4/3 → 3/3 and Spark Runner stays 2/2; the planned 2/1 was dropped.
- **#109 · 1.17.0 "Second Chance":** the second-player mulligan.
  - Shuffle-back version (Owner pick over bottom-of-Deck, which pushed the first player down to 48%).
  - The rival and Lab mulligan only weak hands (Owner pick).
  - The CI gate went from 60 to 200 seeds (Owner pick): at 60, Fire and Air read 44.6–44.8% from noise.
  - First player 54 → 52.5%.
  - A smoke check I wrote flaked once (a shuffled-back card can be redrawn); fixed with a fixed random source in that check.

## Owner decisions to remember

- Stat changes: **±1 ATK or HP per card**, no cost changes, unless the Owner says otherwise.
- Lanes: parked; may return as a depth or feel feature later.
- Second Wind wording counts **all** cards in hand, the number players can see.
- Technique damage never overflows to the Bender, in every mode.
- Rally Ward stops attacks only; Techniques still reach a Warded unit.
- Root Keeper as printed; Grove Beast gets the real +2 bonus, balanced through the deck list (Wild Growth 3 → 2), not stats (9 Oct).
- A card-text fix that only matches the existing rules (Static Step) is fine inside a hotfix.
- Hybrid combos should land 25–40%+ of duels. Fix them through AI sequencing and deck lists, not rules that make combos automatic (rejected: "Hybrid cards count as a parent").
- The mulligan is for the second player only. Shuffle it back. The AI mulligans only weak hands; players may mulligan any hand.
- The balance gate runs 200 seeds. The band stays 45–55%.
