/* Element Bound release metadata — update this file first for every new release. */
window.EB_RELEASE=Object.freeze({
  version:'1.13.0',
  label:'Second Wind',
  engine:'EB-1.4.0',
  balanceLab:'Balance Lab XXIV',
  ruleset:'EB-RULES-1.13.0-BALANCE-PASS',
  focus:'Falling behind on the field brings an extra card',
  audience:'Prime & Hybrid Benders',
  notes:Object.freeze([
    'Second Wind: start your turn behind on the field with 2 or fewer cards, or 2+ Manifestations behind, and draw 1 extra card',
    'An early field lead no longer snowballs as hard; comebacks happen far more often',
    'Second Wind never draws from an empty Deck',
    'New Second Wind page in the Tome'
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
