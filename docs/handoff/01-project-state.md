# 01 · Project state (main @ 1.13.1, 9 Oct 2026)

`main` = PR #101 merged. No open PRs. Working tree clean.

## Release identifiers (`js/version.js`)

| Field | Value |
|---|---|
| version / label | `1.13.1` · "Even Decks" |
| engine | `EB-1.4.0` |
| ruleset | `EB-RULES-1.13.1-BALANCE-PASS` |
| balanceLab | `Balance Lab XXV` |

Bump `ruleset` and `balanceLab` on any rule or stat change. `tests/crosswind-attack-debuff-0.8.62.cjs` pins both on purpose; update that pin with a one-line reason.

## The duel, as it plays now

- **Benders:**
  - 30 Vitality;
  - Essence 2, +1 per round, up to 7;
  - opening hand 4;
  - 3 field slots;
  - draw 1 card at the start of each turn.
- **Rounds:** a round ends when the turn returns to the Bender who started the duel. That's when round effects end (Armor, Momentum, Charged). Live single-player was fixed to match in 1.11.1.
- **Who goes first:** the first player is chosen at random. The second player gets the **Initiation Token**, one free Response.
- **Combat:**
  - A Manifestation can't attack on the turn it enters (summoning sickness).
  - The attacker picks any enemy Manifestation, or the Bender if no Guard stands. Sky Raptor with Momentum, and Tempest Striker after moving under Resonance, bypass Guard.
  - **Attacks are free:** a defender never hits back.
  - Lethal overflow from an attack spills to the Bender unless a Guard stood at impact. Technique damage never overflows.
- **Responses:**
  - Each deck has one Response card. Hybrids choose one parent's Response at deck select.
  - The Initiation Token can pay for a Response instead.
  - Online, the Response window is 10 s, and Auto-pass skips token-only windows.
- **Running out of cards (1.11.1):**
  - An empty Hand and Deck does **not** end the duel; only 0 Vitality does.
  - Each draw from an empty Deck deals Exhaustion: 2, then 3, 4, …, counted per Bender in `p.exhaustion`.
  - There is no Card Depletion loss any more. The Tome's Card Depletion page explains this.
- **Rally Ward (1.12.0):**
  - From round 2, a Manifestation summoned onto your **empty** field while the rival has Manifestations gets the `Warded` mark until your next turn begins.
  - A Warded Manifestation can't be attacked, and Slipstream can't redirect onto it.
  - Techniques still reach it, and a Warded Guard still guards.
  - Trials are excluded.
- **Second Wind (1.13.0):**
  - From round 2, at turn start after the normal draw: if you have fewer Manifestations than the rival **and** (2 or fewer cards in hand **or** 2+ fewer Manifestations), draw 1 extra card.
  - It never draws from an empty Deck.
  - Online it adds a `SECOND_WIND` event; both draws stay private `DRAW` events.
- **Online only:** 60 s turn timer, server clock only; it turns red and blinks at 10 s or less, and pauses during Response windows.

## Decks (21 cards each)

| Deck | Units (cost ATK/HP) | Techniques (copies) | Response |
|---|---|---|---|
| Fire · Blazing Fist | Cinder Adept 1c 1/2, Ember Guard 2c 2/3 Guard, Flare Hawk 3c 3/3 | Flame Burst 2c (5), **Searing Brand** 1c (2) | Backdraft |
| Water · Shifting Tide | Mist Adept 1c 1/3, Tide Warden 2c 2/4 Guard, River Serpent 3c 2/4 | Current Shift 1c (4), **Riptide** 2c (3) | Undertow |
| Nature · Living Path | Sproutling 1c 1/3, Root Keeper 2c 2/4, Grove Beast 4c 2/5 | Verdant Mend 2c (4), **Wild Growth** 2c (3) | Second Bloom |
| Earth · Iron Mountain | Stone Initiate 1c 1/3, Earthen Guard 2c 1/5 Guard, Boulder Ram 3c 3/5 | Fortify 2c (4), **Stone Fist** 2c (3) | Stonewall |
| Lightning · Flash Circuit | Spark Runner 1c 2/2, **Arc Runner 2c 4/3** (1.13.1), Volt Lynx 3c 3/3 | Static Step 1c (5), **Recharge** 1c (2) | Flash Step |
| Air · Dancing Gale | Breeze Disciple 1c 1/3, Gale Scout 2c 2/3, Sky Raptor 3c 3/3 | Crosswind 1c (4), **Downdraft** 1c (3) | Slipstream |
| Magma (Fire+Earth) | 8 Fire + 8 Earth cards (7 units + 1 first Technique each) + Molten Channel, **Obsidian Ravager 4c 4/5**, Pressure Forge, Eruption Guard | Hybrids use only each parent's *first* Technique | choose Backdraft or Stonewall |
| Storm (Lightning+Air) | 8 + 8 + Crosswind Spark, **Tempest Striker 3c 3/3**, Thunderstep, Static Reversal | " | Flash Step or Slipstream |
| Bloom (Water+Nature) | 8 + 8 + Rainseed, **Tidelily Guardian 4c 2/5**, Flourishing Current, Reclaiming Tide | " | Undertow or Second Bloom |

