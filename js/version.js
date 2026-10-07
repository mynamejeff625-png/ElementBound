/* Element Bound release metadata — update this file first for every new release. */
window.EB_RELEASE=Object.freeze({
  version:'1.11.1',
  label:'Same Rules Everywhere',
  engine:'EB-1.2.1',
  balanceLab:'Balance Lab XXII',
  ruleset:'EB-RULES-1.11.1-BALANCE-PASS',
  focus:'Single-player now follows the same rules as online duels',
  audience:'Prime & Hybrid Benders',
  notes:Object.freeze([
    'An empty Hand and Deck no longer loses the duel; only 0 Vitality does',
    'Exhaustion grows each time: 2 damage, then 3, then 4',
    'Online and single-player duels now end the same way',
    'When the rival goes first, rounds, Essence and round effects now count correctly',
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
