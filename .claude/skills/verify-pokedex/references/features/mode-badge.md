# Mode badge

Pill at the top of the page that says whether external APIs are real or mocked. Source: `GET /api/health`.

## Sub-features

- real-mode: green pill "Real APIs"
- mock-mode: yellow pill "Mocked: <apis>", e.g. "Mocked: pokeapi, translations"
- partial-mode: only some APIs listed, e.g. "Mocked: translations"

## How to get to it (user POV)

Visible on page load at http://localhost:5173.

## Driving it

```bash
agent-browser open http://localhost:5173
agent-browser get text '[data-testid=mode-badge]'   # Mocked: pokeapi, translations
curl -s localhost:3001/api/health                    # {"ok":true,"mockedApis":[...]}
```

Partial mode needs a restart: `MOCK_APIS=translations pnpm dev`.

## Gotchas

- Set once on mount. Restarting the backend in another mode needs a page `reload` before the badge changes.
- `mockctl scenario` doesn't change the badge. It only shows which APIs are mocked, not how they behave.
