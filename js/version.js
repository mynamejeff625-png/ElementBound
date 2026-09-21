/* Element Bound release metadata — update this file first for every new release. */
window.EB_RELEASE=Object.freeze({
  version:'0.8.61',
  label:'Round-End Decay',
  engine:'EB-1.8.61',
  balanceLab:'Balance Lab XVIII',
  ruleset:'EB-RULES-0.8.61-BALANCE-PASS',
  focus:'Round-End Armor · Momentum · Charged',
  audience:'Prime & Hybrid Benders'
});

(function applyElementBoundVersion(){
  const r=window.EB_RELEASE;
  const text={
    home:`Alpha ${r.version} · ${r.label} · ${r.focus} · ${r.audience}`,
    battle:`Alpha ${r.version} · ${r.engine}`,
    diagnostics:`Alpha ${r.version} · ${r.label} · Diagnostics`,
    balance:`Alpha ${r.version} · ${r.balanceLab} · ${r.label}`
  };
  document.title=`Elementbound Alpha ${r.version} ${r.balanceLab} ${r.label}`;
  document.querySelectorAll('[data-eb-version-context]').forEach(node=>{
    const value=text[node.dataset.ebVersionContext];
    if(value)node.textContent=value;
  });
})();
