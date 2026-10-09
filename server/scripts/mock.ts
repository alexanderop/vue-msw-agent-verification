// mockctl: seed state in a running mock server (`pnpm dev:mock`) through its /__mocks control API.
// Success: JSON on stdout. Failure: "error: ..." on stderr, exit code 1.
import { readFile } from 'node:fs/promises'
import { Argument, Command, InvalidArgumentError, Option } from 'commander'
import { MOCKABLE_APIS, type MockableApi } from '../src/env.ts'
import { defaultState, SCENARIOS } from '../src/mocks/store.ts'

const program = new Command('mockctl')
  .description('Seed and inspect mock API state in the running dev server.\nStart the server first: pnpm dev:mock')
  .addOption(
    new Option('--url <url>', 'mock server URL').env('MOCK_SERVER_URL').default(`http://localhost:${process.env.PORT ?? 3001}`),
  )
  .addOption(
    new Option('--web-url <url>', 'Vue dev server URL (doctor only)').env('WEB_URL').default(`http://localhost:${process.env.WEB_PORT ?? 5173}`),
  )
  .showHelpAfterError('(run with --help for usage)')
  .addHelpText(
    'after',
    `
Examples:
  $ mockctl seed charizard --types fire,flying --description "Breathes fire."
  $ mockctl scenario translations rate-limited
  $ mockctl state > snapshot.json && mockctl load snapshot.json`,
  )

function fail(message: string): never {
  console.error(`error: ${message}`)
  process.exit(1)
}

async function call(method: string, path: string, body?: unknown) {
  const { url } = program.opts<{ url: string }>()
  let res: Response
  try {
    res = await fetch(`${url}/__mocks${path}`, {
      method,
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    fail(`No server at ${url}. Start it with: pnpm dev:mock`)
  }
  if (res.status === 404 && !res.headers.get('content-type')?.includes('json')) {
    fail(`${url} is running without mocks. Restart it with MOCK_APIS set, e.g. pnpm dev:mock`)
  }
  const data = await res.json()
  if (!res.ok) fail(data.error ?? `HTTP ${res.status}`)
  console.log(JSON.stringify(data, null, 2))
}

function integer(value: string) {
  const n = Number(value)
  if (!Number.isInteger(n)) throw new InvalidArgumentError('Must be an integer.')
  return n
}

program
  .command('doctor')
  .description('check that backend, mocks and Vue dev server are up and the mock state is clean')
  .addHelpText('after', '\nPrints one line per check. Exits 1 if any check fails. Run it before verifying anything.')
  .action(async () => {
    const { url, webUrl } = program.opts<{ url: string; webUrl: string }>()
    const getJson = async (target: string) => {
      try {
        const res = await fetch(target)
        return res.ok && res.headers.get('content-type')?.includes('json') ? await res.json() : null
      } catch {
        return null
      }
    }
    let failed = false
    const report = (ok: boolean, label: string, hint = '') => {
      if (!ok) failed = true
      console.log(`${ok ? 'ok  ' : 'FAIL'}  ${label}${!ok && hint ? `  -> ${hint}` : ''}`)
    }

    const health = await getJson(`${url}/api/health`)
    report(Boolean(health), `backend reachable at ${url}`, 'start it: pnpm dev:mock')
    const mocked: string[] = health?.mockedApis ?? []
    report(mocked.length > 0, `mocks enabled (${mocked.join(', ') || 'none'})`, 'restart with MOCK_APIS=all')

    const state = mocked.length > 0 ? await getJson(`${url}/__mocks/state`) : null
    if (state) {
      const { mockedApis: _ignored, ...rest } = state
      const clean = JSON.stringify(rest) === JSON.stringify(defaultState())
      report(clean, `mock state is ${clean ? 'default' : 'modified'}`, 'run: mockctl reset (or keep it on purpose)')
    }

    const proxied = await getJson(`${webUrl}/api/health`)
    report(Boolean(proxied), `Vue dev server at ${webUrl} proxies /api`, 'start it: pnpm dev:mock')

    process.exitCode = failed ? 1 : 0
  })

program
  .command('state')
  .description('print mocked APIs, seeded Pokémon and active scenarios as JSON')
  .action(() => call('GET', '/state'))

program
  .command('reset')
  .description('restore the default state (pikachu, bulbasaur, all scenarios ok)')
  .action(() => call('POST', '/reset'))

program
  .command('seed')
  .description('create or update a Pokémon served by the mocked PokeAPI')
  .argument('<name>', 'Pokémon name, e.g. charizard')
  .option('--id <n>', 'Pokédex id (random if omitted)', integer)
  .option('--types <list>', 'comma-separated types', (v: string) => v.split(',').map((t) => t.trim()))
  .option('--description <text>', 'flavor text (gets the Yoda translation)')
  .option('--height <n>', 'height in decimetres', integer)
  .option('--weight <n>', 'weight in hectograms', integer)
  .option('--image <url|none>', 'sprite URL, or "none" for no image')
  .addHelpText(
    'after',
    `
Only the fields you pass change when the Pokémon already exists.

Examples:
  $ mockctl seed charizard --types fire,flying
  $ mockctl seed pikachu --description "Updated text" --image none`,
  )
  .action((name: string, opts: Record<string, unknown>) => {
    const body = { ...opts, ...(opts.image === 'none' && { image: null }) }
    return call('PUT', `/pokemon/${encodeURIComponent(name)}`, body)
  })

program
  .command('remove')
  .description('delete a Pokémon so the mocked PokeAPI returns 404 for it')
  .argument('<name>', 'Pokémon name')
  .action((name: string) => call('DELETE', `/pokemon/${encodeURIComponent(name)}`))

program
  .command('scenario')
  .description('change how a mocked API behaves')
  .addArgument(new Argument('<api>', 'which API').choices(MOCKABLE_APIS))
  .argument('<scenario>', 'behaviour, see list below')
  .addHelpText(
    'after',
    `
Scenarios:
${MOCKABLE_APIS.map((api) => `  ${api.padEnd(14)}${SCENARIOS[api].join(' | ')}`).join('\n')}

Examples:
  $ mockctl scenario pokeapi down
  $ mockctl scenario translations rate-limited`,
  )
  .action((api: MockableApi, scenario: string) => {
    if (!(SCENARIOS[api] as readonly string[]).includes(scenario)) {
      fail(`Scenario for ${api} must be one of: ${SCENARIOS[api].join(', ')}`)
    }
    return call('PUT', `/scenarios/${api}`, { scenario })
  })

program
  .command('load')
  .description('replace the whole state from a JSON file (same shape as "state" output)')
  .argument('<file>', 'path to a JSON snapshot')
  .action(async (file: string) => {
    const { mockedApis: _ignored, ...state } = JSON.parse(await readFile(file, 'utf8'))
    return call('PUT', '/state', state)
  })

await program.parseAsync()
