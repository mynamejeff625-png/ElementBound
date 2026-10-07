/* Element Bound release metadata — update this file first for every new release. */
window.EB_RELEASE=Object.freeze({
  version:'1.13.1',
  label:'Even Decks',
  engine:'EB-1.4.0',
  balanceLab:'Balance Lab XXV',
  ruleset:'EB-RULES-1.13.1-BALANCE-PASS',
  focus:'Every deck now wins 45–55% of simulated duels',
  audience:'Prime & Hybrid Benders',
  notes:Object.freeze([
    'Arc Runner: 3 → 4 ATK',
    'All nine decks win between 45% and 55% in Balance Lab round robins',
    'Lightning and Storm duels are stronger; Water no longer leads'
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
