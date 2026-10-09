/* Element Bound release metadata — update this file first for every new release. */
window.EB_RELEASE=Object.freeze({
  version:'1.16.0',
  label:'Live Wires',
  engine:'EB-1.6.0',
  balanceLab:'Balance Lab XXVIII',
  ruleset:'EB-RULES-1.16.0-BALANCE-PASS',
  focus:'Charged pays off, and Storm finds its Tempest Striker combo',
  audience:'Prime & Hybrid Benders',
  notes:Object.freeze([
    'Charged rival Bender: your next Lightning attack this round gets +1, whatever it targets',
    'Storm plays 2 Tempest Striker and 2 Crosswind Spark (one Spark Runner and one Breeze Disciple fewer)',
    'Arc Runner: 4 → 3 ATK (the rival now aims with the Charged bonus in mind)'
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
