---
name: verify-pokedex
description: "Prove a change to the Pokédex app (Vue + Node BFF + MSW-mocked external APIs) works in the running dev server. Use after changing the Vue UI, Express routes, API clients, or mock handlers, and for screenshots, end-to-end evidence, or a broad regression sweep."
---

# Verify Pokédex

Drive the running app the way a user does: the Vue UI with `agent-browser`, and the backend with `curl`. Set up the external-API state you need with `./bin/mockctl` instead of editing handlers.

`./bin/mockctl --help` and `agent-browser --help` are the authoritative references. `./bin/mockctl <command> --help` shows the options for each command.

## Launch

```bash
pnpm dev:mock          # run in the background: backend :3001 (MSW on), Vue :5173
./bin/mockctl doctor   # every line must say ok before you drive anything
```

- `doctor` FAIL `backend reachable`: the server is not up yet, or crashed. Read its output.
- `doctor` FAIL `mocks enabled`: someone is running `pnpm dev` (real APIs) on :3001. Don't kill a server you didn't start. Ask, or use other ports via `PORT` / `--url`.
- `doctor` FAIL `mock state is modified`: earlier seeding is still active. Run `./bin/mockctl reset` unless you set it up on purpose.
- Backend and Vite both hot-reload (`node --watch`, Vite HMR). A server restart wipes mock state back to the defaults.

## Evidence

Write every artifact (screenshots, saved state, logs) to `evidence/` in the project root. It is gitignored. Don't use `/tmp`, and don't write outside the project.

```bash
mkdir -p evidence
pnpm dev:mock > evidence/dev.log 2>&1 &   # keep the server log with the proof
```

## Stop

Stop only the servers on your own ports, never `pkill node` or `pkill vite`, because another agent or the user may be running theirs:

```bash
kill $(lsof -ti tcp:${PORT:-3001} -sTCP:LISTEN) $(lsof -ti tcp:${WEB_PORT:-5173} -sTCP:LISTEN)
./bin/mockctl doctor   # "FAIL backend reachable" now means it's really down
```

## Isolated runs

When another dev server or agent may already be running, use your own ports and browser session. Export them once and every tool picks them up:

```bash
export PORT=3101 WEB_PORT=5174 AGENT_BROWSER_SESSION=verify-3101
pnpm dev:mock           # backend :3101, Vue :5174 (proxying to :3101)
./bin/mockctl doctor    # mockctl reads PORT / WEB_PORT too
agent-browser open http://localhost:$WEB_PORT
```

The examples below use the default ports. Substitute yours.

## Drive

```bash
# set up the world the change needs
./bin/mockctl seed charizard --id 6 --types fire,flying --description "Breathes fire."
./bin/mockctl scenario translations rate-limited

# user path in the browser
agent-browser open http://localhost:5173
agent-browser fill 'input[aria-label="Pokémon name"]' charizard
agent-browser press Enter
agent-browser wait '[data-testid=pokemon-card]'
agent-browser get text '[data-testid=pokemon-card]'
agent-browser screenshot evidence/charizard-card.png

# backend contract, same request the UI makes
curl -s localhost:3001/api/pokemon/charizard
```

## Proof bar

"The page loads" is not proof. A proof runs the real user path and shows the result a skeptical reviewer would accept.

- Run `doctor` first. Evidence from the wrong server (real mode, stale state) doesn't count.
- Read the feature file(s) under `references/features/` for what you changed. Exercise every path it lists that your change can affect: success, not-found, empty, upstream error, slow, degraded.
- Drive through the UI: type, press Enter, click. Use `curl` to show the backend contract, not instead of the UI.
- Assert end states with selectors (`get text`, `get count`, `is enabled`), not just a screenshot. Use `wait <selector>`, never a fixed sleep, for anything after a request.
- Mocks are the production boundary here. MSW replaces only the outgoing HTTP to PokeAPI/funtranslations, and the Express route, client code and Vue app all run for real. Don't bypass that by calling handlers or `mockStore` directly as proof.
- If a change touches real-API behaviour (client URLs, response parsing), also run `real-api-smoke.md`.
- Finish with `./bin/mockctl reset` so the next agent starts clean, `agent-browser close`, then stop your servers (see Stop).

## Driving conventions

- Selectors: `[data-testid=...]`, `[role=alert]`, `input[aria-label="Pokémon name"]`. Don't use class selectors.
- `agent-browser snapshot` gives the accessibility tree with refs when you need to discover something new.
- Every `mockctl` command prints the full new state. Read it to confirm the seed took effect.
- To save and restore a complex setup: `./bin/mockctl state > evidence/s.json`, then later `./bin/mockctl load evidence/s.json`.

## Feature map

The behaviour inventory lives in [`references/features/`](references/features/README.md). Each file uses the same four H2s: `Sub-features`, `How to get to it (user POV)`, `Driving it`, `Gotchas`.
