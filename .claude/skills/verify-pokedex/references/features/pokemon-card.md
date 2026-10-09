# Pokémon card

Result card for a successful search. Data comes from two PokeAPI calls (`/pokemon/:name` + `/pokemon-species/:name`) merged by the backend.

## Sub-features

- sprite: `<img>` with alt = name, only when the backend returns an image
- heading: `#<id> <Name>` in an `h2` (capitalised by CSS, lowercase in the DOM text source)
- types: joined with " / ", e.g. "grass / poison"
- description: first English flavor text, whitespace collapsed
- no-image: seeded Pokémon without an id or with `--image none` render no `<img>`

## How to get to it (user POV)

Search a name that exists.

## Driving it

```bash
./bin/mockctl seed testmon --types fire,flying --description "Seeded."
agent-browser fill 'input[aria-label="Pokémon name"]' testmon
agent-browser press Enter
agent-browser wait '[data-testid=pokemon-card]'
agent-browser get text '[data-testid=pokemon-card] h2'        # #<random id> Testmon
agent-browser get count '[data-testid=pokemon-card] img'      # 0
```

With an image: `./bin/mockctl seed charizard --id 6 --types fire,flying` → `img` count 1.

## Gotchas

- Without `--id`, `seed` picks a random 5-digit id. Pass `--id` when the id is part of what you assert.
- Sprites load from raw.githubusercontent.com, so with no network the image shows as broken even though the DOM is correct. Assert the `src` attribute, not pixels.
- Real PokeAPI text is uppercase "POKéMON". Mock fixtures say "Pokémon".
