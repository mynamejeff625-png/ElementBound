/* Element Bound release metadata — update this file first for every new release. */
window.EB_RELEASE=Object.freeze({
  version:'1.10.1',
  label:'Faster Online',
  engine:'EB-1.1.2',
  balanceLab:'Balance Lab XIX',
  ruleset:'EB-RULES-0.8.62-BALANCE-PASS',
  focus:'Online moves land faster: 10 s Responses, Auto-pass, lighter updates and self-healing',
  audience:'Prime & Hybrid Benders',
  notes:Object.freeze([
    'Online Response windows now last 10 seconds instead of 30',
    'New Auto-pass switch: the Initiation Token alone no longer pauses the duel',
    'Online updates are smaller, and a stalled board refreshes itself',
    'The Chronicle shows how long your last online move took'
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
