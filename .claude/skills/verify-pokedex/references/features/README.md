# Pokédex feature map

Behaviour-level inventory of the Pokédex app. Agents use it to decide what to drive and what evidence counts. Humans use it as the regression checklist.

## Baseline preconditions

- `pnpm dev:mock` running, `./bin/mockctl doctor` all ok.
- Mock state at defaults: `pikachu` (#25) and `bulbasaur` (#1), every scenario `ok`.
- Selectors are `data-testid`, `role`, and `aria-label` only.
- After any search, `wait` on `[data-testid=pokemon-card]` or `[role=alert]`. The mocked translation adds ~300 ms, and the `slow` scenario adds 3 s.

## Proof and skip reporting

- Exercise every path in the relevant feature file that your change can affect, and record both the action and the final state.
- Mock seeding counts as long as it goes through `mockctl`. MSW sits where the real network would be.
- If a path is unreachable (for example the real translation API is rate limited), name it, say why, and cover the closest mocked path.

## Full sweep

Walk top to bottom, then `journeys.md`. Run `./bin/mockctl reset` between files.

- [mode-badge](mode-badge.md): Badge showing which external APIs are mocked.
- [pokemon-search](pokemon-search.md): Search form: submit, loading, success, not found, empty input.
- [pokemon-card](pokemon-card.md): Result card: sprite, id, name, types, description.
- [yoda-translation](yoda-translation.md): Translated description and its graceful fallback.
- [upstream-failures](upstream-failures.md): PokeAPI down or slow.
- [real-api-smoke](real-api-smoke.md): Same flows against the real APIs (manual opt-in, rate limited).
- [journeys](journeys.md): Multi-step flows that cross features.

## Entry contract

Every feature file uses the same four H2s:

1. `Sub-features`
2. `How to get to it (user POV)`
3. `Driving it`
4. `Gotchas`