- **Prime decks:** 13 units (the 3 types cycle), 7 Techniques (the first and second Technique split as shown) and 1 Response.
- **Second Techniques:** shown in bold. They are new in 1.11.0, defined in `TECH2` in `lib/cardCatalog.js`, and resolved by name before the element dispatch on every surface.
- **Hybrid Resonance:** a Hybrid deck turns on Resonance when it plays a card from each parent in the same turn. Its own Techniques do more under Resonance.
- **Rival difficulty:** Easy (`'Easy'`), Medium (`'Medium'`), Hard (internally `'Difficult'`). The Balance Lab chooses cards like Hard.

## Where things live (additions to AGENTS.md §3)

- `js/arena.js` / `css/arena.css`: the Arena duel field, default since 1.10.0 (`?arena=0` = classic layout).
  - Fan hand, drag to summon or cast, aim arcs with damage preview, the choice panel that replaces `modal()` in the duel, the combo language (`PAYOFFS` map), the Reserve, the Chronicle and terrain.
  - `STATUS_INFO` defines the word-and-glyph status chips, including `Warded`.
- `assets/icons.svg`: the status glyph set, including `warded` (1.12.0).
- `js/tome.js`, `js/tomeData.js`, `js/tomeLessons.js`, `docs/TOME.md`: How to Play (the Bender's Tome).
  - `tomeData.js` must mirror `TOME.md`; `tests/tome-1.7.0.cjs` checks this, including page order, counts (64 pages, 33 before Effects at a Glance), synonyms and allowed quick-fact values.
  - Element pages list both Techniques.
- `js/cardBrowser.js` / `js/codex.js`: the Codex and the card finder. `deckCards()` includes `TECH2`.
- `js/deckGuides.js` must mirror `docs/DECK_GUIDES.md`; `tests/deck-guides-1.8.1.cjs` checks this.
- `tools/balance/`: analysis scripts (not in CI). See its README.
- In `js/game.js`:
  - `runEBVerification()` is the in-game System Check (111 items). The phone smoke now runs it and fails on any failure (1.11.1).
  - `EB_BALANCE` is the simulator. `EB_BALANCE.EXPERIMENTS` holds the Lab's rule experiments: B1 Strike Back, B2 Arrival Ward, B2-lite Arrival Shield, D1 Bender Arts, D2 Ascension.

## Balance status (Balance Lab, Hard rival, 81 matchups)

1.13.1, two fresh 200-seed sets:

| Fire | Water | Nature | Earth | Lightning | Air | Magma | Storm | Bloom | Spread |
|---|---|---|---|---|---|---|---|---|---|
| 47.6 / 48.3 | 50.6 / 51.9 | 46.9 / 47.3 | 52.4 / 50.9 | 53.7 / 50.9 | 46.9 / 49.2 | 53.8 / 52.4 | 51.1 / 51.9 | 47.1 / 47.3 | 6.9 / 5.1 |

| Snowball and presence metric | 1.13.1 | Before this round (1.11.0) |
|---|---|---|
| +1 Manifestation at the start of your turn wins | 82% | 93% |
| −2 Manifestations wins | 17.5% | 11% |
| Win rate after falling 2+ units behind | 38% | 17% |
| First to a full field (3 units) wins | 57% | 62.7% (measured on 1.12.0) |
| Both fields occupied (round 3+ turns) | 86% | 60% |
| One-sided duels | 0% | 28% |
| First player wins | 54% | 60% |
| Average rounds | 16.2 | 14.4 |

**CI gate:** `tests/deck-band-1.13.1.cjs` fails if any deck leaves 45–55% (fixed seeds, deterministic).
