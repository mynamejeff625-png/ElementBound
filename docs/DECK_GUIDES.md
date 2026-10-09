# How this deck wins: deck guides

The source text for the "How this deck wins" sheet in the Codex and deck
select (phase 2f-2). `js/deckGuides.js` holds the same text as data, and
`tests/deck-guides-1.8.1.cjs` keeps the two identical. Rules claims match
`lib/cardCatalog.js` and `lib/matchFactory.js` as of 1.14.0: each Prime deck holds
two Techniques, and a Hybrid deck holds
8 cards from each parent element plus its own Hybrid cards, and uses one
parent's Response.

**Format:** each deck has an Archivist line, a three-step plan, three key
cards, one combo to look for (cards and effects joined by "→"), and one warning.
The Archivist's voice follows `docs/TOME.md` §0.5.

---

## FIRE
- **Archivist:** "Fire wins before the rival is ready. Count their Vitality, not your cards."
- **Plan:**
  1. Open with Cinder Adept or Searing Brand: the rival starts Burning.
  2. Cash it in: Flare Hawk hits a Burning target for +1, and Flame Burst deals 3 instead of 2.
  3. Keep Ember Guard on the field so their attacks can't reach your Bender.
- **Key cards:** Cinder Adept, Flare Hawk, Flame Burst
- **Combo:** Cinder Adept → Burning → Flame Burst
- **Watch out:** A rival Guard keeps you off their Bender. Burn the Guard down first; Flame Burst can target it.

## WATER
- **Archivist:** "Water doesn't race. It makes every attack against it worth less."
- **Plan:**
  1. Soak their biggest attacker before it swings, with Current Shift or River Serpent.
  2. Hold the line with Tide Warden: it has Guard, and it Flows each time it is hit.
  3. Riptide finishes a Soaked enemy for 2. Use Flow to keep the card you need on top.
- **Key cards:** River Serpent, Tide Warden, Current Shift
- **Combo:** Current Shift → Soaked → their next hit −2
- **Watch out:** Soaked only weakens a direct attack. Technique damage and other indirect damage still land in full.

## EARTH
- **Archivist:** "Earth doesn't need to win quickly. It only needs you to run out first."
- **Plan:**
  1. Put Earthen Guard down early: Guard on a 5-health body.
  2. Armor the attacker that matters, with Stone Initiate or Fortify.
  3. Turn Armor into damage: Boulder Ram with Armor hits for +1, and Stone Fist hits for 1 plus its Armor.
- **Key cards:** Earthen Guard, Boulder Ram, Fortify
- **Combo:** Fortify → Armor → Boulder Ram attacks +1
- **Watch out:** Armor is gone at round end, and each Manifestation gains it only once per round. Give it on the turn you need it.

## NATURE
- **Archivist:** "Nature loses the first turns on purpose. Count its board on the fourth."
- **Plan:**
  1. Summon the Manifestation you want to grow, then Seed it with Sproutling or Wild Growth.
  2. Wild Growth Seeds and grows at once; Verdant Mend grows a Seeded Manifestation. Healing Root Keeper grows it too.
  3. Grove Beast with Growth is your finisher: +2 ATK for each Growth, up to 3.
- **Key cards:** Wild Growth, Verdant Mend, Grove Beast
- **Combo:** Wild Growth → Seeded → Verdant Mend → Growth
- **Watch out:** Nature starts slow. Second Bloom heals each Manifestation only once per duel, so spend it on the one you are growing.

## LIGHTNING
- **Archivist:** "Three cards in the right order beat three stronger cards in the wrong one."
- **Plan:**
  1. Play several Prime cards in one turn. Each one raises your Chain.
  2. Make Spark Runner your second card for +1 Chain, or Static Step your second card to Charge the rival Bender.
  3. With Volt Lynx already on the field, reach Chain 3 and attack: +2 damage.
- **Key cards:** Spark Runner, Static Step, Volt Lynx
- **Combo:** Static Step → Spark Runner → Volt Lynx attacks +2
- **Watch out:** The Chain resets every turn, and a new Manifestation can't attack on the turn it arrives. Summon Volt Lynx a turn early.

## AIR
- **Archivist:** "Air's strength lasts one round. Whatever you don't spend, the wind takes back."
- **Plan:**
  1. Get Sky Raptor onto the field.
  2. Next turn, give it Momentum with Crosswind, Downdraft or Breeze Disciple.
  3. With Momentum, Sky Raptor attacks the Bender straight past Guard.
- **Key cards:** Sky Raptor, Crosswind, Breeze Disciple
- **Combo:** Crosswind → Momentum → Sky Raptor ignores Guard
- **Watch out:** Momentum is gone at round end. Build it and attack in the same turn.

## MAGMA
- **Archivist:** "Fire that refuses to burn out. It pushes forward and does not fall when struck back."
- **Plan:**
  1. Turn on Resonance: play a Fire card and an Earth card in the same turn.
  2. Molten Channel then does both: Armor for a friend and Burning on a damaged enemy.
  3. Obsidian Ravager turns spare Armor into Burning as it attacks, and Pressure Forge hits a Burning enemy.
- **Key cards:** Obsidian Ravager, Molten Channel, Pressure Forge
- **Combo:** Fire card + Earth card → Resonance → Molten Channel
- **Watch out:** Hybrid cards don't count toward Resonance. Save Essence for one Fire card, one Earth card and the payoff.

## BLOOM
- **Archivist:** "Water buys the time. Nature spends it on growing."
- **Plan:**
  1. Seed early, with Rainseed or Sproutling.
  2. Turn on Resonance with a Water card and a Nature card: Rainseed then grants Growth, and Flourishing Current heals and grows.
  3. Tidelily Guardian heals an ally each time it grows during Resonance, and Reclaiming Tide saves a grown Manifestation from a lethal hit.
- **Key cards:** Tidelily Guardian, Rainseed, Reclaiming Tide
- **Combo:** Water card + Nature card → Resonance → Rainseed
- **Watch out:** Flourishing Current does nothing without Resonance. Don't play it alone.

## STORM
- **Archivist:** "Charge it, move it, strike before the round ends. Storm doesn't wait for a second chance."
- **Plan:**
  1. Turn on Resonance with a Lightning card and an Air card.
  2. Move Tempest Striker to another slot with Crosswind Spark or Thunderstep: its next attack gets +1, and during Resonance it ignores Guard.
  3. During Resonance, Crosswind Spark also Charges, and Thunderstep then deals 1 from a Charged or Momentum ally.
- **Key cards:** Tempest Striker, Crosswind Spark, Thunderstep
- **Combo:** Crosswind Spark → Tempest Striker moves → attack +1
- **Watch out:** Every move needs an empty slot. Keep one of your three slots open.
