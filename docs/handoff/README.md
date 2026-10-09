# Handoff: Claude session → new Claude Code chat (updated 9 Oct 2026, main @ 1.17.0)

This folder hands the Element Bound work from one Claude Code chat to the next.
Read it **after** `AGENTS.md` (the binding operating rules, loaded automatically through `CLAUDE.md`).

| File | What's in it |
|---|---|
| [01-project-state.md](01-project-state.md) | What the game is today (1.17.0): rules, decks, systems, file map additions, balance status |
| [02-work-log.md](02-work-log.md) | Everything shipped since the Phase 2 exit (PRs #80–#109), with the decisions and reasons |
| [03-balance-research.md](03-balance-research.md) | All balance findings and measurements, metric definitions, what was tried and rejected, what's parked |
| [04-next-steps.md](04-next-steps.md) | What to watch in playtest, plus the backlog. #103 is done; ask the Owner for the next task |
| [05-environment.md](05-environment.md) | How to work in this environment: git and `gh` quirks, running tests and the smoke, CI, gotchas |
| [`tools/balance/`](../../tools/balance/README.md) | The analysis scripts used for every balance number here |

## Working agreement with the Owner (unchanged)

- **Claude is the implementer for now** (Codex is unavailable): specs, code, tests, PRs. The Owner approves designs and balance changes and merges. Claude never merges.
- The Owner works **from a phone**:
  - reports and specs go to **GitHub** (issues or PR comments);
  - chat replies are short (a summary plus links);
  - anything to relay goes in one fenced code block.
- **Ask before deciding design or balance questions.** Offer 2–4 options, recommended option first and marked "(Recommended)", with numbers when available. The Owner likes efficient, logical sequencing and wants to be asked for design input.
- **The balance goal** (Owner, 7 Oct):
  - every deck wins 45–55% in simulated duels;
  - balance comes through *deck identity*, not identical stats;
  - cards stay on both fields;
  - no runaway snowball from whoever fills the field first;
  - **skill, not deck choice, should decide most duels**.
- **Stat changes are limited to ±1 ATK or HP per card** unless the Owner widens that.

## Prompt to start the new chat

Copy this block into the new Claude Code chat:

```
Read AGENTS.md, then everything in docs/handoff/ (start with README.md) and tools/balance/README.md. You are continuing as the Element Bound implementer, the role the previous Claude chat had. Confirm in 5 bullets what state the game is in (version, rules added in 1.11–1.17, balance status) and what the next task is. Then read docs/handoff/04-next-steps.md and ask me which backlog item to take next, with options and the recommended one first. Ask me any design or balance questions before changing gameplay, offering options with the recommended one first.
```
