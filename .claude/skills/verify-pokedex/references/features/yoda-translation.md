# Yoda translation

The backend sends the description to funtranslations (`POST /translate/yoda.json`). Failure must not fail the page.

## Sub-features

- translated: `[data-testid=yoda]` blockquote. In mock mode the text is `[mock yoda] <description>, hmm.`
- rate-limited: upstream 429 → `yodaDescription: null` → `[data-testid=yoda-unavailable]` "Yoda translation unavailable (rate limited?)"
- down: upstream 503 → same fallback as rate-limited
- isolation: the card (name, types, description) still renders in both failure cases

## How to get to it (user POV)

Shown under the description on every successful search.

## Driving it

```bash
./bin/mockctl scenario translations rate-limited     # or: down
agent-browser fill 'input[aria-label="Pokémon name"]' pikachu
agent-browser press Enter
agent-browser wait '[data-testid=pokemon-card]'
agent-browser get text '[data-testid=yoda-unavailable]'
agent-browser get count '[data-testid=yoda]'          # 0
curl -s localhost:3001/api/pokemon/pikachu            # "yodaDescription":null, HTTP 200
```

## Gotchas

- `rate-limited` and `down` look the same in the UI on purpose. Tell them apart in the backend response or the `[msw]` log lines, not the DOM.
- The free real API allows ~5 requests/hour, so `real-api-smoke` will often show the fallback. That's expected and not a regression.
