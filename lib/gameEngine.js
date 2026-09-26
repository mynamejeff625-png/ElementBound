(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.ElementBoundEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const ACTION_VERSION=1;
  const ACTIONS=Object.freeze(['PLAY_CARD','ATTACK','END_TURN','RESPOND','PASS','RESOLVE_EXPIRED']);
  const RESPONSE_NAMES=Object.freeze({FIRE:'Backdraft',WATER:'Undertow',NATURE:'Second Bloom',EARTH:'Stonewall',LIGHTNING:'Flash Step',AIR:'Slipstream'});
  const RESPONSE_WINDOW_MS=30000;

  function clone(value){
    if(typeof structuredClone==='function')return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function validEnvelope(move){
    return !!move&&move.v===ACTION_VERSION&&ACTIONS.includes(move.type)&&
      (move.actor===0||move.actor===1)&&Number.isInteger(move.rev)&&move.rev>=0&&
      !!move.payload&&typeof move.payload==='object'&&!Array.isArray(move.payload);
  }

  function reject(state,error,detail){
    return {ok:false,error,detail:detail||null,state,events:[]};
  }

  function withoutUndefined(value){
    if(Array.isArray(value))return value.filter(item=>item!==undefined).map(withoutUndefined);
    if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([,item])=>item!==undefined).map(([key,item])=>[key,withoutUndefined(item)]));
    return value;
  }
  function event(type,data={},text=''){return withoutUndefined({type,...data,text})}
  function createMatchEvents(state){
    if(!validState(state))return [];
    const starter=state.active,other=1-starter,a=state.p[0],b=state.p[1];
    return [
      event('MATCH_START',{turn:state.turn||1},state.logs?.[0]?.replace(/^T\d+\s+/,'')||`MATCH START · ${a.name} vs ${b.name}`),
      event('INITIATIVE',{turn:state.turn||1,starter,tokenSeat:other},state.logs?.[1]?.replace(/^T\d+\s+/,'')||`INITIATIVE · ${state.p[starter].name} goes first · ${state.p[other].name} receives the Initiation Token`)
    ];
  }

  function validState(state){
    return !!state&&Array.isArray(state.p)&&state.p.length===2&&
      (state.active===0||state.active===1)&&Number.isInteger(Number(state.rev||0))&&
      state.p.every(side=>side&&Number.isFinite(side.vit)&&Number.isFinite(side.e)&&
        Number.isFinite(side.maxE)&&Array.isArray(side.deck)&&Array.isArray(side.hand)&&
        Array.isArray(side.wake)&&Array.isArray(side.slots)&&side.slots.length===3&&Array.isArray(side.marks));
  }

  function findCard(cards,id){return (cards||[]).find(card=>card&&card.id===id)||null}
  function findSlot(side,id){return (side.slots||[]).find(card=>card&&card.id===id)||null}
  function marks(subject){if(!Array.isArray(subject.marks))subject.marks=[];return subject.marks}
  function hasMark(subject,mark){return marks(subject).includes(mark)}
  function addMark(subject,mark){if(!hasMark(subject,mark))marks(subject).push(mark)}
  function removeMark(subject,mark){subject.marks=marks(subject).filter(value=>value!==mark)}
  function turnState(side){
    if(!side.turnState)side.turnState={};
    if(!side.turnState.resonance)side.turnState.resonance={a:false,b:false,active:false};
    if(!Array.isArray(side.turnState.moved))side.turnState.moved=[];
    if(!Array.isArray(side.turnState.resolved))side.turnState.resolved=[];
    return side.turnState;
  }
  function activeGuards(side){return side.slots.filter(card=>card&&card.guard)}
  function momentum(card){return Math.max(0,Math.min(3,Number.isFinite(card.momentum)?Math.floor(card.momentum):(hasMark(card,'Momentum')?1:0)))}
  function gainMomentum(card){
    const before=momentum(card);card.momentum=before;
    if(before>=3){addMark(card,'Momentum');return false}
    card.momentum=before+1;card.a=Math.max(0,Number(card.a)||0)+1;addMark(card,'Momentum');return true;
  }
  function gainArmor(card,round){
    if(!card||card.armorGainRound===round||(card.armor||0)>=3)return false;
    card.armorGainRound=round;card.armor=(card.armor||0)+1;return true;
  }
  function grow(card){
    if((card.growth||0)>=3)return false;
    card.growth=(card.growth||0)+1;card.a=(Number(card.a)||0)+1;return true;
  }
  function weaken(card){
    if(!card||card.crosswindAttackDebuff||hasMark(card,'Weakened'))return false;
    const before=Math.max(0,Number(card.a)||0);card.crosswindAttackDebuff=Math.min(1,before);card.a=Math.max(0,before-1);addMark(card,'Weakened');return true;
  }
  function clearWeakness(card){
    if(!card)return;card.a=Math.max(0,(Number(card.a)||0)+(Number(card.crosswindAttackDebuff)||0));card.crosswindAttackDebuff=0;removeMark(card,'Weakened');
  }
  function sendToWake(side,card){
    const slot=side.slots.indexOf(card);if(slot>=0)side.slots[slot]=null;
    side.hand=side.hand.filter(item=>item.id!==card.id);clearWeakness(card);card.zone='WAKE';side.wake.push(card);
  }
  function deal(card,amount){
    let pending=Math.max(0,Number(amount)||0),armor=Math.min(card.armor||0,pending);
    card.armor=(card.armor||0)-armor;pending-=armor;card.h-=pending;return pending;
  }
  function cleanupDead(side){for(const card of side.slots.slice()){if(card&&card.h<=0)sendToWake(side,card)}}
  function resonant(side){return !!turnState(side).resonance.active}
  function registerAffinity(side,card){
    const parents=turnState(side).parents||[];if(parents.length!==2||card.el===side.el)return;
    const resonance=turnState(side).resonance;
    if(card.el===parents[0])resonance.a=true;if(card.el===parents[1])resonance.b=true;
    resonance.active=!!(resonance.a&&resonance.b);turnState(side).resolved.push(card.id);
  }
  function moveFriendly(side,card,toSlot){
    const from=side.slots.indexOf(card);
    const to=Number.isInteger(toSlot)?toSlot:side.slots.findIndex(value=>!value);
    if(from<0||to<0||to>2||side.slots[to])return false;
    side.slots[from]=null;side.slots[to]=card;turnState(side).moved.push(card.id);return true;
  }
  function targetById(side,id){return id==null?null:findSlot(side,id)}
  function isBenderTarget(payload){return payload.targetId==null||payload.targetType==='BENDER'}
  function responseElements(side){return Array.isArray(turnState(side).parents)&&turnState(side).parents.length?turnState(side).parents:[side.responseEl||side.el]}
  function findCardEverywhere(side,id){return findCard([...(side.hand||[]),...(side.deck||[]),...(side.wake||[]),...(side.slots||[]).filter(Boolean)],id)}
  function responseTargets(element,defender,target,phase){
    if(!target)return [];
    if(phase==='AFTER')return element==='FIRE'&&target.h<target.max?[target]:[];
    if(element==='FIRE')return [];
    if(element==='WATER')return defender.slots.includes(target)&&defender.slots.some(value=>!value)?[target]:[];
    if(element==='NATURE')return defender.slots.filter(card=>card&&card.h<card.max&&!hasMark(card,'Second Bloom Used'));
    if(element==='EARTH')return defender.slots.filter(Boolean);
    if(element==='LIGHTNING')return [target];
    if(element==='AIR')return defender.slots.filter(card=>card&&card!==target);
    return [];
  }
  function responseOptions(state,defenderSeat,pending,phase){
    const defender=state.p[defenderSeat],target=findCardEverywhere(defender,pending.targetId),options=[];
    for(const element of responseElements(defender)){
      const targets=responseTargets(element,defender,target,phase);if(!targets.length)continue;
      const card=ebResponseCard(defender,element);
      if(card&&defender.e>=card.c)options.push({element,source:'CARD',cardId:card.id,responseName:RESPONSE_NAMES[element],targetIds:targets.map(item=>item.id)});
      if(defender.initiationToken)options.push({element,source:'TOKEN',responseName:RESPONSE_NAMES[element],targetIds:targets.map(item=>item.id)});
    }
    return options;
  }
  function ebResponseCard(side,element){return (side.hand||[]).find(card=>card.type==='RESPONSE'&&card.el===element)||null}
  function attackBonus(state,owner,attacker,target){
    const side=state.p[owner];let bonus=0;
    if(attacker.el==='STORM'&&attacker.n==='Tempest Striker'&&turnState(side).moved.includes(attacker.id)&&!attacker.turnFlags?.stormBonus){bonus++;attacker.turnFlags={...(attacker.turnFlags||{}),stormBonus:true}}
    if(attacker.el==='AIR'&&attacker.n==='Gale Scout'&&turnState(side).airOpening){gainMomentum(attacker);turnState(side).airOpening=false}
    if(attacker.el==='EARTH'&&attacker.n==='Boulder Ram'&&(attacker.armor||0)>0)bonus++;
    if(attacker.el==='FIRE'&&attacker.n==='Flare Hawk'&&target&&hasMark(target,'Burning'))bonus++;
    if(attacker.el==='LIGHTNING'&&attacker.n==='Arc Runner'&&(state.chain||0)>=2)bonus++;
    if(attacker.el==='LIGHTNING'&&attacker.n==='Volt Lynx'&&(state.chain||0)>=3&&!attacker.turnFlags?.voltBonus){bonus+=2;attacker.turnFlags={...(attacker.turnFlags||{}),voltBonus:true}}
    if(attacker.el==='LIGHTNING'&&target&&hasMark(target,'Charged')){bonus++;removeMark(target,'Charged')}
    return bonus;
  }
  function bypassesGuard(attacker,side){
    return !!(attacker&&side)&&((attacker.el==='AIR'&&attacker.n==='Sky Raptor'&&momentum(attacker)>0)||
      (attacker.el==='STORM'&&attacker.n==='Tempest Striker'&&turnState(side).moved.includes(attacker.id)&&resonant(side)));
  }
  function soakedPower(attacker,power){if(!hasMark(attacker,'Soaked'))return power;removeMark(attacker,'Soaked');return Math.max(0,power-2)}
  function ravager(side,attacker,target){
    if(attacker.el!=='MAGMA'||attacker.n!=='Obsidian Ravager'||!resonant(side)||attacker.turnFlags?.obsidianBurn)return;
    const donor=side.slots.find(card=>card&&card!==attacker&&(card.armor||0)>0);if(!donor)return;
    donor.armor--;attacker.turnFlags={...(attacker.turnFlags||{}),obsidianBurn:true};addMark(target,'Burning');
  }
  function quickBefore(side,target){if(target.quick?.kind==='MOVE'){moveFriendly(side,target);target.quick=null}}
  function quickAfter(target){
    if(target.quick?.kind==='SURVIVE'&&target.h<=0&&(target.growth||0)>0&&hasMark(target,'Seeded')){
      target.h=1;target.growth--;target.a=Math.max(0,target.a-1);removeMark(target,'Seeded');target.quick=null;
    }
  }

  function resolveAttack(state,owner,attacker,target){
    const side=state.p[owner],enemy=state.p[1-owner];attacker.ready=false;
    if(!target){
      ravager(side,attacker,enemy);
      enemy.vit-=soakedPower(attacker,Math.max(0,(attacker.a||0)+attackBonus(state,owner,attacker,enemy)));
      return;
    }
    ravager(side,attacker,target);quickBefore(enemy,target);
    if(!enemy.slots.includes(target))return;
    let reduction=target.quick?.kind==='REDUCE'?(target.quick.value||0):0;if(reduction)target.quick=null;
    const guardsAtImpact=activeGuards(enemy).length,preHP=target.h;
    const power=soakedPower(attacker,Math.max(0,(attacker.a||0)+attackBonus(state,owner,attacker,target)-reduction));
    const dealt=deal(target,power);
    if(attacker.el==='WATER'&&attacker.n==='River Serpent'&&dealt>0)addMark(target,'Soaked');
    quickAfter(target);
    if(target.h<=0&&guardsAtImpact===0)enemy.vit-=Math.max(0,dealt-Math.max(0,preHP));
    cleanupDead(enemy);
  }

  function technique(state,owner,card,payload){
    const side=state.p[owner],enemy=state.p[1-owner],friendly=targetById(side,payload.friendId),hostile=targetById(enemy,payload.enemyId);
    if(card.el==='FIRE'){
      if(isBenderTarget(payload)){if(activeGuards(enemy).length)return false;enemy.vit-=hasMark(enemy,'Burning')?3:2}
      else {if(!hostile)return false;deal(hostile,hasMark(hostile,'Burning')?3:2);cleanupDead(enemy)}
    }else if(card.el==='EARTH'){if(!friendly)return false;gainArmor(friendly,state.turn)}
    else if(card.el==='NATURE'){if(!friendly)return false;if(hasMark(friendly,'Seeded'))grow(friendly)}
    else if(card.el==='WATER'){if(hostile)addMark(hostile,'Soaked');if(payload.flow==='BOTTOM'&&side.deck.length)side.deck.push(side.deck.shift())}
    else if(card.el==='LIGHTNING'){if((state.chain||0)===2)addMark(enemy,'Charged');else if(payload.flow==='BOTTOM'&&side.deck.length)side.deck.push(side.deck.shift())}
    else if(card.el==='AIR'){
      if(!friendly)return false;gainMomentum(friendly);
      const other=targetById(enemy,payload.swapWithId);
      if(enemy.slots.filter(Boolean).length>=2&&(!hostile||!other||hostile===other))return false;
      if(hostile&&other&&hostile!==other){const a=enemy.slots.indexOf(hostile),b=enemy.slots.indexOf(other);[enemy.slots[a],enemy.slots[b]]=[enemy.slots[b],enemy.slots[a]];weaken(hostile);weaken(other);turnState(side).airOpening=true}
    }else if(card.el==='MAGMA'){
      if(card.n==='Molten Channel'){
        const mode=payload.magmaMode||(resonant(side)?'BOTH':'ARMOR');
        if((mode==='ARMOR'||mode==='BOTH')&&!friendly)return false;
        if((mode==='BURNING'||mode==='BOTH')&&!hostile)return false;
        if(friendly&&(mode==='ARMOR'||mode==='BOTH'))gainArmor(friendly,state.turn);
        if(hostile&&(mode==='BURNING'||mode==='BOTH'))addMark(hostile,'Burning');
      }else if(card.n==='Pressure Forge'){
        if(!friendly)return false;gainArmor(friendly,state.turn);
        if(resonant(side)){const burning=enemy.slots.find(unit=>unit&&hasMark(unit,'Burning'));if(burning){deal(burning,1);cleanupDead(enemy)}}
      }else if(card.n==='Eruption Guard'){if(!friendly)return false;friendly.quick={kind:'REDUCE',value:1,ownerTurn:state.turn}}
      else return false;
    }else if(card.el==='STORM'){
      if(!friendly)return false;
      if(card.n==='Crosswind Spark'){if(!moveFriendly(side,friendly,payload.toSlot))return false;gainMomentum(friendly);if(resonant(side))addMark(friendly,'Charged')}
      else if(card.n==='Thunderstep'){if(!moveFriendly(side,friendly,payload.toSlot))return false;if(resonant(side)&&(hasMark(friendly,'Charged')||momentum(friendly)>0)){if(!hostile)return false;deal(hostile,1);cleanupDead(enemy)}}
      else if(card.n==='Static Reversal')friendly.quick={kind:'MOVE',ownerTurn:state.turn};
      else return false;
    }else if(card.el==='BLOOM'){
      if(!friendly)return false;
      if(card.n==='Rainseed'){if(resonant(side))grow(friendly);else if(hasMark(friendly,'Seeded'))friendly.h=Math.min(friendly.max,friendly.h+1);else addMark(friendly,'Seeded')}
      else if(card.n==='Flourishing Current'){if(resonant(side)){friendly.h=Math.min(friendly.max,friendly.h+1);if(hasMark(friendly,'Seeded'))grow(friendly)}}
      else if(card.n==='Reclaiming Tide'){if(!hasMark(friendly,'Seeded')||!(friendly.growth>0))return false;friendly.quick={kind:'SURVIVE',ownerTurn:state.turn}}
      else return false;
    }else return false;
    return true;
  }

  function summonGift(state,side,card,target){
    if(!target)return;
    if(card.el==='AIR'&&card.n==='Breeze Disciple'){gainMomentum(target);gainMomentum(target)}
    if(card.el==='EARTH'&&card.n==='Stone Initiate')gainArmor(target,state.turn);
    if(card.el==='NATURE'&&card.n==='Sproutling')addMark(target,'Seeded');
  }
  function playCard(state,move){
    const side=state.p[move.actor],payload=move.payload,card=findCard(side.hand,payload.cardId);
    if(!card)return 'CARD_NOT_IN_HAND';
    if(card.type==='RESPONSE')return 'RESPONSE_REQUIRES_WINDOW';
    if(!Number.isFinite(card.c)||card.c<0||card.c>side.e)return 'INSUFFICIENT_ESSENCE';
    if(card.type==='MANIFESTATION'){
      const slot=payload.slotIndex;if(!Number.isInteger(slot)||slot<0||slot>2||side.slots[slot])return 'ILLEGAL_SLOT';
      const gift=payload.friendId==null?null:targetById(side,payload.friendId);
      const needsGift=(card.el==='AIR'&&card.n==='Breeze Disciple')||(card.el==='EARTH'&&card.n==='Stone Initiate')||(card.el==='NATURE'&&card.n==='Sproutling');
      if(needsGift&&side.slots.some(Boolean)&&!gift)return 'ILLEGAL_TARGET';
      side.e-=card.c;side.hand=side.hand.filter(item=>item.id!==card.id);card.zone='FIELD';card.sick=true;card.ready=true;side.slots[slot]=card;
      if(card.el==='FIRE'&&card.n==='Cinder Adept')addMark(state.p[1-move.actor],'Burning');
      if(card.el==='WATER'&&card.n==='Mist Adept'&&payload.flow==='BOTTOM'&&side.deck.length)side.deck.push(side.deck.shift());
      summonGift(state,side,card,gift);state.chain=(state.chain||0)+1;
      if(card.el==='LIGHTNING'&&card.n==='Spark Runner'&&state.chain===2)state.chain++;
    }else if(card.type==='TECHNIQUE'){
      const snapshot=clone(state);if(!technique(state,move.actor,card,payload)){Object.keys(state).forEach(key=>delete state[key]);Object.assign(state,snapshot);return 'ILLEGAL_TARGET'}
      side.e-=card.c;side.hand=side.hand.filter(item=>item.id!==card.id);card.zone='WAKE';side.wake.push(card);state.chain=(state.chain||0)+1;
    }else return 'UNSUPPORTED_CARD_TYPE';
    registerAffinity(side,card);return null;
  }
  function spendResponse(state,pending,option){
    const defender=state.p[pending.defenderSeat];
    if(option.source==='TOKEN'){if(!defender.initiationToken)return false;defender.initiationToken=false;return true}
    const card=ebResponseCard(defender,option.element);if(!card||card.id!==option.cardId||defender.e<card.c)return false;
    defender.e-=card.c;defender.hand=defender.hand.filter(item=>item.id!==card.id);card.zone='WAKE';defender.wake.push(card);return true;
  }
  function resolveResponseEffect(state,pending,option,targetId){
    const attackerSide=state.p[pending.attackerSeat],defender=state.p[pending.defenderSeat];
    const attacker=findCardEverywhere(attackerSide,pending.attackerId),target=findCardEverywhere(defender,pending.targetId),chosen=findCardEverywhere(defender,targetId)||target;
    let cancel=false,newTarget=target;
    if(option.element==='FIRE'){if(attacker){attacker.h-=2;cleanupDead(attackerSide)}}
    else if(option.element==='WATER'){
      const from=defender.slots.indexOf(target),to=defender.slots.findIndex(value=>!value);
      if(from>=0&&to>=0){defender.slots[to]=target;defender.slots[from]=null;cancel=true}
    }else if(option.element==='NATURE'){
      if(chosen&&defender.slots.includes(chosen)&&chosen.h<chosen.max&&!hasMark(chosen,'Second Bloom Used')){chosen.h=Math.min(chosen.max,chosen.h+1);addMark(chosen,'Second Bloom Used')}
    }else if(option.element==='EARTH'){if(chosen&&defender.slots.includes(chosen))gainArmor(chosen,state.turn)}
    else if(option.element==='LIGHTNING'){
      if(attacker){attacker.h-=2;cleanupDead(attackerSide);if(!attackerSide.slots.includes(attacker))cancel=true}
    }else if(option.element==='AIR'){
      const from=defender.slots.indexOf(target),to=defender.slots.indexOf(chosen);
      if(from>=0&&to>=0&&from!==to){[defender.slots[from],defender.slots[to]]=[defender.slots[to],defender.slots[from]];newTarget=chosen}
    }
    terminal(state);return {cancel:cancel||state.winner!=null,target:newTarget};
  }
  function responseOfferEvent(pending){return event('RESPONSE_OFFERED',{attackerSeat:pending.attackerSeat,defenderSeat:pending.defenderSeat,timing:pending.timing,deadline:pending.deadline},'Opponent is deciding…')}
  function responseEffectDescription(state,pending,option,targetId,outcome){
    const defender=state.p[pending.defenderSeat],chosen=findCardEverywhere(defender,targetId),name=chosen?.n||'target';
    if(option.element==='FIRE')return 'deals 2 damage to the attacker';
    if(option.element==='WATER')return `moves ${name} · attack cancelled`;
    if(option.element==='NATURE')return `heals ${name} for 1`;
    if(option.element==='EARTH')return `${name} gains 1 Armor`;
    if(option.element==='LIGHTNING')return `deals 2 damage to the attacker${outcome.cancel?' · attack cancelled':''}`;
    if(option.element==='AIR')return `redirects the attack to ${outcome.target?.n||name}`;
    return 'resolves';
  }
  function openResponseWindow(state,attackInfo,timing,now){
    const pending={attackerSeat:attackInfo.attackerSeat,defenderSeat:attackInfo.defenderSeat,attackerId:attackInfo.attackerId,targetId:attackInfo.targetId,targetType:'CARD',timing,deadline:now+RESPONSE_WINDOW_MS};
    const options=responseOptions(state,pending.defenderSeat,pending,timing);if(!options.length)return null;
    pending.legalOptions=options;state.pendingResponse=pending;return pending;
  }
  function continuePendingAttack(state,pending,events,now){
    const attackerSide=state.p[pending.attackerSeat],defender=state.p[pending.defenderSeat],attacker=findSlot(attackerSide,pending.attackerId),target=findSlot(defender,pending.targetId);
    delete state.pendingResponse;if(!attacker||!target)return;
    const before=clone(state),preHp=target.h;resolveAttack(state,pending.attackerSeat,attacker,target);
    events.push(...stateChangeEvents(before,state,{type:'ATTACK',payload:{targetId:target.id}}));
    if(preHp>target.h){const after=openResponseWindow(state,pending,'AFTER',now);if(after)events.push(responseOfferEvent(after))}
  }
  function expire(card){
    const stacks=momentum(card);if(stacks){card.a=Math.max(0,(Number(card.a)||0)-stacks);card.momentum=0}
    card.armor=0;card.armorGainRound=null;removeMark(card,'Momentum');removeMark(card,'Charged');
  }
  function endTurn(state,move){
    const previous=state.active,next=1-previous,start=Number.isInteger(state.startSeat)?state.startSeat:(state.initiative?.starter??0);
    state.active=next;
    if(next===start){for(const side of state.p){removeMark(side,'Charged');side.slots.filter(Boolean).forEach(expire)}state.turn=(state.turn||1)+1}
    const side=state.p[next];state.chain=0;side.maxE=Math.min(7,2+Math.floor((state.turn||1)-1));side.e=side.maxE;
    for(const card of side.slots.filter(Boolean)){card.ready=true;card.sick=false;card.quick=null;card.turnFlags={}}
    const parents=turnState(side).parents||[];side.turnState={resonance:{a:false,b:false,active:false},resolved:[],moved:[],triggered:[],quick:[],parents:parents.slice()};
    if(side.deck.length){const card=side.deck.shift();card.zone='HAND';side.hand.push(card)}else side.vit-=2;
    return null;
  }
  function terminal(state){
    if(state.p[0].vit<=0&&state.p[1].vit<=0)state.winner='DRAW';
    else if(state.p[0].vit<=0)state.winner=state.p[1].name||1;
    else if(state.p[1].vit<=0)state.winner=state.p[0].name||0;
  }

  function cardMap(state){
    const map=new Map();
    state.p.forEach((side,seat)=>{
      for(const zone of ['hand','deck','wake'])for(const card of side[zone]||[])map.set(card.id,{card,seat,zone});
      for(const card of side.slots||[])if(card)map.set(card.id,{card,seat,zone:'FIELD'});
    });
    return map;
  }
  function stateChangeEvents(before,after,move){
    const events=[],oldCards=cardMap(before),newCards=cardMap(after),eventTurn=move.type==='END_TURN'?after.turn:before.turn;
    for(let seat=0;seat<2;seat++){
      const oldSide=before.p[seat],newSide=after.p[seat];
      if(newSide.vit<oldSide.vit){
        const amount=oldSide.vit-newSide.vit;
        events.push(event('BENDER_DAMAGE',{seat,targetType:'BENDER',amount,remainingVitality:newSide.vit,turn:eventTurn},`${newSide.name} takes ${amount} damage`));
      }
      const oldMarks=new Set(oldSide.marks||[]);
      for(const status of newSide.marks||[])if(!oldMarks.has(status))events.push(event('STATUS_APPLIED',{seat,targetType:'BENDER',status,turn:eventTurn},`${status} applied to ${newSide.name}`));
    }
    for(const [id,next] of newCards){
      const prior=oldCards.get(id);if(!prior)continue;
      if((next.card.h??0)<(prior.card.h??0)&&move.type!=='END_TURN'){
        const amount=prior.card.h-next.card.h,armorAbsorbed=Math.max(0,(prior.card.armor||0)-(next.card.armor||0)),remainingHp=Math.max(0,next.card.h);
        events.push(event('DAMAGE',{seat:next.seat,targetType:'CARD',targetId:id,targetName:next.card.n,amount,armorAbsorbed,remainingHp,turn:eventTurn},`${next.card.n} takes ${amount} damage${armorAbsorbed?` · Armor blocks ${armorAbsorbed}`:''} · ${remainingHp} HP remains`));
      }else if((prior.card.armor||0)>(next.card.armor||0)&&move.type==='ATTACK'&&id===move.payload.targetId){
        const armorAbsorbed=(prior.card.armor||0)-(next.card.armor||0);
        events.push(event('DAMAGE',{seat:next.seat,targetType:'CARD',targetId:id,targetName:next.card.n,amount:0,armorAbsorbed,remainingHp:next.card.h,turn:eventTurn},`${next.card.n} takes 0 damage · Armor blocks ${armorAbsorbed} · ${next.card.h} HP remains`));
      }
      const oldMarks=new Set(prior.card.marks||[]);
      for(const status of next.card.marks||[])if(!oldMarks.has(status))events.push(event('STATUS_APPLIED',{seat:next.seat,targetType:'CARD',targetId:id,targetName:next.card.n,status,turn:eventTurn},`${status} applied to ${next.card.n}`));
      if(prior.zone==='FIELD'&&next.zone==='wake')events.push(event('DESTROYED',{seat:next.seat,cardId:id,cardName:next.card.n,turn:eventTurn},`${next.card.n} destroyed`));
    }
    return events;
  }

  function validateAndApplyMove(state,move,options={}){
    if(!validState(state))return reject(state,'INVALID_STATE');
    if(!validEnvelope(move))return reject(state,'INVALID_ACTION');
    if(move.rev!==Number(state.rev||0))return reject(state,'REVISION_MISMATCH');
    if(state.winner!=null)return reject(state,'GAME_OVER');
    const now=Number.isFinite(options.now)?options.now:0;
    if(state.pendingResponse){
      const next=clone(state),before=clone(state),pending=next.pendingResponse,events=[];
      const expired=now>=pending.deadline;
      if(expired){
        events.push(event('RESPONSE_AUTO_PASSED',{defenderSeat:pending.defenderSeat,timing:pending.timing},`${next.p[pending.defenderSeat].name} response timed out`));
        if(pending.timing==='BEFORE')continuePendingAttack(next,pending,events,now);else delete next.pendingResponse;
      }else{
        if(move.type==='RESOLVE_EXPIRED')return reject(state,'RESPONSE_NOT_EXPIRED');
        if(move.type!=='RESPOND'&&move.type!=='PASS')return reject(state,'RESPONSE_PENDING');
        if(move.actor!==pending.defenderSeat)return reject(state,'NOT_RESPONSE_DEFENDER');
        if(move.type==='PASS'){
          events.push(event('RESPONSE_PASSED',{defenderSeat:pending.defenderSeat,timing:pending.timing},`${next.p[pending.defenderSeat].name} passes the response`));
          if(pending.timing==='BEFORE')continuePendingAttack(next,pending,events,now);else delete next.pendingResponse;
        }else{
          const option=pending.legalOptions.find(item=>item.element===move.payload.element&&item.source===move.payload.source&&
            (item.source!=='CARD'||item.cardId===move.payload.cardId));
          if(!option)return reject(state,'ILLEGAL_RESPONSE');
          const targetId=move.payload.targetId||option.targetIds[0];if(!option.targetIds.includes(targetId))return reject(state,'ILLEGAL_RESPONSE_TARGET');
          if(!spendResponse(next,pending,option))return reject(state,'RESPONSE_PAYMENT_FAILED');
          const effectBefore=clone(next),outcome=resolveResponseEffect(next,pending,option,targetId);
          const effect=responseEffectDescription(next,pending,option,targetId,outcome);
          events.push(event('RESPONSE_USED',{defenderSeat:pending.defenderSeat,timing:pending.timing,responseName:option.responseName,element:option.element,source:option.source,effect},`RESPONSE · ${option.responseName}${option.source==='TOKEN'?' · Initiation Token':''} · ${effect}`));
          if(option.source==='TOKEN')events.push(event('INITIATION_TOKEN_SPENT',{seat:pending.defenderSeat,responseName:option.responseName},`${next.p[pending.defenderSeat].name} spends the Initiation Token`));
          events.push(...stateChangeEvents(effectBefore,next,{type:'RESPOND',payload:{targetId}}));
          if(pending.timing==='BEFORE'&&!outcome.cancel){pending.targetId=outcome.target.id;continuePendingAttack(next,pending,events,now)}else delete next.pendingResponse;
        }
      }
      next.rev=Number(state.rev||0)+1;terminal(next);
      if(next.winner!=null&&!events.some(item=>item.type==='WIN'))events.push(event('WIN',{winner:next.winner},next.winner==='DRAW'?'DUEL DRAW · SIMULTANEOUS 0 VITALITY':`${next.winner} WINS · 0 VITALITY`));
      return {ok:true,error:null,state:next,events:events.map(item=>({turn:before.turn,...item}))};
    }
    if(move.type==='RESPOND'||move.type==='PASS'||move.type==='RESOLVE_EXPIRED')return reject(state,'NO_RESPONSE_PENDING');
    if(move.actor!==state.active)return reject(state,'NOT_YOUR_TURN');
    const next=clone(state),before=clone(state),events=[];let error=null,played=null,attacker=null,target=null;
    if(move.type==='PLAY_CARD')played=findCard(next.p[move.actor].hand,move.payload.cardId);
    if(move.type==='ATTACK'){
      attacker=findSlot(next.p[move.actor],move.payload.attackerId);
      target=isBenderTarget(move.payload)?null:findSlot(next.p[1-move.actor],move.payload.targetId);
    }
    if(move.type==='PLAY_CARD')error=playCard(next,move);
    else if(move.type==='ATTACK'){
      const side=next.p[move.actor],enemy=next.p[1-move.actor];
      if(!attacker)error='ATTACKER_NOT_ON_FIELD';
      else if(!attacker.ready||attacker.sick)error='ATTACKER_NOT_READY';
      else if(!isBenderTarget(move.payload)&&!target)error='ILLEGAL_TARGET';
      else if(!target&&activeGuards(enemy).length&&!bypassesGuard(attacker,side))error='GUARD_BLOCKS_BENDER';
      else if(target){
        const info={attackerSeat:move.actor,defenderSeat:1-move.actor,attackerId:attacker.id,targetId:target.id};
        const pending=openResponseWindow(next,info,'BEFORE',now);
        events.push(event('ATTACK',{actor:move.actor,attackerId:attacker.id,attackerName:attacker.n,targetId:target.id,targetName:target.n,targetType:'CARD'},`${attacker.n} attacks ${target.n}`));
        if(pending)events.push(responseOfferEvent(pending));
        else{
          const damageBefore=clone(next),preHp=target.h;resolveAttack(next,move.actor,attacker,target);
          const targetAfter=findCardEverywhere(next.p[1-move.actor],target.id),amount=Math.max(0,preHp-(targetAfter?.h??preHp));
          events[0]=event('ATTACK',{actor:move.actor,attackerId:attacker.id,attackerName:attacker.n,targetId:target.id,targetName:target.n,targetType:'CARD',amount},`${attacker.n} attacks ${target.n} for ${amount}`);
          events.push(...stateChangeEvents(damageBefore,next,move));
          if(amount>0){const after=openResponseWindow(next,info,'AFTER',now);if(after)events.push(responseOfferEvent(after))}
        }
      }else resolveAttack(next,move.actor,attacker,null);
    }
    else if(move.type==='END_TURN')error=endTurn(next,move);
    if(error)return reject(state,error);
    if(move.type==='PLAY_CARD'&&played){
      events.push(event('CARD_PLAYED',{actor:move.actor,cardId:played.id,cardName:played.n,cardType:played.type,slotIndex:move.payload.slotIndex},played.type==='MANIFESTATION'?`SUMMON ${played.n} → M${move.payload.slotIndex+1}`:`${played.n} played`));
      if(played.type==='TECHNIQUE')events.push(event('TECHNIQUE_RESOLVED',{actor:move.actor,cardId:played.id,cardName:played.n},`${played.n} resolved`));
    }else if(move.type==='ATTACK'&&attacker&&!target){
      const targetAfter=target?cardMap(next).get(target.id)?.card:null;
      const targetBefore=target?cardMap(before).get(target.id)?.card:null;
      const amount=target?Math.max(0,(targetBefore?.h??target.h)-(targetAfter?.h??target.h)):Math.max(0,before.p[1-move.actor].vit-next.p[1-move.actor].vit);
      events.push(event('ATTACK',{actor:move.actor,attackerId:attacker.id,attackerName:attacker.n,targetId:target?.id??null,targetName:target?.n??next.p[1-move.actor].name,targetType:target?'CARD':'BENDER',amount},target?`${attacker.n} attacks ${target.n} for ${amount}`:`${attacker.n} hits rival Bender for ${amount}`));
    }else if(move.type==='END_TURN'){
      const nextSeat=next.active,drawn=next.p[nextSeat].hand.find(card=>!(before.p[nextSeat].hand||[]).some(old=>old.id===card.id));
      events.push(event('TURN_END',{actor:move.actor,turn:before.turn},`${before.p[move.actor].name} ends their turn`));
      events.push(event('TURN_START',{actor:nextSeat,turn:next.turn},`${next.p[nextSeat].name} turn begins`));
      if(drawn)events.push(event('DRAW',{actor:nextSeat,actorName:next.p[nextSeat].name,cardId:drawn.id,cardName:drawn.n,privateTo:nextSeat,turn:next.turn},`${next.p[nextSeat].name} draws ${drawn.n}`));
    }
    if(move.type!=='ATTACK'||!target)events.push(...stateChangeEvents(before,next,move));
    next.rev=Number(state.rev||0)+1;terminal(next);
    if(next.winner!=null)events.push(event('WIN',{winner:next.winner},next.winner==='DRAW'?'DUEL DRAW · SIMULTANEOUS 0 VITALITY':`${next.winner} WINS · 0 VITALITY`));
    return {ok:true,error:null,state:next,events:events.map(item=>({turn:before.turn,...item}))};
  }

  return Object.freeze({ACTION_VERSION,ACTIONS,validEnvelope,validState,createMatchEvents,validateAndApplyMove});
});
