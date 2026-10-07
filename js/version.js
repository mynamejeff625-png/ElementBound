/* Element Bound release metadata — update this file first for every new release. */
window.EB_RELEASE=Object.freeze({
  version:'1.12.0',
  label:'Rally Ward',
  engine:'EB-1.3.0',
  balanceLab:'Balance Lab XXIII',
  ruleset:'EB-RULES-1.12.0-BALANCE-PASS',
  focus:'A swept field gets one protected comeback summon',
  audience:'Prime & Hybrid Benders',
  notes:Object.freeze([
    'Rally Ward: from round 2, a Manifestation summoned onto your empty field is Warded until your next turn',
    'Warded Manifestations cannot be attacked; Techniques still reach them',
    'Both fields stay contested far longer, so comebacks are possible',
    'New Warded page in the Tome and a Ward chip in the Arena'
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
