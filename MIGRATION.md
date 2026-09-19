# ElementBound Modular Migration

This branch is the protected migration workspace for moving the stable Alpha 0.8.53 single-file build into a modular architecture.

## Safety contract
- `main` remains the rollback/stable build until play-test parity is confirmed.
- No gameplay, balance, AI, initiative, touch, or visual behavior should intentionally change during structural migration.
- Migrate in small checkpoints and test after each structural extraction.
- Preserve script execution order and existing globals until dependencies are explicitly mapped.
- Preserve iPhone/touch hardening and viewport behavior.
- Asset extraction must preserve exact rendered artwork and paths.
- CSP must be updated deliberately whenever scripts/styles/assets move.

## Planned layout
```
index.html
assets/
  images/
css/
  game.css
js/
  core/
  data/
  systems/
  ui/
```

## High-risk parity checks
1. Boot/startup and DOM initialization.
2. Menu navigation and deck selection.
3. Match creation, initiative, turns, responses, and AI.
4. Drag/touch targeting and iPhone gesture behavior.
5. Combat visual effects and animations.
6. Balance Lab XI and Candidate A rules.
7. Restart/rematch and state reset.
8. Asset loading and Content Security Policy.

The original `index.html` is intentionally retained unchanged at the start of migration.
