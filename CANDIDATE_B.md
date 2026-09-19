# Alpha 0.8.54 — Candidate B

Builds on Candidate A, retaining its Nature/Earth changes.

- Tide Warden: 2 Essence, **2 ATK**, 4 HP, Guard; its damaged-trigger Flow remains.
- Soaked: the marked Manifestation's next resolved attack deals 2 less damage (minimum zero), against either a Manifestation or Bender, then consumes the mark. A canceled attack preserves the mark. Receiving damage does not consume it. Reapplication does not stack.
- Flow remains a separate draw-control mechanic. Water attacks no longer consume a target's Soaked for Flow.
- Both human/rival paths and the simulator apply attack reduction. Water and Bloom use the shared updated Tide Warden definition.
- Diagnostic and simulation bars use native progress values, with external CSS, without relaxing the Content Security Policy.
- Current candidate metadata is updated; historical migration manifest and historical lab labels are not rewritten as new migration evidence.

## Verification

Run from the repository root:

```
node --check js/game.js
node tests/candidate-b.cjs
```

The regression harness uses a separate VM with presentation/timing stubs. It exercises human and rival attacks against both target types, 0/1/2/5 damage, mark consumption, Armor, response cancellation, target mark persistence, River Serpent application, unrelated damage, Tide Warden in live/simulated Water and Bloom decks, Flow deck size, and seeded simulation determinism. Simulator internals are exposed only in the test VM; no test hook is shipped in the game.

GitHub Actions verifies the candidate commit rather than checking out the old migration branch. This does not replace actual iPhone testing.

## iPhone acceptance

1. Confirm Candidate B version and Tide Warden's 2 ATK in Codex and a match.
2. Apply Soaked; confirm the marked rival's next attack is reduced by 2 and the mark disappears, including an attack on your Bender.
3. Check Flow still offers Keep on top / Send to bottom.
4. Open developer checks and Balance Lab; confirm partial/full progress is visible, cancellation remains usable, and Clear resets the bar.
5. Restart a match and navigate back to the menu.

The Water trial still teaches Soak → Strike sequencing; it does not yet demonstrate the new defensive payoff. Broader trial redesign is outside this update.

References: [MDN style-src](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/style-src), [MDN progress](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/progress).

## Validation performed for this revision

- JavaScript syntax: passed.
- Candidate B VM regression suite: 91 assertions passed, plus progress-markup/CSP assertions.
- Browser rendering and built-in browser verification: not run; installed Playwright has no browser binaries, and browser download timed out. Native progress appearance still requires the iPhone acceptance checks above.
