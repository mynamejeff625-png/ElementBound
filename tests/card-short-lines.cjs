const assert=require('node:assert/strict');
const cards=require('../lib/cardCatalog.js');

const names=[];
for(const list of Object.values(cards.BASE))for(const c of list)names.push(c[0]);
for(const t of Object.values(cards.TECH))names.push(t[0]);
for(const r of Object.values(cards.RESPONSES))names.push(r.n);
for(const list of Object.values(cards.HYBRID_CARDS))for(const c of list)names.push(c.n);

let checks=0;
const check=(ok,msg)=>{assert.ok(ok,msg);checks++};
check(Object.isFrozen(cards.SHORT),'SHORT is frozen');
check(new Set(names).size===names.length,'card names are unique, so SHORT can key by name');
for(const name of names){
  const s=cards.SHORT[name];
  check(typeof s==='string'&&s.trim().length>0,`${name} has a short line`);
  check(s.length<=28,`${name} short line is at most 28 characters (${s.length}: "${s}")`);
  check(!/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(s),`${name} short line has no emoji`);
}
check(Object.keys(cards.SHORT).length===names.length,'SHORT has no entries for unknown cards');
console.log(`Card short lines: ${checks} checks passed for ${names.length} cards`);
