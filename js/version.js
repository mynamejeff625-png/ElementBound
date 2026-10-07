/* Element Bound release metadata — update this file first for every new release. */
window.EB_RELEASE=Object.freeze({
  version:'1.10.3',
  label:'Faithful Balance Lab',
  engine:'EB-1.1.2',
  balanceLab:'Balance Lab XX',
  ruleset:'EB-RULES-0.8.62-BALANCE-PASS',
  focus:'Balance Lab now plays its cards the way the real rival does',
  audience:'Prime & Hybrid Benders',
  notes:Object.freeze([
    'Balance Lab picks cards like the Hard rival, so its numbers match real duels',
    'Live duel rules are unchanged'
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
