/* Element Bound release metadata — update this file first for every new release. */
window.EB_RELEASE=Object.freeze({
  version:'1.8.2',
  label:'Auto connect',
  engine:'EB-1.1.2',
  balanceLab:'Balance Lab XIX',
  ruleset:'EB-RULES-0.8.62-BALANCE-PASS',
  focus:'Play with Friends connects by itself',
  audience:'Prime & Hybrid Benders',
  notes:Object.freeze([
    'Play with Friends now connects by itself, no button needed',
    'Long card names show in full when a card is zoomed',
    'Tome pages now follow your finger when you swipe'
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
