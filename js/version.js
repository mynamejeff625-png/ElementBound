/* Element Bound release metadata — update this file first for every new release. */
window.EB_RELEASE=Object.freeze({
  version:'1.10.0',
  label:'The Arena',
  engine:'EB-1.1.2',
  balanceLab:'Balance Lab XIX',
  ruleset:'EB-RULES-0.8.62-BALANCE-PASS',
  focus:'The Arena is now the duel screen: one screen, fanned hand, combos you can see',
  audience:'Prime & Hybrid Benders',
  notes:Object.freeze([
    'The Arena is now the default duel screen (add ?arena=0 for the classic one)',
    'Each half of the field takes on its Bender’s element',
    'The final hit slows down and the losing medallion shatters'
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
