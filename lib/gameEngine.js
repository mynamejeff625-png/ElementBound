(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.ElementBoundEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const ACTION_VERSION=1;
  const ACTIONS=Object.freeze(['PLAY_CARD','ATTACK','END_TURN']);

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

  function event(type,data={},text=''){return {type,...data,text}}
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
  function hasResponseOpportunity(side){
    return !!side.initiationToken||(side.hand||[]).some(card=>card.type==='RESPONSE'&&responseElements(side).includes(card.el)&&side.e>=card.c);
  }

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
  function attack(state,move){
    const side=state.p[move.actor],enemy=state.p[1-move.actor],attacker=findSlot(side,move.payload.attackerId);
    if(!attacker)return 'ATTACKER_NOT_ON_FIELD';
    if(!attacker.ready||attacker.sick)return 'ATTACKER_NOT_READY';
    const target=isBenderTarget(move.payload)?null:targetById(enemy,move.payload.targetId);
    if(!isBenderTarget(move.payload)&&!target)return 'ILLEGAL_TARGET';
    if(!target&&activeGuards(enemy).length&&!bypassesGuard(attacker,side))return 'GUARD_BLOCKS_BENDER';
    if(target&&hasResponseOpportunity(enemy))return 'RESPONSE_WINDOW_REQUIRED';
    resolveAttack(state,move.actor,attacker,target);return null;
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

  function validateAndApplyMove(state,move){
    if(!validState(state))return reject(state,'INVALID_STATE');
    if(!validEnvelope(move))return reject(state,'INVALID_ACTION');
    if(move.rev!==Number(state.rev||0))return reject(state,'REVISION_MISMATCH');
    if(state.winner!=null)return reject(state,'GAME_OVER');
    if(move.actor!==state.active)return reject(state,'NOT_YOUR_TURN');
    const next=clone(state),before=clone(state),events=[];let error=null,played=null,attacker=null,target=null;
    if(move.type==='PLAY_CARD')played=findCard(next.p[move.actor].hand,move.payload.cardId);
    if(move.type==='ATTACK'){
      attacker=findSlot(next.p[move.actor],move.payload.attackerId);
      target=isBenderTarget(move.payload)?null:findSlot(next.p[1-move.actor],move.payload.targetId);
    }
    if(move.type==='PLAY_CARD')error=playCard(next,move);
    else if(move.type==='ATTACK')error=attack(next,move);
    else if(move.type==='END_TURN')error=endTurn(next,move);
    if(error)return reject(state,error);
    if(move.type==='PLAY_CARD'&&played){
      events.push(event('CARD_PLAYED',{actor:move.actor,cardId:played.id,cardName:played.n,cardType:played.type,slotIndex:move.payload.slotIndex},played.type==='MANIFESTATION'?`SUMMON ${played.n} → M${move.payload.slotIndex+1}`:`${played.n} played`));
      if(played.type==='TECHNIQUE')events.push(event('TECHNIQUE_RESOLVED',{actor:move.actor,cardId:played.id,cardName:played.n},`${played.n} resolved`));
    }else if(move.type==='ATTACK'&&attacker){
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
    events.push(...stateChangeEvents(before,next,move));
    next.rev=Number(state.rev||0)+1;terminal(next);
    if(next.winner!=null)events.push(event('WIN',{winner:next.winner},next.winner==='DRAW'?'DUEL DRAW · SIMULTANEOUS 0 VITALITY':`${next.winner} WINS · 0 VITALITY`));
    return {ok:true,error:null,state:next,events:events.map(item=>({turn:before.turn,...item}))};
  }

  return Object.freeze({ACTION_VERSION,ACTIONS,validEnvelope,validState,createMatchEvents,validateAndApplyMove});
});
