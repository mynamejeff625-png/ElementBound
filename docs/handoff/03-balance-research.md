# 03 · Balance research: findings, metrics, what was tried

Every number comes from the Balance Lab simulator (`EB_BALANCE` in `js/game.js`), run through `tools/balance/`.
"Seeds" = duels per directional matchup (81 matchups), so 150 seeds = 12,150 duels.
The rival AI is Hard-level card choice in both seats.

## Metric definitions

| Metric | Definition |
|---|---|
| Deck win rate | Wins ÷ duels for that deck across all 81 matchups, both seats |
| Spread | Best deck win rate − worst deck win rate |
| In band | Number of decks between 45% and 55% |
| First player | Win rate of the seat that started the duel |
| +1 / −1 / −2 wins | Win rate of the active Bender by Manifestation difference at the start of its own turn, round 3+ |
| Comeback | Win rate of Benders who were 2+ Manifestations behind at some point in round 3+ |
| First to 3 | Win rate of the Bender who first had a full field (3 Manifestations) |
| Contested | Share of round 3+ turn starts where both fields hold at least one Manifestation |
| One-sided | Duels where a field was empty for more than half of the round 3+ turn starts |
| Rounds | Average round count; the duel-length proxy. The Owner's target is 3–8 minutes |

**Noise:** about ±2 points per deck at 40 seeds, ±1 at 150, a little less at 200. Compare variants on the same seed tag, then verify on a fresh tag.

## What shipped and why

| Step | Result |
|---|---|
| 1.10.3 · Lab mirrors the Hard rival's card choice | The old flat Technique score cast useless Techniques. Nature's weakness turned out to be real. |
| 1.11.0 · Second Technique per Prime | Spread 14.7 → 9.4. Nature 42 → 49, Earth 42 → 47. |
| 1.11.1 · Growing Exhaustion, no Depletion loss, live round fix | Online and single-player parity. Depletion endings 32% → 0%. |
| 1.12.0 · Rally Ward (round 2+) | Contested 60 → 79%, one-sided 28 → 0.6%, comeback 17 → 26%, spread 9.8, first player 54%. |
| 1.13.0 · Second Wind (low hand or 2+ behind) | +1 wins 91 → 82%, −2 wins 8 → 18%, comeback 27 → 38%, first to 3: 63 → 57%, rounds 17 → 16.3. Lightning fell to 43%. |
| 1.13.1 · Arc Runner 3/3 → 4/3 | 9/9 decks in band; spread 5.1–6.9. |

## The snowball, explained (#95, #99)

- **Attacks are free.** The defender never hits back, so each extra unit is an extra free hit. On a level field, whoever acts first wins about 75%.
- **Summoning sickness is one-sided.** New units can't attack but can be attacked, so the leader removes them before they act. On 1.11.0, 41–70% of units died before ever attacking: Lightning 70%, Fire 65%, Storm 63%. On 1.12.0 that fell to 22–40%.
- **Card drain.** The trailing side spends about one card a turn on replacements. Before Second Wind, an empty-field side held about 1 playable card against the rival's 3.8.
- **An empty field leaves the Bender open.** 40% of all Bender damage landed on empty fields before Rally Ward; 25% after.
- **Still true on 1.13.1:** +1 at the start of your turn wins about 82%. The remaining root cause is free attacks; no rule addresses it yet.

## Tried and not shipped

| Idea | Result | Verdict |
|---|---|---|
| Strike Back (defender always hits back) | Comeback 41%, but spread 41 (Water 31%, Earth 64%) | Needs a full stat redesign. Rejected for now. |
| Survivor strike-back | Spread 33–35 | Same as above |
| Arrival Ward (every new unit protected) | Contested 89%, but spread 32 and long duels | Too strong; Rally Ward is the targeted version |
| Arrival Shield (−1 damage to new units) | Spread 21 | Rejected |
| Rally Draw (+1 card on an empty field), before 1.11.1 | Deck-outs 89% | Superseded by Second Wind |
| Rally Essence (+1 Essence when behind) | No effect: Essence isn't the bottleneck | Rejected |
| Wake Rally (return the last fallen unit to hand) | Spread 16–49 depending on trigger | Rejected |
| D1 Bender Arts (hero-power style) | +1 still wins 89%; spread 17 | No snowball effect |
| D2 Ascension (combo and comeback gauge) | Did nothing measurable | Rejected as a balance tool; might return as a feel feature |
| Command limit (2 attacks a turn) | +1 wins 86%; Air 65% | Weak, and hurts Air |
| Exposed (attacker takes +1 until its next turn) | Nature 36% | Rejected |
| Guard taunt | Earth and Magma about 65% | Rejected |
| **Facing lanes, strict** (attack across; an empty lane hits the Bender) | On 1.13.0: +1 wins 78%, −2 wins 24%, comeback 44%, first to 3: 52%, **spread 45.6** (Earth and Magma about 70%, Fire and Lightning 25–30%) | **Parked.** Its value is depth (positioning, movement cards matter); balance would need a redesign |
| Lanes, open / adjacent / Guard-intercept / Reach variants | Adjacent + Reach (Fire, Lightning): spread 13.6, small snowball gain | Parked with the above |

**Stat-pass alternative kept for reference:** Spark Runner 2/2 → 2/3 also gives 9/9 in band, with a spread of 8–8.7 and Storm at the 55% edge.

## Known simulator limits

- **Placement:** the Lab places Manifestations in the first empty slot. Real players place on purpose, which matters most for lane-style ideas.
- **Flame Burst overflow:** the Lab lets Flame Burst damage overflow to the Bender; live play and the engine don't. Measured: no effect on win rates.
- **Online Flow:** the online client never sends a Flow choice, so Current Shift, Static Step, Mist Adept, Tide Warden and Recharge always keep the top card online. The Lab's Flow sends the top card to the bottom 35% of the time. This is a known gap, not yet fixed.
- **No skill axis yet:** Easy and Medium rivals have never been measured, so there is no skill-expression data so far.
