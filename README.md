# Agent-verifiable frontend: Vue + Node + MSW 3 + a verification skill

A small Pokédex app that shows one pattern: **give a coding agent a way to prove your frontend works**, end to end, with external APIs it can control from the command line.

- Vue app → Node (Express) backend → external APIs (PokeAPI, funtranslations)
- MSW 3 runs inside the backend and replaces those external APIs when you start in mock mode
- `mockctl`, a CLI, changes what the mocks return while the app runs: seed data, simulate outages, rate limits, slowness
- A **verification skill** tells an agent how to start the app, check it's healthy, drive it, and what counts as proof

The idea comes from [poteto](https://github.com/poteto)'s **pstack**: its [`create-verification-skill`](https://github.com/cursor/plugins/tree/main/pstack) and `maintain-verification-skill` skills, the `prove-it-works` principle, and the public [verification-skill-example](https://github.com/poteto/verification-skill-example). This repo applies that shape to a typical web stack with mocked external APIs. There's a Claude Code port of pstack at [alexanderop/pstack-claude](https://github.com/alexanderop/pstack-claude).

## Quick start

Needs Node ≥ 22.12 and pnpm.

```bash
pnpm install
pnpm dev:mock                 # backend :3001 with MSW, Vue :5173
./bin/mockctl doctor          # all lines should say "ok"
./bin/mockctl --help
```

Then try:

```bash
./bin/mockctl seed charizard --id 6 --types fire,flying --description "Breathes fire."
./bin/mockctl scenario translations rate-limited
# search "charizard" at http://localhost:5173: card renders, translation falls back
./bin/mockctl reset
```

Other modes:

```bash
pnpm dev                          # everything real
MOCK_APIS=translations pnpm dev   # real PokeAPI, mocked translation API
pnpm test                         # Vitest, same handlers
```

## How it works

```
 Browser / agent-browser                 mockctl (CLI)
        │                                     │
        ▼                                     ▼
  Vue app :5173 ──/api proxy──▶  Express :3001 ──── /__mocks/*  (only in mock mode)
                                    │                  │
                                    │ fetch()          ▼
                                    ▼             mock store (in memory)
                              MSW setupServer ◀────────┘ handlers read it per request
                                    │
                          (unmocked APIs pass through)
                                    ▼
                         pokeapi.co   funtranslations.com
```

### 1. MSW at the network boundary of the backend

The backend is what talks to third parties, so that's where mocking belongs. `server/src/index.ts` reads `MOCK_APIS` (`all` or a comma list) and, only then, dynamically imports MSW. MSW is a devDependency and never loads in production. The server refuses to start with mocks if `NODE_ENV=production`.

`onUnhandledFrame: 'bypass'` sends anything you didn't mock to the real network. That's what makes partial mocking work. Tests use `'error'` instead, so a test fails if any request leaks to the real internet.

Everything above the network still runs for real: Express routes, API clients, response mapping, the Vue app. The mock replaces only what you can't control.

### 2. A mock store and a control API

Handlers don't return fixed fixtures. They read `server/src/mocks/store.ts` on every request:

- `pokemon`: what PokeAPI "knows"
- `scenarios`: how each API behaves (`pokeapi: ok | slow | down`, `translations: ok | rate-limited | down`)

`server/src/mocks/control.ts` exposes that store as `/__mocks/*`. It's only mounted in mock mode, so a real or production server doesn't have it. It rejects writes that would be ignored, for example seeding Pokémon while PokeAPI is real.

### 3. `mockctl`: a CLI an agent can use without reading source

`server/scripts/mock.ts`, built with commander, run via `./bin/mockctl`:

| Command | What it does |
|---|---|
| `doctor` | Backend up? Mocks on? State still default? Vue dev server forwarding `/api`? Exits 1 with a fix hint per failure |
| `state` | Full mock state as JSON |
| `seed <name> [--id --types --description --image]` | Create or update a Pokémon |
| `remove <name>` | Make PokeAPI 404 for it |
| `scenario <api> <scenario>` | Switch behaviour |
| `load <file>` / `reset` | Restore a saved setup / the defaults |

Every command has `--help` with examples. Success prints JSON to stdout, failure prints `error: …` to stderr with exit code 1. Options and scenario names are validated, and the valid values come from the same store module the server uses. `PORT` / `WEB_PORT` let several copies run side by side.

### 4. The verification skill

`.claude/skills/verify-pokedex/`:

```
SKILL.md                     launch → doctor → evidence → drive → proof bar → stop
references/features/
  README.md                  preconditions, proof rules, sweep order, file format
  mode-badge.md  pokemon-search.md  pokemon-card.md
  yoda-translation.md  upstream-failures.md  real-api-smoke.md  journeys.md
```

Each feature file answers the same four questions under the same four headings:

1. **Sub-features**: what exists, one line each, with the exact text the user sees
2. **How to get to it (user POV)**
3. **Driving it**: copy-paste `mockctl` + `agent-browser` + `curl` commands with expected output
4. **Gotchas**: what tends to mislead (timing, look-alike states, known bugs)

The **proof bar** is the key part. "The page loads" is not proof. The agent must run `doctor` first, drive the real user path, check end states with selectors (not only screenshots), cover the success, empty, not-found, error and degraded paths the change touches, and save evidence to `evidence/`.

`AGENTS.md` points agents to it.

## Why this is useful for any frontend team

Your app is not a Pokédex, but it probably has the same problem: **the interesting states depend on systems you don't control.** Payment declined, CMS entry missing, auth provider slow, search API rate limited, a feature flag service down. Those are exactly the states that break in production and are hardest to reproduce on demand, for humans and even more for agents.

This pattern turns them into one-line commands:

```bash
./bin/mockctl scenario stripe card-declined
./bin/mockctl seed product sku-123 --stock 0
./bin/mockctl scenario auth slow
```

What you get:

- **Agents can verify, not just compile.** An agent that can put the app in a specific state and then drive the UI can prove a fix, catch a regression, or refute a wrong claim, without a human setting things up.
- **One source of truth.** Dev mode, the CLI, and unit tests all use the same MSW handlers and store, so they can't drift apart.
- **The feature map is a spec.** It's the regression checklist humans use too, kept in the repo and updated in the same PR as the UI change.
- **Cheap models become useful.** The skill does the thinking about *what* to check, so a small, fast model can do the checking (see below).
- **Framework-agnostic.** Vue, React, Svelte, Next or Nuxt: the pattern only assumes a backend calling external HTTP APIs and a browser driver. If your frontend calls third parties directly, use `msw/browser` with the same handlers and expose the store the same way.

## How Haiku used it

To test whether the skill alone is enough, three **Claude Haiku** subagents each got an isolated copy of this repo, their own ports (`PORT`, `WEB_PORT`) and browser session (`AGENT_BROWSER_SESSION`), and one instruction: read `SKILL.md` and follow it. No other hints.

| Task | What Haiku had to do | Result |
|---|---|---|
| **Fix** | "Empty search shows a weird JSON error. Fix it and prove it." | ✅ 5-line client-side guard. Recorded the bug *before* the fix, then re-ran 10 user paths after it (empty, whitespace + Enter, mixed case, not found, upstream down, slow, rate-limited) with selector checks. Updated the feature map. 78 s |
| **Blind regression sweep** | "A teammate changed something. Find what's broken." Two bugs were planted: a missing `.catch` that turns a rate-limited translation into a full-page error, and types shown as `grass, poison` instead of `grass / poison` | ✅ **Found both.** Gave the correct file and line for each, found the matching failing unit test, and flagged the separator as "possibly outdated docs, your call". 295 s |
| **Verify a PR claim** | A PR says "missing sprites now show a placeholder" and "fallback text now says 'Translation temporarily unavailable'". Both are false | ✅ Marked both **FALSE**, each backed by a selector check, a backend `curl` and a screenshot. Didn't just agree with the PR. 44 s |

All three ran `doctor` first, set up state with `mockctl` instead of editing code, saved evidence, reset state and stopped only their own servers.

What made it work:

- **The feature map supplies the expected values.** The subtle `grass, poison` bug is only visible if you know the expected output. Haiku didn't need to understand the app, only to compare against the spec.
- **`doctor` + clear CLI errors** meant no time lost on a wrong server, stale state or a mistyped scenario.
- **Copy-paste driving snippets** with expected output turn verification into following steps, which is what small models do well.

Their feedback fed back into the skill. All three independently hit the same friction, so this repo now has an `evidence/` folder instead of `/tmp` paths, a "Stop only your own servers" section, `--image <url|none>` in the help, and an empty-input driving snippet.

## Adapting it to your project

1. **Move external calls behind MSW in the layer that makes them.** One handler file per API, toggled by `MOCK_APIS`.
2. **Make handlers read a store** with data plus named scenarios per API (`ok`, `down`, `slow`, plus the ones that matter for you).
3. **Expose the store** on a dev-only route, and **wrap it in a CLI** with `--help`, JSON output, exit codes and a `doctor` command.
4. **Add stable selectors** (`data-testid`, roles, aria labels) to the UI you want verified.
5. **Write the skill:** `SKILL.md` (launch, doctor, drive, proof bar, stop) plus one feature file per UI area with the four headings. Walk it yourself once in a browser. You'll find bugs (this repo's first sweep found the empty-search bug).
6. **Test it with a cheap model** on a fix, a planted-bug sweep and a false claim. Fold its friction back in.

pstack's `create-verification-skill` automates step 5 for an existing project, and `maintain-verification-skill` keeps the feature map from drifting.

## Repo layout

```
bin/mockctl                         CLI wrapper
server/src/index.ts                 entry: MOCK_APIS → MSW + /__mocks
server/src/app.ts                   Express routes (backend-for-frontend)
server/src/clients/                 PokeAPI + funtranslations clients
server/src/mocks/handlers/          one MSW handler file per external API
server/src/mocks/store.ts           mock state + scenarios
server/src/mocks/control.ts         /__mocks HTTP API
server/scripts/mock.ts              mockctl implementation
server/src/app.test.ts              Vitest, same handlers, onUnhandledFrame: 'error'
web/                                Vue 3 + Vite
.claude/skills/verify-pokedex/      verification skill + feature map
AGENTS.md                           entry point for coding agents
```

## MSW 3 notes

- `onUnhandledRequest` is now `onUnhandledFrame`.
- Tests call the app's own server with `fetch(bypass(url))`, so only outgoing third-party calls hit the handlers.
- `vitest@5` declares a peer dependency on `msw@^2`. The warning is harmless here.

## License

MIT
