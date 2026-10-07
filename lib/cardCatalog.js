(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.ElementBoundCards=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const E={FIRE:'🔥',WATER:'💧',NATURE:'🌿',EARTH:'🪨',LIGHTNING:'⚡',AIR:'🌪️',MAGMA:'🌋',STORM:'🌩️',BLOOM:'🌱'};

  const HYBRIDS={MAGMA:{parents:['FIRE','EARTH'],name:'Magma',style:'Durable Pressure'},STORM:{parents:['LIGHTNING','AIR'],name:'Storm',style:'Mobile Tempo'},BLOOM:{parents:['WATER','NATURE'],name:'Bloom',style:'Scaling Sustain'}};

  const INFO={FIRE:['Blazing Fist','Pressure · Burning','Aggressive damage and finishers'],WATER:['Shifting Tide','Control · Soaked','Flow and battlefield manipulation'],NATURE:['Living Path','Growth · Seeded','Healing and scaling boards'],EARTH:['Iron Mountain','Defense · Armor','Armor, Guard and attrition'],LIGHTNING:['Flash Circuit','Combo · Charged','Fast Chains and sequencing'],AIR:['Dancing Gale','Tempo · Momentum','Movement and tactical attacks'],MAGMA:['Magma','Fire + Earth · Resonance','Burning, Armor and durable pressure'],STORM:['Storm','Lightning + Air · Resonance','Movement, Charged and tempo'],BLOOM:['Bloom','Water + Nature · Resonance','Seeded, Growth and sustain']};

  const BASE={
  FIRE:[['Cinder Adept',1,1,2,'On summon: apply Burning to the enemy Bender.','Early setup body. Burning powers Fire payoffs.'],['Ember Guard',2,2,3,'Guard.','Protects your Bender while establishing a durable attacker.'],['Flare Hawk',3,3,3,'When this attacks a Burning target, it gets +1 ATK for that attack.','Fire finisher that rewards setting up Burning first.']],
  WATER:[['Mist Adept',1,1,3,'On summon: Flow 1.','Smooths your next draw and gives Water a stable opener.'],['Tide Warden',2,2,4,'Guard. When damaged, Flow 1.','Defends while improving future draws.'],['River Serpent',3,2,4,'When this damages a Manifestation, apply Soaked.','Sets up Water control effects.']],
  NATURE:[['Sproutling',1,1,3,'On summon: give another friendly Manifestation Seeded.','Seed an established ally such as Grove Beast so Verdant Mend can convert that setup into Growth. If no other ally is present, the summon still resolves but Seeded is not applied.'],['Root Keeper',2,2,4,'When healed, gain 1 Growth, max 3.','Turns healing into permanent board development.'],['Grove Beast',4,2,5,'Gets +1 ATK for each Growth on it.','Late payoff for building Growth.']],
  EARTH:[['Stone Initiate',1,1,3,'On summon: give another friendly Manifestation 1 Armor until round end. A Manifestation can gain Armor only once per round.','Redistribute temporary Earth defense onto an ally that has not already gained Armor this round.'],['Earthen Guard',2,1,5,'Guard.','Protects your Bender while it remains on the field, even after it attacks.'],['Boulder Ram',3,3,5,'If it has Armor when it attacks, deal +1 damage.','Converts temporary Earth defense into pressure before that Armor is consumed or expires.']],
  LIGHTNING:[['Spark Runner',1,2,2,'If this is your second card played this turn, gain +1 Chain.','Chain accelerator: play it second to jump directly from Chain 2 to Chain 3.'],['Arc Runner',2,3,3,'At Chain 2+, this gets +1 ATK this turn.','A 3 ATK tempo attacker that rewards sequencing before combat.'],['Volt Lynx',3,3,3,'At Chain 3+, its first attack each turn deals +2 damage.','Fragile but explosive combo payoff.']],
  AIR:[['Breeze Disciple',1,1,3,'On summon: give another friendly Manifestation 2 Momentum, max 3, until round end.','Put temporary Momentum onto an established ally such as Sky Raptor before both Benders finish the round.'],['Gale Scout',2,2,3,'After Crosswind swaps two enemies, this gains 1 Momentum on its next attack that round.','Crosswind now always grants friendly Momentum; a successful swap also opens Gale Scout’s extra Momentum attack payoff.'],['Sky Raptor',3,3,3,'While it has Momentum, it may attack the Bender ignoring Guard.','Air pressure payoff: temporary Momentum lets Sky Raptor choose the rival Bender even while Guard is active.']]};

  const RESPONSES={
  FIRE:{n:'Backdraft',c:2,text:'After an enemy Manifestation damages one of your Manifestations, deal 2 damage to the attacker.',tip:'Retaliate after combat damage. The retaliation still resolves if the defender was destroyed.'},
  WATER:{n:'Undertow',c:2,text:'When one of your Manifestations is attacked, move it to another empty friendly slot. The attack is cancelled.',tip:'Reposition the defender before damage and make the declared attack fizzle.'},
  NATURE:{n:'Second Bloom',c:2,text:'When one of your Manifestations is attacked, heal a damaged friendly Manifestation for 1. Each Manifestation can be healed by Second Bloom only once per duel.',tip:'Stabilize a damaged ally that has not already received Second Bloom this duel.'},
  EARTH:{n:'Stonewall',c:2,text:'When one of your Manifestations is attacked, give a friendly Manifestation 1 Armor until round end if it has not gained Armor this round.',tip:'Each Manifestation can gain Armor only once per round.'},
  LIGHTNING:{n:'Flash Step',c:2,text:'When one of your Manifestations is attacked, deal 2 damage to the attacker before combat. If it is destroyed, the attack is cancelled.',tip:'Punish fragile attackers before they can connect.'},
  AIR:{n:'Slipstream',c:2,text:'When one of your Manifestations is attacked, swap it with another friendly Manifestation. The attack continues against the replacement.',tip:'Redirect an attack to a different ally.'}
  };

  const TECH={
  FIRE:['Flame Burst','Deal 2 damage. If the target is Burning, deal 3 instead.','Removal/pressure; set Burning first for maximum value.',2],
  WATER:['Current Shift','Flow 1. If an enemy Manifestation is present, apply Soaked to it.','Improves your next draw while setting up Water control.',1],
  NATURE:['Verdant Mend','If a friendly Manifestation is Seeded, give it 1 Growth, max 3.','Turns an established Nature body into a scaling threat.',2],
  EARTH:['Fortify','Give a friendly Manifestation 1 Armor until round end if it has not gained Armor this round.','Each Manifestation can gain Armor only once per round.',2],
  LIGHTNING:['Static Step','Flow 1. If this is your second card this turn, apply Charged to the enemy Bender.','A cheap Chain extender that rewards sequencing.',1],
  AIR:['Crosswind','Give a friendly Manifestation 1 Momentum, max 3, until round end. If two enemy Manifestations are present, also swap them and Weaken both (-1 ATK until destroyed).','Always builds temporary Air pressure; each successfully swapped enemy is Weakened once while it remains on the Field.',1]};

  // Each Prime deck's second Technique (issue #93): it works where the first one fizzles.
  // [name, text, tip, cost, copies]; a Prime deck holds (7 - copies) of TECH and copies of TECH2. Hybrid decks use TECH only.
  const TECH2={
  FIRE:['Searing Brand','Apply Burning to an enemy Manifestation and deal 1 damage to it. If the enemy has no Manifestations, apply Burning to the enemy Bender and deal 1 damage to it.','Cheap setup: Flame Burst and Flare Hawk hit a Burning target harder.',1,2],
  WATER:['Riptide','Choose an enemy Manifestation. If it is Soaked, deal 2 damage to it; otherwise apply Soaked to it.','Soak first, then Riptide again, or follow up after River Serpent hits.',2,3],
  NATURE:['Wild Growth','Give a friendly Manifestation Seeded and 1 Growth, max 3.','Seeds and grows in one card, so Verdant Mend always has a target later.',2,3],
  EARTH:['Stone Fist','Choose a friendly Manifestation. It deals 1 damage plus 1 per Armor it has to an enemy Manifestation. If the enemy has no Manifestations, it deals that damage to the enemy Bender.','Fortify first: Armor becomes damage. Armor is not used up.',2,3],
  LIGHTNING:['Recharge','Flow 1, then Flow 1 again.','A cheap Chain step that smooths your next draws.',1,2],
  AIR:['Downdraft','Give a friendly Manifestation 1 Momentum, max 3, until round end. If an enemy Manifestation is present, Weaken one (-1 ATK until destroyed).','Works against a single enemy, where Crosswind cannot swap.',1,3]};

  const HYBRID_CARDS={
  MAGMA:[
   {n:'Molten Channel',c:2,type:'TECHNIQUE',role:'SETUP',text:'Choose: give an eligible friendly Manifestation 1 Armor until round end, or apply Burning to an enemy Manifestation damaged this turn. Resonance — choose both.',tip:'A Manifestation can gain Armor only once per round; Resonance still combines eligible defense and pressure.'},
   {n:'Obsidian Ravager',c:4,type:'MANIFESTATION',a:4,h:5,role:'AVATAR',text:'Once per turn when this attacks during Resonance, you may remove 1 temporary Armor from another friendly Manifestation to apply Burning to the defender.',tip:'Turns temporary Armor into pressure before it expires.'},
   {n:'Pressure Forge',c:3,type:'TECHNIQUE',role:'PAYOFF',text:'Give an eligible friendly Manifestation 1 Armor until round end. Resonance — if an enemy is Burning, deal 1 damage to it.',tip:'A Manifestation can gain Armor only once per round; the Resonance damage is unchanged.'},
   {n:'Eruption Guard',c:2,type:'TECHNIQUE',role:'QUICK',text:'Choose a friendly Manifestation. Until your next turn, the next attack damage it takes is reduced by 1.',tip:'Pre-commit protection before the rival turn.'}],
  STORM:[
   {n:'Crosswind Spark',c:1,type:'TECHNIQUE',role:'SETUP',text:'Move a friendly Manifestation to an empty friendly slot and give it 1 Momentum, max 3, until round end. Resonance — it also becomes Charged until round end.',tip:'Repositions and prepares temporary Storm payoffs for the current round.'},
   {n:'Tempest Striker',c:3,type:'MANIFESTATION',a:3,h:3,role:'AVATAR',text:'Once per turn after this changes slots, its next attack this turn gets +1 ATK. Resonance — that attack may ignore Guard.',tip:'Storm avatar that converts movement into attack pressure.'},
   {n:'Thunderstep',c:2,type:'TECHNIQUE',role:'PAYOFF',text:'Move a friendly Manifestation to an empty slot. Resonance — if it is Charged or currently has Momentum, deal 1 damage to an enemy Manifestation.',tip:'Converts current-round movement setup into controlled damage.'},
   {n:'Static Reversal',c:2,type:'TECHNIQUE',role:'QUICK',text:'Choose a friendly Manifestation. Until your next turn, the first time it is attacked, move it to another empty friendly slot before combat if possible.',tip:'Pre-committed positional defense.'}],
  BLOOM:[
   {n:'Rainseed',c:2,type:'TECHNIQUE',role:'SETUP',text:'Give a friendly Manifestation Seeded; if already Seeded, heal it 1. Resonance — instead give it 1 Growth, max 3.',tip:'Builds Bloom resources without unrestricted healing.'},
   {n:'Tidelily Guardian',c:4,type:'MANIFESTATION',a:2,h:5,role:'AVATAR',text:'Resonance — the first time each turn this gains Growth, heal another damaged friendly Manifestation 1; if none is damaged, heal your Bender 1.',tip:'Its sustain trigger is active only while Bloom Resonance is active.'},
   {n:'Flourishing Current',c:3,type:'TECHNIQUE',role:'PAYOFF',text:'Resonance — heal a friendly Manifestation 1; if it is Seeded, also give it 1 Growth, max 3. Otherwise, no effect.',tip:'A Bloom payoff that resolves only while Resonance is active.'},
   {n:'Reclaiming Tide',c:2,type:'TECHNIQUE',role:'QUICK',text:'Choose a Seeded friendly Manifestation with Growth. Until your next turn, the first lethal attack removes Seeded and 1 Growth and leaves it at 1 HP.',tip:'A setup-dependent survival shield, not resurrection.'}]
  };


  /* One-line card effects (at most 28 characters) for small cards and the Codex list.
     Display text only: never read by rules code. Full rules stay in each card's text. */
  const SHORT=Object.freeze({
  "Cinder Adept":"Summon: Burn enemy Bender",
  "Ember Guard":"Guard",
  "Flare Hawk":"+1 ATK vs Burning",
  "Flame Burst":"2 damage · 3 if Burning",
  "Searing Brand":"Burn an enemy · 1 damage",
  "Backdraft":"Hit back for 2",
  "Mist Adept":"Summon: Flow 1",
  "Tide Warden":"Guard · Flow 1 when hit",
  "River Serpent":"Its hits Soak",
  "Current Shift":"Flow 1 · Soak an enemy",
  "Riptide":"Soak · 2 damage if Soaked",
  "Undertow":"Dodge: cancel the attack",
  "Sproutling":"Summon: Seed an ally",
  "Root Keeper":"Healed: +1 Growth",
  "Grove Beast":"+1 ATK per Growth",
  "Verdant Mend":"Seeded ally: +1 Growth",
  "Wild Growth":"Seed an ally · +1 Growth",
  "Second Bloom":"Heal an ally 1",
  "Stone Initiate":"Summon: an ally +1 Armor",
  "Earthen Guard":"Guard",
  "Boulder Ram":"+1 damage with Armor",
  "Fortify":"An ally +1 Armor",
  "Stone Fist":"Ally hits: 1 + its Armor",
  "Stonewall":"Attacked: an ally +1 Armor",
  "Spark Runner":"2nd card: +1 Chain",
  "Arc Runner":"Chain 2+: +1 ATK",
  "Volt Lynx":"Chain 3+: +2 damage",
  "Static Step":"Flow 1 · 2nd card: Charge",
  "Recharge":"Flow 1 twice",
  "Flash Step":"Strike the attacker first",
  "Breeze Disciple":"Summon: ally +2 Momentum",
  "Gale Scout":"Swap: +1 Momentum",
  "Sky Raptor":"Momentum: ignores Guard",
  "Crosswind":"+1 Momentum · swap foes",
  "Downdraft":"+1 Momentum · Weaken a foe",
  "Slipstream":"Swap in another ally",
  "Molten Channel":"Armor or Burn · Res: both",
  "Obsidian Ravager":"Res: Armor into Burning",
  "Pressure Forge":"+1 Armor · Res: 1 damage",
  "Eruption Guard":"Next hit on an ally −1",
  "Crosswind Spark":"Move ally · +1 Momentum",
  "Tempest Striker":"Moved: next attack +1",
  "Thunderstep":"Move ally · Res: 1 damage",
  "Static Reversal":"Dodge the first attack",
  "Rainseed":"Seed an ally · Res: Growth",
  "Tidelily Guardian":"Res: Growth heals an ally",
  "Flourishing Current":"Res: heal 1 + Growth",
  "Reclaiming Tide":"Survive one lethal hit"
  });

  return Object.freeze({E,HYBRIDS,INFO,BASE,RESPONSES,TECH,TECH2,HYBRID_CARDS,SHORT});
});
