/* Element Bound release metadata — update this file first for every new release. */
window.EB_RELEASE=Object.freeze({
  version:'1.11.1',
  label:'One Deck-Out Rule',
  engine:'EB-1.2.1',
  balanceLab:'Balance Lab XXII',
  ruleset:'EB-RULES-1.11.1-BALANCE-PASS',
  focus:'Running out of cards no longer ends the duel',
  audience:'Prime & Hybrid Benders',
  notes:Object.freeze([
    'An empty Hand and Deck no longer loses the duel; only 0 Vitality does',
    'Exhaustion grows each time: 2 damage, then 3, then 4',
    'Online and single-player duels now end the same way',
    'The Tome and Lesson VII explain the new rule'
  ])
});

(function applyElementBoundVersion(){
  const r=window.EB_RELEASE;
  const text={
    home:`Alpha ${r.version}`,
    battle:`Alpha ${r.version} · ${r.engine}`,
    diagnostics:`Alpha ${r.version} · ${r.label} · Diagnostics`,
    balance:`Alpha ${r.version} · ${r.balanceLab} · ${r.label}`
  };
  document.title=`Element Bound Alpha ${r.version} ${r.balanceLab} ${r.label}`;
  document.querySelectorAll('[data-eb-version-context]').forEach(node=>{
    const value=text[node.dataset.ebVersionContext];
    if(value)node.textContent=value;
  });
})();
