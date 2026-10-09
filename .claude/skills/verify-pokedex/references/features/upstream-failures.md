# Upstream failures

How PokeAPI problems reach the user.

## Sub-features

- pokeapi-down: upstream 503 → backend 502 → `[role=alert]` "Upstream API failed", no card
- pokeapi-slow: 3 s delay per PokeAPI call (they run in parallel, so ~3 s total) → loading state, then success
- recovery: `scenario pokeapi ok` → the next search succeeds without a reload

## How to get to it (user POV)

Search any name while PokeAPI misbehaves.

## Driving it

```bash
./bin/mockctl scenario pokeapi down
agent-browser fill 'input[aria-label="Pokémon name"]' pikachu
agent-browser press Enter
agent-browser wait '[role=alert]'
agent-browser get text '[role=alert]'               # Upstream API failed
curl -s -o /dev/null -w '%{http_code}' localhost:3001/api/pokemon/pikachu   # 502

./bin/mockctl scenario pokeapi slow
agent-browser press Enter
agent-browser get text button                       # Loading…
agent-browser wait '[data-testid=pokemon-card]'
```

## Gotchas

- Not-found (404) and down (502) are different paths. A change to error handling must cover both.
- `slow` makes every PokeAPI call slow, including your `curl` checks. Reset it once you've proven the loading state.
- The backend logs the upstream error to its console. That's expected for `down`.
