/* Element Bound release metadata — update this file first for every new release. */
window.EB_RELEASE=Object.freeze({
  version:'1.14.0',
  label:'Deep Roots',
  engine:'EB-1.5.0',
  balanceLab:'Balance Lab XXVI',
  ruleset:'EB-RULES-1.14.0-BALANCE-PASS',
  focus:'Nature\'s Growth cards now do what they say',
  audience:'Prime & Hybrid Benders',
  notes:Object.freeze([
    'Root Keeper gains 1 Growth whenever it is healed',
    'Grove Beast gets +2 ATK for each Growth instead of +1',
    'Nature plays 2 Wild Growth and 5 Verdant Mend (was 3 and 4)'
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
