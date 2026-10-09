# 05 · Working environment notes (Claude Code cloud session)

These are lessons from the previous chat. Read them once; they save time.

## Git and GitHub

- **`gh` is a built-in proxy client, not the GitHub CLI.**
  - Only `gh api <endpoint>` works; there is no `gh pr create`.
  - To open a PR, write a JSON body to a file and run `gh api repos/mynamejeff625-png/ElementBound/pulls --input body.json`.
  - Comments go to `repos/.../issues/<n>/comments`.
  - `jq` filters work through `--jq`.
- **The repo moved its capitalisation.**
  - `origin` is `https://github.com/mynamejeff625-png/elementbound`. Pushes print "This repository moved", which is harmless.
  - Leave `origin` as it is; that URL is the one the session's proxy is set up for.
  - After a push, the local remote-tracking ref can be stale, and a stop hook may then report "unpushed commits". Fix it with an explicit fetch and upstream config:
    ```
    git fetch origin '+refs/heads/<branch>:refs/remotes/origin/<branch>'
    git config branch.<branch>.remote origin
    git config branch.<branch>.merge refs/heads/<branch>
    git rev-list --count origin/<branch>..HEAD   # expect 0
    ```
- **GitHub sometimes returns HTTP 500** on writes (issues, comments, even `git push`) for a few minutes. Wait about 3 minutes and retry. If it persists, AGENTS.md §10 allows committing a report to a `docs/` branch, and you can also send the file to the Owner.
- **CI only runs on PRs into `main`** (`pull_request: branches: [main]`). For a PR stacked on another branch, start CI by hand:
  ```
  gh api -X POST repos/mynamejeff625-png/ElementBound/actions/workflows/verify-candidate-b.yml/dispatches -f ref=<branch>
  ```
- **Find CI runs:** `gh api "repos/<R>/actions/runs?branch=<branch>"`. Jobs and the `phone-screenshots` artifact are at `.../runs/<id>/jobs` and `.../runs/<id>/artifacts`. Link both in the PR (AGENTS.md §7).
- **Stacked PRs:** when PR B targets PR A's branch, merging B lands in A's branch, not `main`. This happened once (#98 into #97). Prefer one PR into `main` at a time, or retarget B after A merges.

## Running checks locally

- **Full regression list:** every `- run:` line in `.github/workflows/verify-candidate-b.yml` except npm, Playwright, Java and Firebase lines. The previous chat looped over them:
  ```
  grep -E "^\s+- run: " .github/workflows/verify-candidate-b.yml | grep -vE "npm (ci|install|run test:firestore)|playwright|e2e|java|firebase" | sed 's/^\s*- run: //'
  ```
- **Phone smoke:**
  ```
  NODE_PATH=$(npm root -g) node tests/e2e/smoke.cjs
  ```
  It uses the globally installed Playwright 1.56 and its Chromium. `npm install playwright` is blocked (403), so don't try. The smoke writes screenshots to `test-results/screenshots/` (gitignored) and runs the in-game System Check.
- **`npm ci` fails here** (the registry returns 403), and it can leave `node_modules` empty. The tests don't need it. Say "CI runs it" in the PR.
- **The Firestore rules emulator needs Java,** which isn't installed. CI runs it.
- **Ad-hoc screenshots:** start a tiny `http.createServer` on the repo root, open the page with Playwright, and call game functions through `page.evaluate`. For example: `choice='EARTH';diff='Difficult';startMatch()`, then `ebInitiativeSkip()` until `G.initiative.finished`; or `goTome()`, click "Open the Tome", then `EB_Tome.flipTo(index)`.

## Patterns that worked

- **Live-rule tests:** load `js/game.js` in a Node `vm`.
  - Slice off the trailing `setup();`.
  - Stub `add/render/bump/ebQueueFx/modal/hideModal`.
  - Expose simulator internals by string-replacing `return Object.freeze({DECKS:` inside `EB_BALANCE` (e.g. `_makeState`, `_playTechnique`, `_doPlay`, `_startTurn`).
  - See `tests/second-techniques-1.11.0.cjs`, `tests/rally-ward-1.12.0.cjs` and `tests/second-wind-1.13.0.cjs`.
- **Parity tests:** run one scenario through all four rule surfaces — the engine (`validateAndApplyMove`), live `play()`, the rival `ai()` (stub `expireAllRoundEffects`/`turnStart` to isolate a card) and the Lab — and require identical summaries.
- **Mutation-check every new test:** break the rule temporarily and confirm the test fails.
- **Tome edits:**
  - Change `docs/TOME.md` and `js/tomeData.js` together. The data file is one JSON blob: pages compact, synonyms with default spacing.
  - Edit it by parsing the JSON, changing it, and re-serialising in the same format. The previous chat used a Python helper for this.
  - Adding a Core Terms page changes the counts in `tests/tome-1.7.0.cjs`: 33 entries before Effects at a Glance, 64 pages in total.
- **Version bumps:** `js/version.js` plus the `crosswind-attack-debuff-0.8.62` pin for `ruleset` and `balanceLab`.
- **Owner on a phone:** use the `AskUserQuestion` tool (2–4 options, recommended first) for decisions. Keep chat summaries short, and put the detail in GitHub.
