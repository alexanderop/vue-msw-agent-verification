# Agent notes

## Verifying a change

Use the `verify-pokedex` skill (`.claude/skills/verify-pokedex/`). It covers launch, `./bin/mockctl doctor`, the proof bar, and a feature map with one file per UI area. Read the feature file for what you changed before driving.

## Testing against controlled API state

The backend calls external APIs (PokeAPI, funtranslations). For deterministic testing, run it with MSW mocks and seed the state you need with the `./bin/mockctl` CLI (`pnpm -s mock` works too). Don't edit handler files to get a test state.

1. Start: `pnpm dev:mock` (backend :3001, Vue :5173). Run it in the background.
2. Check: `./bin/mockctl state` prints mocked APIs, seeded Pokémon, and active scenarios as JSON.
3. Seed what you need:
   - `./bin/mockctl seed <name> --types fire,flying --description "..."` creates or updates a Pokémon
   - `./bin/mockctl remove <name>` makes PokeAPI return 404 for it
   - `./bin/mockctl scenario pokeapi down|slow|ok`
   - `./bin/mockctl scenario translations rate-limited|down|ok`
4. Verify through the app: `curl localhost:3001/api/pokemon/<name>`, or open http://localhost:5173.
5. Clean up: `./bin/mockctl reset`.

State is in memory. A restart returns to the defaults (pikachu and bulbasaur, all scenarios `ok`).
Every command prints the full new state, or an `error:` line on stderr with exit code 1.
Save and restore a setup with `./bin/mockctl state > s.json` and `./bin/mockctl load s.json`.
`./bin/mockctl --help` lists everything; `./bin/mockctl <command> --help` shows options and examples per command.
