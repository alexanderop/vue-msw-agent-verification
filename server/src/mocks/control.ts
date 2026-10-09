import express, { type Request, type Response } from 'express'
import { MOCKABLE_APIS, type MockableApi } from '../env.ts'
import { mockStore, SCENARIOS, sprite, type MockPokemon, type MockState } from './store.ts'

class BadRequest extends Error {}

function parsePokemon(name: string, body: unknown, existing?: MockPokemon): MockPokemon {
  const input = (body ?? {}) as Partial<Record<keyof MockPokemon, unknown>>
  const id = input.id ?? existing?.id ?? Math.floor(10_000 + Math.random() * 90_000)
  if (typeof id !== 'number' || !Number.isInteger(id)) throw new BadRequest('"id" must be an integer')

  const types = input.types ?? existing?.types ?? ['normal']
  if (!Array.isArray(types) || types.some((t) => typeof t !== 'string')) {
    throw new BadRequest('"types" must be an array of strings')
  }

  return {
    id,
    name,
    types,
    height: Number(input.height ?? existing?.height ?? 10),
    weight: Number(input.weight ?? existing?.weight ?? 100),
    description: String(input.description ?? existing?.description ?? `A seeded test Pokémon called ${name}.`),
    // Only real PokeAPI ids have a sprite. A random id gets no image instead of a broken one.
    image: input.image === null ? null : String(input.image ?? existing?.image ?? (input.id === undefined ? '' : sprite(id))) || null,
  }
}

function parseState(body: unknown): MockState {
  const input = body as Partial<MockState> | undefined
  if (!input || typeof input.pokemon !== 'object' || typeof input.scenarios !== 'object') {
    throw new BadRequest('State must have "pokemon" and "scenarios" objects')
  }
  const pokemon = Object.fromEntries(
    Object.entries(input.pokemon).map(([name, p]) => [name, parsePokemon(name, p)]),
  )
  for (const api of MOCKABLE_APIS) {
    if (!(SCENARIOS[api] as readonly string[]).includes(input.scenarios[api])) {
      throw new BadRequest(`scenarios.${api} must be one of: ${SCENARIOS[api].join(', ')}`)
    }
  }
  return { pokemon, scenarios: input.scenarios }
}

/** HTTP API behind the `pnpm mock` CLI. Only mounted when MOCK_APIS is set. */
export function createMockControl(mockedApis: MockableApi[]) {
  const router = express.Router()
  router.use(express.json())

  const snapshot = () => ({ mockedApis, ...mockStore.get() })

  const requireMocked = (api: MockableApi) => {
    if (!mockedApis.includes(api)) {
      throw new BadRequest(`"${api}" is not mocked, so this state would be ignored. Start with MOCK_APIS=${api} or MOCK_APIS=all.`)
    }
  }

  // Every mutation responds with the full new state, so the caller can confirm what it seeded.
  const mutate = (fn: (req: Request) => void) => (req: Request, res: Response) => {
    try {
      fn(req)
      res.json(snapshot())
    } catch (error) {
      if (!(error instanceof BadRequest)) throw error
      res.status(400).json({ error: error.message })
    }
  }

  router.get('/state', (_req, res) => {
    res.json(snapshot())
  })
  router.post('/reset', mutate(() => mockStore.reset()))
  router.put('/state', mutate((req) => mockStore.replace(parseState(req.body))))

  router.put(
    '/pokemon/:name',
    mutate((req) => {
      requireMocked('pokeapi')
      const name = String(req.params.name).toLowerCase()
      mockStore.upsertPokemon(parsePokemon(name, req.body, mockStore.get().pokemon[name]))
    }),
  )
  router.delete(
    '/pokemon/:name',
    mutate((req) => {
      requireMocked('pokeapi')
      const name = String(req.params.name).toLowerCase()
      if (!mockStore.removePokemon(name)) throw new BadRequest(`No seeded Pokémon "${name}"`)
    }),
  )

  router.put(
    '/scenarios/:api',
    mutate((req) => {
      const api = req.params.api as MockableApi
      if (!MOCKABLE_APIS.includes(api)) throw new BadRequest(`Unknown api "${api}". Valid: ${MOCKABLE_APIS.join(', ')}`)
      requireMocked(api)
      const scenario = req.body?.scenario
      if (!(SCENARIOS[api] as readonly string[]).includes(scenario)) {
        throw new BadRequest(`Scenario for ${api} must be one of: ${SCENARIOS[api].join(', ')}`)
      }
      mockStore.setScenario(api, scenario)
    }),
  )

  return router
}
