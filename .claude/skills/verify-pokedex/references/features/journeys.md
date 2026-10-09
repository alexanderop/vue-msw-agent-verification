# Journeys

Flows that cross several features. Read the linked files for selectors first. Baseline preconditions in [README](README.md) apply.

## Seed → find → remove → not found

1. `./bin/mockctl seed charizard --id 6 --types fire,flying`
2. Search "charizard" → card `#6 Charizard`, `img` count 1 ([pokemon-card](pokemon-card.md))
3. `./bin/mockctl remove charizard`
4. Search again → `[role=alert]` "No Pokémon called "charizard"" ([pokemon-search](pokemon-search.md))

Proves runtime state changes reach the UI without a restart.

## Degrade, recover

1. `./bin/mockctl scenario translations rate-limited`, search pikachu → fallback text ([yoda-translation](yoda-translation.md))
2. `./bin/mockctl scenario pokeapi down`, search → "Upstream API failed" ([upstream-failures](upstream-failures.md))
3. `./bin/mockctl reset`, search → full card with `[data-testid=yoda]`

Proves errors don't stick: each new search clears the previous card and alert.

## Snapshot round trip

1. Seed two Pokémon + one scenario, then `./bin/mockctl state > evidence/s.json`
2. `./bin/mockctl reset` → doctor says "default"
3. `./bin/mockctl load evidence/s.json` → both Pokémon searchable again
