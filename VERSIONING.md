# Element Bound update sequence

The policy for when and how to bump the version lives in `AGENTS.md` §5. This
file is the step-by-step procedure for a player-facing release.

`js/version.js` holds the single release record (`window.EB_RELEASE`). The main
menu, battle header, diagnostics, Balance Lab reports, and browser title all
read from it.

For every player-facing release PR (docs-, test-, and CI-only PRs skip this):

1. Update `js/version.js` first: set `version` to the branch suffix and update
   `label` and `focus`. Change `engine`, `ruleset`, `balanceLab`, and `audience`
   only when they actually change.
2. Implement the gameplay, interface, or content change.
3. Work through the rules parity checklist in `AGENTS.md` §4, including the
   Balance Lab simulator whenever live combat behavior changes.
4. Add or extend focused regression tests, and list any new test file in
   `.github/workflows/verify-candidate-b.yml`.
5. Run the checks in `AGENTS.md` §7 (including the full workflow command list)
   and `git diff --check`.
6. Before merging, the Owner confirms the main screen shows the intended version.

Historical version numbers in source comments may remain because they identify
the update that introduced a subsystem. User-facing labels and generated reports
must read from `window.EB_RELEASE`.
