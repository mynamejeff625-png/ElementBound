# AGENTS.md — Element Bound Operating Rules (v3)

Every AI agent working in this repository (ChatGPT/Codex, Claude, or any other)
reads and follows this file before changing anything.

---

## 0. Precedence and scope

1. System, platform, developer, and tool instructions always come first.
2. Direct instructions in the active task prompt come next.
3. Then this file. A deeper `AGENTS.md` overrides this one within its directory.
4. Then general repository docs and conventions.

**Security (§8) and no-merge (§2) exceptions:** if a higher-priority instruction
explicitly requires an exception to one of these rules, follow it. If a task
only appears to conflict with them without explicitly asking for an exception,
stop and ask the Owner before changing anything.

If instructions at the same or higher priority are unclear or contradict each
other, stop and ask in the task conversation before changing code.

**Owner** means the repository owner (GitHub account `mynamejeff625-png`).
**Owner approval** means an explicit approval written by the Owner in the task
prompt or in a PR comment. An agent never assumes approval.

Sections marked *(team policy)* are decisions made by the Owner, not facts that
can be derived from the code. Follow them anyway.

## 1. What Element Bound is

Facts:
- A turn-based elemental card game played in the browser: single-player vs. rival
  AI, Element Trials, Codex, How to Play, a developer System Check, Balance Lab,
  and live online 1v1 multiplayer.
- The browser client is plain JavaScript and CSS with no bundler, transpiler, or
  framework. Node dependencies are currently used only by server endpoints and
  test tooling; keeping it that way is architecture policy (see §8 for approvals).
- Single-player must always work with no `roomId` in the URL (see README).

*(team policy)*
- Hosting: two deployments of `main`. Stay on free tiers (Firebase Spark, Vercel Hobby).
  - **Vercel** serves the full game plus the `/api` serverless endpoints. This is
    the only deployment where online play works.
  - Production online URL: `https://element-bound.vercel.app/`.
  - **GitHub Pages** (`mynamejeff625-png.github.io/ElementBound/`) serves a static
    copy. It has no `/api` endpoints, so online play cannot work there;
    single-player does.
  - Why: the browser calls `/api/*` on its own origin (same-origin requests).
    Firebase Auth and Firestore are reached directly from the browser; the CSP
    `connect-src` allows `'self'` plus `https://*.googleapis.com`,
    `https://*.firebaseio.com`, and `wss://*.firebaseio.com`.
- Firebase provides Anonymous Auth and Firestore.
- Audience: mainly friends playing casually, while staying inviting to competitive players.
- Target duel length: roughly 3–8 minutes depending on deck.
- Product name in all player-facing text and docs: **Element Bound** (two words).
  Existing code identifiers (`ElementBoundCards`, `EB_*`, repo name) stay as they are.
  Code identifiers, developer-only logs and error strings, workflow names, and
  historical docs/migration files may keep "ElementBound"/"ELEMENTBOUND". All
  player-facing text uses "Element Bound".

## 2. Roles *(team policy)*

| Who | Role | Normally does | Normally does not |
|---|---|---|---|
| **Owner** | Product owner | Picks tasks, approves designs, balance, and security changes, playtests, merges | — |
| **ChatGPT / Codex** | Primary implementer | Branches, writes code and tests, opens and updates PRs, fixes review feedback | Invent mechanics, change balance numbers, or redesign UI beyond the approved spec |
| **Claude** | Architect, UI/UX lead designer, reviewer | Writes task specs and UI/UX designs, reviews PRs, maintains docs and prompts | Push commits (code or docs), **unless the Owner explicitly assigns that task to Claude** |

- Agents may push commits and open or update PRs when the task asks for it.
- Agents never merge PRs and never enable auto-merge. Only the Owner merges to `main`.
- Do not intentionally run two implementation sessions against the same branch.
  Before editing, run `git status` and check the branch's recent commits. If you
  find changes you did not make, preserve them and ask; never overwrite them.

## 3. Repository map

