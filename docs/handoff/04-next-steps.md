# 04 · Next steps

## Where we left off (9 Oct, main @ 1.17.0)

- Deck balance: 9/9 in 45–55%, guarded by `tests/deck-band-1.13.1.cjs` (200 seeds).
- Issue **#103** is complete:
  - the audit (step 1);
  - 1.13.2 (rules parity);
  - 1.14.0 (Growth payoffs);
  - the step-2 package in 1.15.0 (Hybrid planner), 1.16.0 (Charged, Storm extras) and 1.17.0 (second-player mulligan).
- No task is in progress. Ask the Owner what's next. Candidates are in the backlog below.

## Watch in playtest (first)

- **Air at the band edge (45.2–45.8% in the Lab):** watch real games. If a fix is needed, use a deck-list or rule lever; ±1 stats overshoot.
- **The online mulligan:** never tested on two real devices. Check that the panel appears for the second seat, the rival sees only the count, and a race with the first player's move resends cleanly.
- **The Hard rival's Hybrid play:** it should visibly build Resonance before casting payoffs.
- **Charged:** your next Lightning attack after a second-card Static Step should get +1 on any target.

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
| Watch in playtest | Check how Second Wind, Rally Ward, Root Keeper, Grove Beast (+2 per Growth), the any-Lightning Charged release and the second-player mulligan feel. Air sits at the band edge (about 45%). |
| Other audit leftovers (#103, not proposed yet) | Riptide's damage mode fires on about 8% of casts; Burning pays off about 0.28× per application (about 0 in Magma); 60–91% of duels reach Exhaustion. No proposal yet. |

## Housekeeping

- 9 Oct (first chat): closed finished issues; **#99** stays open as the balance plan.
- 9 Oct (second chat): **#103** stays open until the step-2 package is decided and built.
