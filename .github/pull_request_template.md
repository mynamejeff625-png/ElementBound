<!--
Title format: [X.Y.Z] type: short summary
  Example: [1.1.1] feature: multiplayer visual parity
  Non-release PRs: [docs] short summary / [test] short summary / [ci] short summary
Fill in every section. Write "N/A — reason" instead of deleting one.
-->

## Summary

<!-- One plain-language sentence the Owner can read on a phone. -->

## Changes

-
-

**Built by:** <!-- pick one or list collaborators: Codex / Claude / Owner -->
**Task / issue:** <!-- link or one-line task name -->

## Version

- [ ] Bumped `js/version.js` → `version: '___'`, label: `___`, focus: `___`
- [ ] No bump — docs / tests / CI only

## Rules parity

<!-- Gameplay-rule change? Tick each surface updated. See AGENTS.md §4. -->

- [ ] No gameplay-rule change
- [ ] `lib/cardCatalog.js` card text/data
- [ ] Live duel (`js/game.js`)
- [ ] Rival AI resolution and decision policy (`js/game.js`)
- [ ] Balance Lab simulator (`js/game.js`)
- [ ] Authoritative engine (`lib/gameEngine.js`)
- [ ] Player view / events (`lib/playerView.js`)

**Surfaces not updated, and why:**

## Security and shape changes

- [ ] None — no auth, rules, API, secrets, CSP, dependency, or document-shape changes

If anything changed:

- **Shape changes** (room / view / event fields added, removed, renamed):
- **Hidden information** (could either seat now see anything new?):
- **Auth / rules / API / CSP / dependencies:**

## Testing

| Check | Where | Result |
|---|---|---|
| Focused tests for this change | Local | ___ checks passed / N/A — reason |
| Full suite (`regression` job) | CI | Pass / Fail — link to run |
| Browser smoke (`browser-smoke` job) | CI | Pass / Fail — link to run |
| Firestore rules emulator | CI (also local if rules, auth, or `/api` changed) | Pass / Fail / N/A — reason |
| Single-player without `roomId` | CI smoke / Local | Checked / Not run — reason |

**Could not run:** Nothing / reason

## Owner playtest

<!-- Exact steps, and what "correct" looks like. Or N/A — reason. -->

1.
2.

**Expected:**

## Screenshots

<!-- Phone-sized screenshot for UI changes, before/after if possible.
     Otherwise: N/A — no visible UI change. -->
