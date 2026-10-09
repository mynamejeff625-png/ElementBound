# 04 · Next steps

## Where we left off (9 Oct, main @ 1.14.0)

- **Deck-level balance:** done. 9/9 decks in 45–55%, guarded by `tests/deck-band-1.13.1.cjs`.
- **Step 1, the card, effect and combo audit:** done. Report on **#103**. It led to:
  - 1.13.2 (#104): rules-parity fixes;
  - 1.14.0 (#105): Root Keeper and Grove Beast.
- **Open:** the #103 follow-up (Hybrid combos, Charged, draw variance). The analysis and measured package are on #103. **The Owner approved the full package on 9 Oct**; build it in the three PRs below.

## Step 2 · #103 follow-up package (Owner-approved 9 Oct)

Measured together, the package gives:
- 9/9 decks in band, spread 6.6–7.9;
- combos: Magma 59%, Storm 48%, Bloom 58%;
- Charged released 69%;
- first player 52.2%.

Planned as three PRs, in this order:

1. **Hybrid planner (AI only, live Hard rival + Lab).** Prototype: `simPlan()` in `tools/balance/hybridfix.cjs`.
   - Play the missing parent cards first; hold Resonance payoffs (Molten Channel, Pressure Forge, Crosswind Spark, Thunderstep, Rainseed, Flourishing Current) until Resonance is on.
   - Storm: move a ready Tempest Striker when a mover and an empty slot exist.
   - Port to live `ai()` (budget loop) and the Lab's `choosePlay()`. Medium keeps its 40% second-best pick; Easy stays random.
   - Rule surfaces untouched. Tests: rival and Lab sequencing, plus the deck band.
2. **Storm list + Charged C2 + Spark Runner 2/1** (they balance each other).
   - Storm deck: + Tempest Striker, + Crosswind Spark, each replacing a 1-cost parent unit. The deck is built in `lib/matchFactory.js` *and* the Lab's `makeDeck()`; keep both in step.
   - C2: Charged on the enemy Bender is released by the next Lightning attack this turn on any target (+1).
     - Card text: Static Step.
     - All four surfaces: live `elementalAttackBonus`, the rival, the Lab's `attackBonus`, the engine's `attackBonus`.
     - The Tome's Charged page.
   - Spark Runner 2/2 → 2/1.
3. **Second-player mulligan (D2).** The largest change:
   - choice UI at duel start (the Arena choice panel);
   - an engine move (`MULLIGAN`, before the first turn, second seat only, hidden card names);
   - a player-view privacy test;
   - a Tome page;
   - a Lab policy (as in `proto103.cjs`).
   - Privacy and shape change: flag it in the PR (AGENTS.md §8).

Each PR: rules parity (AGENTS.md §4), a version bump, a focused test with a mutation check, the full suite, the phone smoke and CI links.

## Backlog (not started; Owner decides order)

| Item | Notes |
|---|---|
| Free-attack snowball | +1 at the start of your turn still wins about 82%. The root cause is that attacks cost nothing. The fixes are bigger: strike-back with a stat redesign, or lanes. Data is on #99. |
| Facing lanes | Parked by the Owner ("stat pass first, lanes later"). Value is positional depth plus a purpose for the movement cards. Strict lanes need a balance redesign. Data is on #99. |
| Online Flow choice | The online client never sends Keep/Bottom, so Flow always keeps the top card online. A small client and engine-payload change. |
| Lab Flame Burst overflow | The Lab lets it overflow; live play and the engine don't. A one-line consistency fix with no measured effect. |
| Hybrid Trials | The Trials map has no puzzles for Magma, Storm or Bloom (from Phase 2d, #55). |
| Phase 4 · Feel (DESIGN.md §9) | Motion polish, sound (§8), coin flip, result screen, and removing the classic duel screen (`?arena=0`). |
| Phase 5 | Profiles, cosmetics, App Check. |
| Unbuilt ideas from #81 | D3 Last Stand (Initiation Token at 10 Vitality or less), D4 adjacency keyword, D5 Rift Tides (opt-in variant mode), D6 Elemental Reactions. D1 and D2 were tested; see 03. |
| Watch in playtest | Arc Runner 4/3 for 2 Essence is above the cost curve but measured balanced. Also check how Second Wind, Rally Ward, Root Keeper and Grove Beast (+2 per Growth) feel. |
| Other audit leftovers (#103) | Riptide's damage mode fires on about 8% of casts; Burning pays off about 0.28× per application (about 0 in Magma); 60–91% of duels reach Exhaustion. No proposal yet. |

## Housekeeping

- 9 Oct (first chat): closed finished issues; **#99** stays open as the balance plan.
- 9 Oct (second chat): **#103** stays open until the step-2 package is decided and built.
