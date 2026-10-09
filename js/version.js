/* Element Bound release metadata — update this file first for every new release. */
window.EB_RELEASE=Object.freeze({
  version:'1.13.2',
  label:'True Rules',
  engine:'EB-1.4.1',
  balanceLab:'Balance Lab XXV',
  ruleset:'EB-RULES-1.13.1-BALANCE-PASS',
  focus:'The rival plays fair, and online duels follow the same rules as single-player',
  audience:'Prime & Hybrid Benders',
  notes:Object.freeze([
    'Fixed: the rival could put its Response card on the field as a Manifestation',
    'Online: Static Step Charges on your second card, Gale Scout\'s Crosswind bonus counts, and Tidelily Guardian heals',
    'Static Step text now says it Charges instead of Flowing on your second card'
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
