/* Element Bound release metadata — update this file first for every new release. */
window.EB_RELEASE=Object.freeze({
  version:'1.15.0',
  label:'Resonant Rivals',
  engine:'EB-1.5.0',
  balanceLab:'Balance Lab XXVII',
  ruleset:'EB-RULES-1.14.0-BALANCE-PASS',
  focus:'The Hard rival builds Resonance before it casts its Hybrid payoffs',
  audience:'Prime & Hybrid Benders',
  notes:Object.freeze([
    'Hard rival: plays a card from each parent element first, then its Resonance payoff',
    'Hard rival: keeps Resonance payoffs in hand until Resonance is on',
    'Hard rival (Storm): moves a ready Tempest Striker before it attacks'
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
