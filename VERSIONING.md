# ElementBound update sequence

Every update starts by editing the single release record in `js/version.js`.
Set the version, label, engine, Balance Lab name, ruleset, focus, and audience
there before changing gameplay. The main menu, battle header, diagnostics,
Balance Lab reports, and browser title will update from that record.

For every release:

1. Update `js/version.js` first.
2. Implement the gameplay, interface, or content change.
3. Update the simulator whenever live combat behavior changes.
4. Add or revise focused regression checks.
5. Run `node --check js/version.js`, `node --check js/game.js`,
   `node tests/candidate-b.cjs`, and `git diff --check`.
6. Confirm the main screen shows the intended version before merging.

Historical version numbers in source comments may remain because they identify
the update that introduced a subsystem. User-facing labels and generated reports
must read from `window.EB_RELEASE`.
