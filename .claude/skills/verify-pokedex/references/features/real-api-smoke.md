# Real API smoke

The same flows against the real PokeAPI and funtranslations. Opt-in: it hits the network and burns the translation rate limit.

## Sub-features

- real-search: `pikachu` returns id 25, type electric, real flavor text
- real-not-found: an unknown name gives the 404 alert
- partial-mock: `MOCK_APIS=translations` uses real PokeAPI with the mocked translation

## How to get to it (user POV)

Start with `pnpm dev` instead of `pnpm dev:mock`. The badge says "Real APIs".

## Driving it

```bash
pnpm dev                                    # only if no other dev server is running
curl -s localhost:3001/api/health           # "mockedApis":[]
curl -s localhost:3001/api/pokemon/pikachu  # real data, "POKéMON" uppercase
./bin/mockctl doctor                        # FAIL mocks enabled is expected here
```

## Gotchas

- `mockctl` commands fail on purpose in real mode ("running without mocks").
- `yodaDescription: null` is the normal real-mode result once the hourly limit is used up.
- Use it to check client URLs and response parsing. Don't rely on it for repeatable evidence. Use the mocked files for that.
