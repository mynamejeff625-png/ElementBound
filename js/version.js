/* Element Bound release metadata — update this file first for every new release. */
window.EB_RELEASE=Object.freeze({
  version:'1.17.0',
  label:'Second Chance',
  engine:'EB-1.7.0',
  balanceLab:'Balance Lab XXIX',
  ruleset:'EB-RULES-1.17.0-BALANCE-PASS',
  focus:'The Bender who goes second may mulligan once',
  audience:'Prime & Hybrid Benders',
  notes:Object.freeze([
    'Going second: shuffle any cards from your opening hand back and draw that many, once',
    'The rival uses the mulligan too; the first Bender still cannot',
    'The rival mulligans only a weak opening hand'
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