| Path | Purpose |
|---|---|
| `index.html` | All screens, Content-Security-Policy, and script load order |
| `css/game.css` | All styling, including reduced-motion rules |
| `assets/` | Logo, background, and other images |
| `assets/fonts/` | Self-hosted Cinzel and Nunito Sans (SIL OFL; keep the `OFL-*.txt` files beside them) |
| `assets/medallions/`, `assets/frames/` | Owner-made element/result medallions and the card frames (bronze default, gold special) (usage rules: `docs/DESIGN.md` §5a) |
| `js/version.js` | Player-facing release record (see §5) |
| `js/game.js` | Browser game: live duel loop, rival AI, UI and FX, Balance Lab simulator, in-browser dev checks, multiplayer adapter (`EB_MP`) |
| `js/arena.js`, `css/arena.css` | Phase 3 Arena duel field (one-screen layout behind `?arena=1`); layout only, never duel state or rules |
| `js/firebaseBootstrap.js`, `js/multiplayerClient.js`, `js/matchmakingClient.js` | Online play client |
| `lib/cardCatalog.js` | Card data and rules text (Manifestations, Techniques, Responses, hybrids). Loaded by the browser and Node |
| `lib/gameEngine.js` | Pure, DOM-free authoritative rules engine. Used by the server, loaded in the browser (`window.ElementBoundEngine`), and used by Node tests |
| `lib/matchFactory.js` | Builds match state. Loaded by the browser and the server |
| `lib/playerView.js` | Builds each seat's private, filtered view (the main privacy filter) |
| `lib/firebaseAdmin.js` | Admin SDK setup (server only) |
| `api/submit-move.js`, `api/create-room.js`, `api/join-room.js`, `api/firebase-config.js` | The four Vercel endpoints |
| `firestore.rules`, `firebase.json` | Firestore security rules and emulator config |
| `tests/*.cjs` | Regression tests. Only tests listed in the workflow run in CI |
| `tests/e2e/smoke.cjs` | Browser smoke test (CI job `browser-smoke`): real Chromium at 375×667 and 390×844, fails on page errors; phone screenshots are attached to each CI run |
| `.github/workflows/verify-candidate-b.yml` | Main CI; runs on every PR to `main` |
| `.github/pull_request_template.md` | Required PR description format |
| `.gitignore` | Untracked and generated files Git should ignore (dependencies, secrets, logs) |
| `package.json`, `package-lock.json` | Server and test dependencies |
| `README.md` | Multiplayer deployment and environment setup |
| `VERSIONING.md` | Release procedure (keep consistent with §5) |
| `docs/DESIGN.md` | Binding UI/UX design system: tokens, frames, components, icons, layout rules, roadmap. Read before any UI work |
| `docs/TOME.md` | How to Play (the Bender's Tome) content: lessons, glossary pages and page-format rules |
| `docs/DECK_GUIDES.md` | "How this deck wins" guide text for all nine decks (mirrored in `js/deckGuides.js`) |
| `CANDIDATE_B.md`, `MIGRATION.md`, `MIGRATION_MANIFEST.json`, `migration/` | Historical migration records. Do not edit unless asked |

## 4. Rules parity checklist

Game rules are implemented in more than one place. For **any gameplay-rule change**,
check each surface below and either update it or state in the PR why it does not apply:

- [ ] Card text and data: `lib/cardCatalog.js`
- [ ] Live duel resolution: `js/game.js`
- [ ] Rival AI resolution **and** decision policy: `js/game.js`
- [ ] Balance Lab simulator: `js/game.js` (do not copy simulator-only telemetry into live or server code)
- [ ] Authoritative engine: `lib/gameEngine.js`
- [ ] Player view and events, if the change adds state or events: `lib/playerView.js`
- [ ] Focused tests proving the updated surfaces agree

Response cards need extra care. Keep before-damage vs. after-damage timing,
token-funded vs. card-funded responses, server deadlines, and hidden legal
options consistent across single-player, AI, and server.

## 5. Versioning

There are separate version concepts. Do not synchronize them with each other:

| Field | Meaning |
|---|---|
| `EB_RELEASE.version` in `js/version.js` | **Player-facing release.** Shown on the main menu, battle header, diagnostics, Balance Lab, and browser title |
| `label`, `focus`, `audience` | Player-facing release description |
| `engine`, `ruleset`, `balanceLab` | Engine, ruleset, and Balance Lab identifiers |
| Branch suffix (e.g. `-1.1.1`) | The release number that branch is building toward |
| `package.json` `version` | npm metadata only. Never change it for a release |

**Policy *(team policy)*:** Any PR that changes what players see or how the game
plays must update `js/version.js`: set `version` to the branch suffix and update
`label` and `focus`. Update `engine`, `ruleset`, and `balanceLab` only when those
actually change. Docs-only, test-only, and CI-only PRs do not bump the version.

History note: the multiplayer work through 1.1.1 (merged in PR #31) did not
bump `js/version.js`; issue #35 reconciled the player-facing version to 1.1.2.
The policy above applies to every later PR. `VERSIONING.md` follows this section.

## 6. Branches, commits, and PRs

Branch formats:
- Player-facing release work: `type/short-name-X.Y.Z`
  (types: `feature`, `fix`, `hotfix`, `refactor`).
- Non-release work: `docs/short-name`, `test/short-name`, or `ci/short-name`
  (no version suffix).

Do not use agent-named prefixes (`claude/`, `codex/`, `chatgpt/`). Always
allowed, never renamed: a branch name the Owner explicitly supplies, branches
provided by the platform or task environment, and existing historical branches.

Commits:
- Focused commits with clear messages.
- Stage files explicitly. Never use `git add -A` or `git add .` when unrelated
  changes exist.
- Never commit `node_modules/`, emulator logs, `.env` files, keys, or debug output.
  `.gitignore` blocks most of these, but still check `git status` before committing.
  Never edit `.gitignore` to un-ignore secrets.
- Never clean, reset, stash, or delete changes you did not make.
- No force-push, amend, or rebase of pushed work without Owner approval.
- If the task says not to push until reviewed, do not push.

Every PR fills in `.github/pull_request_template.md` completely. Do not delete
sections; write "N/A" with a reason instead. PR title format:
- Release PRs: `[X.Y.Z] type: short summary` (e.g. `[1.1.2] fix: reconnect window`)
- Non-release PRs: `[docs] short summary`, `[test] short summary`, or `[ci] short summary`

Deleting a branch after merge is the Owner's repository-maintenance task.

## 7. Checks before requesting review

CI (`.github/workflows/verify-candidate-b.yml`) runs the **full** suite on every
push to a PR: every regression test, the Firestore rules emulator, and the
phone browser smoke. **CI is the full gate.** Agents check what they changed,
then let CI run everything else.

Before every push:
1. **Read what you change.** Read every function or section you change, plus
   its direct callers and callees. In large files (e.g. `js/game.js`), find the
   code with search (`rg`/`grep`) and read those sections, not the whole file.
2. `node --check` on every changed `.js` and `.cjs` file.
3. **Focused tests:** run every test file that covers code you changed, plus
   any new test. Find them by searching `tests/` for the changed function or
   file name.
4. Whitespace: `git diff --check` (unstaged) **and** `git diff --cached --check`
   (staged). Then review the staged diff and `git status` before committing.

Also run locally, by change type:
- **Gameplay rules:** parity tests (§4), plus the Balance Lab parity tests if the simulator changed.
- **Multiplayer or server:** endpoint tests and the tests covering both seats'
  views. If `firestore.rules`, auth, or an `/api` endpoint changed, also
  `npm run test:firestore-rules` (needs Java 21).
- **Security rules or auth:** everything above, plus Owner approval.
- **UI:** extend `tests/e2e/smoke.cjs` when a change adds a screen or flow. Run
  it locally only if you changed it and a browser is available; otherwise CI
  runs it.
- **Workflow or executable config** (`.github/workflows/`, `package.json`,
  `package-lock.json`, `firebase.json`): run the full command list in the
  workflow locally (`npm ci` first).

After pushing:
- Wait for CI. Request review only when **every** job passes. If a job fails,
  read its log, run just the failing test locally, fix, and push again.
- In the PR's Testing table, mark each check as run **locally** or by **CI**,
  and link the CI run. For UI changes, link the `browser-smoke` job's
  `phone-screenshots` artifact in the Screenshots section (the Owner reviews UI
  changes from those).

Docs-only, PR-template, and `.gitignore` changes: both whitespace checks, `git status`,
and confirm any paths or commands the docs mention actually exist. CI covers the rest.

New behavior needs focused automated coverage. Extend a relevant existing test
file when one fits; otherwise add a new file **and** add it to the workflow
(files not listed there never run).

If a check cannot be run in your environment (no browser, no Java), say so in
the PR. Never claim a check passed that you did not run.

## 8. Security and multiplayer invariants (non-negotiable)

Authority:
- All online moves go through `/api/submit-move`. Clients never write game state to Firestore.
- The server derives the seat from the verified Firebase ID token. Never trust a
  client-supplied `uid`, `actor`, or `playerSlot`. Keep the revision check.
- The move is applied and **both** player views are written in the same Firestore
  transaction, after every accepted state change.
- Clients render the board only from their own `rooms/{roomId}/views/{uid}`
  snapshot. An HTTP success never authorizes a client-side board change.
- Authoritative timing (response deadlines, expiry) uses server time only, never
  the client clock.

Privacy:
- Views and events never reveal the opponent's hand, deck order, drawn card
  names, or private Response options.
- Any change to room, view, or event document shapes (`pendingResponse`,
  `serverNow`, event `seq`, etc.) is a privacy and sync change. Flag it in the PR
  and test it for both seats.
- State, events, and both player views must be Firestore-safe with no `undefined`
  values. Events are built through the engine's `withoutUndefined` helper. Add
  deep-scan regression coverage whenever these shapes change. (There is currently
  no runtime scan before each write; adding one is a separate, approved code task.)

Event stream:
- Events are ordered by the server's increasing `seq`, and old events must not
  replay on reconnect.
- Seat and actor fields are converted to each player's perspective.
- History stays bounded (currently the last 200 events).
- Client FX and logs may react to events; the board still comes only from snapshots.

Secrets and infrastructure:
- `firestore.rules` stays deny-by-default. Any change needs Owner approval and
  must pass the emulator rules suite.
- Never commit or log secrets: private keys, service-account JSON, ID tokens,
  `Authorization` headers. Never put tokens in URLs. Admin credentials exist only
  as Vercel environment variables. `/api/firebase-config` returns public web config only.
- Owner approval is required for: new browser scripts or CDN hosts, Firebase SDK
  version changes, Content-Security-Policy changes, new server runtime packages,
  new dev/test packages, and any paid service.
- Never weaken, skip, or delete a test to make CI pass. Fix the code or ask.

## 9. UI/UX direction *(team policy)*

Claude designs and Codex implements from the approved spec. Record decisions in
`docs/DESIGN.md`. Create that file with the first real design decision; never add
an empty placeholder.
- Match the art style of the main-page logo and background. Not neon, not flat-minimal.
- Minimal UI with detailed framed outlines.
- Orange must not be the dominant general UI color. Keep Fire and Magma
  oranges/reds, warning colors, and the gold initiative coin where they carry meaning.
- Reuse shared CSS classes and rendering helpers (e.g. `.primary`, `.ghost`) so
  that changing one component type updates all of it. Avoid new inline styles
  when a shared class can be extended.
- Portrait-first; must work well on a phone.

Accessibility: **new or modified** UI must meet these rules. Existing UI does not
fully meet them yet (e.g. the initiative overlay, modal focus handling). Do not
expand a focused task into unrelated legacy cleanup; flag existing violations
in the PR and ask whether to fix them separately.
- Controls work by both touch and keyboard, with visible focus states.
- Respect `prefers-reduced-motion`.
- Keep ARIA labels and live regions for status changes.
- Touch targets at least 44×44 px.
- Focus moves into a modal when it opens and returns to the opener when it closes.
- Every modal has an intentional exit. Informational and selection modals are
  dismissible. Rules-critical modals (e.g. the Response Window, `dismissible:false`)
  exit only through a game action such as PASS.
- Never convey information by color alone.

## 10. Handoffs between the Owner and agents *(team policy)*

The Owner works mostly from a phone, where moving files between AI apps is slow
and error-prone. GitHub is the primary channel; manual relay is the fallback.

**GitHub first:**
- Task specs are **GitHub issues**, written by Claude or the Owner. Codex is
  started with a one-line prompt such as "Implement issue #N per AGENTS.md" and
  reads the spec from GitHub.
- Each issue is sized to **one focused change** that a single agent task can
  finish. Claude splits larger features into numbered issues, so no single
  task has to read, change, and re-test most of the codebase.
- Work is delivered as **PRs**. Reviews, questions, and review responses go in
  **PR comments**. Ask Codex for a re-review by commenting `@codex review`.
- Reports meant for the Owner (audits, reviews, balance reports) are posted as
  an issue or PR comment, or committed to a `docs/` branch. Never deliver them
  only in a chat window.
- Playtest screenshots are attached to the issue or PR comment (the GitHub
  mobile app supports image uploads).

**Manual relay (fallback):**
- Never require the Owner to upload, attach, or paste files **into** Codex. If
  an agent needs a file, read it from the repo; if it is not in the repo, ask
  the Owner to commit it or share a link.
- Agents may give the Owner files to download; the Owner can forward those to
  another agent.
- Any message meant to be relayed to another agent goes in **one** fenced code
  block with no other text inside, so the Owner can copy it with a single tap.
- In chat, keep replies to a short summary plus the relevant issue or PR link.

## 11. When unsure

Ask in the active task conversation before changing code. If a PR already
exists, ask there. Never push a speculative implementation just to ask a
question, rewrite a system in a new pattern, or touch files outside the task.
