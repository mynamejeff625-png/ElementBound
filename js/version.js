/* Element Bound release metadata — update this file first for every new release. */
window.EB_RELEASE=Object.freeze({
  version:'1.5.0',
  label:'Main Menu',
  engine:'EB-1.1.2',
  balanceLab:'Balance Lab XIX',
  ruleset:'EB-RULES-0.8.62-BALANCE-PASS',
  focus:"New main menu · What's New · Play with Friends",
  audience:'Prime & Hybrid Benders',
  notes:Object.freeze([
    'A new main menu with a calmer background',
    'Play with Friends now has its own screen',
    'Choose your deck with every card in view'
  ])
});

(function applyElementBoundVersion(){
  const r=window.EB_RELEASE;
  const text={
    home:`Alpha ${r.version} · ${r.label} · ${r.focus} · ${r.audience}`,
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
