# 04 · Next steps

## Where we left off

Deck-level balance is done: 9/9 decks in 45–55% (1.13.1), guarded in CI.

The Owner's next goal is balance **inside** the decks: "distribute evenness throughout cards, effects and combos for equality on the technical side, while ensuring **skill is the primary factor** for improving."

The Owner chose to start with a **card, effect and combo audit**. It is analysis first: post a report, the Owner picks fixes, then build.

## Step 1 · Card, effect and combo audit (analysis only, no game changes)

**Goal:** find any single card, effect or combo that decides duels on its own, or that almost never matters. Then confirm that decisions, not draws, drive results.

### 1a · Instrument (in `tools/balance/`, through harness patches; don't touch the game)

Record per duel and seat:
- cards drawn;
- cards played, with the turn played;
- for each Technique cast: whether it changed the state (a fizzle check);
- effect applications and payoffs;
- combo set-up → payoff completions;
- Responses offered, used and cancelled;
- for each Manifestation: lifespan, damage dealt and whether it attacked.

Hooks that already exist in the simulator:
- `metrics.cards` (play counts) and `metrics.effects` (named effects: Burning applied, Overflow, Growth, Rally Ward blocked, Second Wind…);
- `simCombo()` (the combo counter);
- `metrics.responses`;
- `metrics.initiative.removedBeforeFirstAttack` and `preAttackRemovalBySource`.

The draw log needs a new patch on `draw(st,i)` and the opening hand.

### 1b · Report these tables (150–200 seeds, Hard rival)

1. **Cards, per deck:**
   - copies;
   - share of drawn copies that get played;
   - average play turn;
   - **win rate when drawn vs when not drawn**, and the gap from the deck's average;
   - for units: died-before-attacking %, average lifespan, damage per Essence;
   - for Techniques: fizzle %.
2. **Effects:** applications per duel and **payoff conversion**. For example: Burning applied → Burning bonus dealt; Seeded → Growth gained; Soaked → damage prevented; Charged → released; Armor → damage blocked; Momentum → bonus damage; Weakened; Warded → attacks blocked.
3. **Combos:**
   - for each deck's combo chain (Arena `PAYOFFS` map, `docs/DECK_GUIDES.md`): completion rate, and win rate when completed vs not;
   - for Hybrids: how often Resonance switches on.
4. **Outliers to flag:**
   - a drawn win-rate gap above ±5 points;
   - Technique fizzle above 35%;
   - combo completion below 30%;
   - any card played in under 50% of the duels where it's drawn.

### 1c · Skill expression

- Add an **Easy-style card chooser** to the Lab: random legal play, like the live Easy rival.
- Report each deck's **Hard vs Easy win rate**, in both seats. A large gap means skill matters for that deck; a small gap means the deck nearly plays itself.
- Hard vs Hard stays the 50% baseline.
- Optionally add a Medium chooser as well, matching live Medium's 40% second-best pick.

### 1d · Deliver

Post the report as one GitHub issue. Lead with a short summary and the top 5 findings, then 2–4 proposed fixes, each with predicted numbers. Ask the Owner which to build. Stay within the limits: ±1 ATK or HP per card; card text changes need explicit approval.

### 1e · Build (after the Owner picks)

- Rules or stats go to every surface (AGENTS.md §4: catalog, live, AI, Lab, engine, views).
- Keep `tests/deck-band-1.13.1.cjs` green; rename or extend it if the band check moves.
- Bump `ruleset` and `balanceLab`, and update the crosswind pin.
- Include a focused test, run the full suite, the phone smoke and CI, and link the CI runs and screenshots in the PR.

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
| Watch in playtest | Arc Runner 4/3 for 2 Essence is above the cost curve but measured balanced. Also check how Second Wind and Rally Ward feel. |

## Housekeeping done at handoff (9 Oct)

- Closed issues whose work is merged: #51, #53, #55, #56, #57, #60, #64, #81, #83, #88, #91, #93, #95, #96. Each got a closing note; the unbuilt parts of #55 and #81 are listed in the backlog above.
- **#99 stays open** as the live balance plan.
