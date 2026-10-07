/* Element Bound release metadata — update this file first for every new release. */
window.EB_RELEASE=Object.freeze({
  version:'1.11.0',
  label:'Second Techniques',
  engine:'EB-1.2.0',
  balanceLab:'Balance Lab XXI',
  ruleset:'EB-RULES-1.11.0-BALANCE-PASS',
  focus:'Every Prime deck gets a second Technique',
  audience:'Prime & Hybrid Benders',
  notes:Object.freeze([
    'New Techniques: Searing Brand, Riptide, Wild Growth, Stone Fist, Recharge and Downdraft',
    'Each Prime deck now holds two different Techniques',
    'Nature and Earth can grow and finish duels more reliably',
    'The Codex and the Tome list both Techniques for every Prime'
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
