# Pokémon search

Text input + Search button. Calls `GET /api/pokemon/:name` through the Vite proxy.

## Sub-features

- submit-button: click "Search"
- submit-enter: press Enter in the input
- loading: button text becomes "Loading…" and the button is disabled while the request runs
- success: `[data-testid=pokemon-card]` renders, previous result/error cleared
- case-insensitive: "Bulbasaur" finds `bulbasaur` (the backend lowercases)
- not-found: `[role=alert]` "No Pokémon called "<name>"", no card
- empty-input: empty or whitespace-only submit → `[role=alert]` "Enter a Pokémon name to search.", no card, no request, button stays enabled

## How to get to it (user POV)

Input is prefilled with "pikachu". Type a name, then press Enter or click Search.

## Driving it

```bash
agent-browser fill 'input[aria-label="Pokémon name"]' Bulbasaur
agent-browser press Enter
agent-browser wait '[data-testid=pokemon-card]'

agent-browser fill 'input[aria-label="Pokémon name"]' missingno
agent-browser press Enter
agent-browser wait '[role=alert]'
agent-browser get text '[role=alert]'                  # No Pokémon called "missingno"
agent-browser get count '[data-testid=pokemon-card]'   # 0
```

Empty input:

```bash
agent-browser fill 'input[aria-label="Pokémon name"]' '   '
agent-browser press Enter
agent-browser get text '[role=alert]'                  # Enter a Pokémon name to search.
agent-browser get count '[data-testid=pokemon-card]'   # 0
agent-browser network requests --filter /api/pokemon   # no request for the empty search
```

Loading state: `mockctl scenario pokeapi slow`, search, then within 3 s `get text button` → "Loading…" and `is enabled button` → false.

## Gotchas

- Empty input is validated in the Vue app. `curl localhost:3001/api/pokemon/` (no name) still returns Express's HTML 404, which is expected. If the UI ever shows `Unexpected token '<'…` again, the client guard was removed.
- `fill` replaces the prefilled "pikachu". `type` appends to it.
