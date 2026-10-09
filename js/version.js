/* Element Bound release metadata — update this file first for every new release. */
window.EB_RELEASE=Object.freeze({
  version:'1.17.1',
  label:'Steady Link',
  engine:'EB-1.7.0',
  balanceLab:'Balance Lab XXIX',
  ruleset:'EB-RULES-1.17.0-BALANCE-PASS',
  focus:'Online Techniques no longer freeze the board',
  audience:'Prime & Hybrid Benders',
  notes:Object.freeze([
    'Tapping ACTIVATE no longer closes the target panel or picks a target for you',
    'After a rejected online move the board refreshes at once instead of staying stale until the turn ends',
    'The online status line stops saying "waiting" once the board is up to date'
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
