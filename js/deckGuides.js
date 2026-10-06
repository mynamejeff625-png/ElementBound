/* How this deck wins: generated from docs/DECK_GUIDES.md (kept identical by tests/deck-guides-1.8.1.cjs). */
(function(root,data){
  if(typeof module==='object'&&module.exports)module.exports=data;
  if(root)root.EB_DECK_GUIDES=data;
})(typeof globalThis!=='undefined'?globalThis:this,Object.freeze({
 "FIRE": {
  "archivist": "\"Fire wins before the rival is ready. Count their Vitality, not your cards.\"",
  "plan": [
   "Open with Cinder Adept: the rival Bender starts Burning.",
   "Cash it in: Flare Hawk hits a Burning target for +1, and Flame Burst deals 3 instead of 2.",
   "Keep Ember Guard on the field so their attacks can't reach your Bender."
  ],
  "key": [
   "Cinder Adept",
   "Flare Hawk",
   "Flame Burst"
  ],
  "combo": [
   "Cinder Adept",
   "Burning",
   "Flame Burst"
  ],
  "watch": "A rival Guard keeps you off their Bender. Burn the Guard down first; Flame Burst can target it."
 },
 "WATER": {
  "archivist": "\"Water doesn't race. It makes every attack against it worth less.\"",
  "plan": [
   "Soak their biggest attacker before it swings, with Current Shift or River Serpent.",
   "Hold the line with Tide Warden: it has Guard, and it Flows each time it is hit.",
   "Use Flow to keep the card you need on top instead of drawing blind."
  ],
  "key": [
   "River Serpent",
   "Tide Warden",
   "Current Shift"
  ],
  "combo": [
   "Current Shift",
   "Soaked",
   "their next hit −2"
  ],
  "watch": "Soaked only weakens a direct attack. Technique damage and other indirect damage still land in full."
 },
 "EARTH": {
  "archivist": "\"Earth doesn't need to win quickly. It only needs you to run out first.\"",
  "plan": [
   "Put Earthen Guard down early: Guard on a 5-health body.",
   "Armor the attacker that matters, with Stone Initiate or Fortify.",
   "Boulder Ram with Armor hits for +1. Trade slowly and let the rival run out."
  ],
  "key": [
   "Earthen Guard",
   "Boulder Ram",
   "Fortify"
  ],
  "combo": [
   "Fortify",
   "Armor",
   "Boulder Ram attacks +1"
  ],
  "watch": "Armor is gone at round end, and each Manifestation gains it only once per round. Give it on the turn you need it."
 },
 "NATURE": {
  "archivist": "\"Nature loses the first turns on purpose. Count its board on the fourth.\"",
  "plan": [
   "Summon the Manifestation you want to grow, then Sproutling to Seed it.",
   "Verdant Mend gives a Seeded Manifestation Growth. Healing Root Keeper grows it too.",
   "Grove Beast with Growth is your finisher: +1 ATK for each Growth, up to 3."
  ],
  "key": [
   "Sproutling",
   "Verdant Mend",
   "Grove Beast"
  ],
  "combo": [
   "Sproutling",
   "Seeded",
   "Verdant Mend",
   "Growth"
  ],
  "watch": "Nature starts slow. Second Bloom heals each Manifestation only once per duel, so spend it on the one you are growing."
 },
 "LIGHTNING": {
  "archivist": "\"Three cards in the right order beat three stronger cards in the wrong one.\"",
  "plan": [
   "Play several Prime cards in one turn. Each one raises your Chain.",
   "Make Spark Runner your second card for +1 Chain, or Static Step your second card to Charge the rival Bender.",
   "With Volt Lynx already on the field, reach Chain 3 and attack: +2 damage."
  ],
  "key": [
   "Spark Runner",
   "Static Step",
   "Volt Lynx"
  ],
  "combo": [
   "Static Step",
   "Spark Runner",
   "Volt Lynx attacks +2"
  ],
  "watch": "The Chain resets every turn, and a new Manifestation can't attack on the turn it arrives. Summon Volt Lynx a turn early."
 },
 "AIR": {
  "archivist": "\"Air's strength lasts one round. Whatever you don't spend, the wind takes back.\"",
  "plan": [
   "Get Sky Raptor onto the field.",
   "Next turn, give it Momentum with Crosswind or Breeze Disciple.",
   "With Momentum, Sky Raptor attacks the Bender straight past Guard."
  ],
  "key": [
   "Sky Raptor",
   "Crosswind",
   "Breeze Disciple"
  ],
  "combo": [
   "Crosswind",
   "Momentum",
   "Sky Raptor ignores Guard"
  ],
  "watch": "Momentum is gone at round end. Build it and attack in the same turn."
 },
 "MAGMA": {
  "archivist": "\"Fire that refuses to burn out. It pushes forward and does not fall when struck back.\"",
  "plan": [
   "Turn on Resonance: play a Fire card and an Earth card in the same turn.",
   "Molten Channel then does both: Armor for a friend and Burning on a damaged enemy.",
   "Obsidian Ravager turns spare Armor into Burning as it attacks, and Pressure Forge hits a Burning enemy."
  ],
  "key": [
   "Obsidian Ravager",
   "Molten Channel",
   "Pressure Forge"
  ],
  "combo": [
   "Fire card + Earth card",
   "Resonance",
   "Molten Channel"
  ],
  "watch": "Hybrid cards don't count toward Resonance. Save Essence for one Fire card, one Earth card and the payoff."
 },
 "BLOOM": {
  "archivist": "\"Water buys the time. Nature spends it on growing.\"",
  "plan": [
   "Seed early, with Rainseed or Sproutling.",
   "Turn on Resonance with a Water card and a Nature card: Rainseed then grants Growth, and Flourishing Current heals and grows.",
   "Tidelily Guardian heals an ally each time it grows during Resonance, and Reclaiming Tide saves a grown Manifestation from a lethal hit."
  ],
  "key": [
   "Tidelily Guardian",
   "Rainseed",
   "Reclaiming Tide"
  ],
  "combo": [
   "Water card + Nature card",
   "Resonance",
   "Rainseed"
  ],
  "watch": "Flourishing Current does nothing without Resonance. Don't play it alone."
 },
 "STORM": {
  "archivist": "\"Charge it, move it, strike before the round ends. Storm doesn't wait for a second chance.\"",
  "plan": [
   "Turn on Resonance with a Lightning card and an Air card.",
   "Move Tempest Striker to another slot with Crosswind Spark or Thunderstep: its next attack gets +1, and during Resonance it ignores Guard.",
   "During Resonance, Crosswind Spark also Charges, and Thunderstep then deals 1 from a Charged or Momentum ally."
  ],
  "key": [
   "Tempest Striker",
   "Crosswind Spark",
   "Thunderstep"
  ],
  "combo": [
   "Crosswind Spark",
   "Tempest Striker moves",
   "attack +1"
  ],
  "watch": "Every move needs an empty slot. Keep one of your three slots open."
 }
}));
