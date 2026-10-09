import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { bypass } from 'msw'
import { setupServer } from 'msw/node'
import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import { createApp } from './app.ts'
import { allHandlers } from './mocks/handlers/index.ts'
import { mockStore } from './mocks/store.ts'

// Same handlers as `pnpm dev:mock` — one source of truth for dev and tests.
const mswServer = setupServer(...allHandlers)
let http: Server
let baseUrl: string

beforeAll(async () => {
  // In tests, any request that escapes to the real internet is a bug.
  mswServer.listen({ onUnhandledFrame: 'error' })
  http = createApp().listen(0)
  await new Promise((resolve) => http.once('listening', resolve))
  baseUrl = `http://localhost:${(http.address() as AddressInfo).port}`
})
afterEach(() => {
  mswServer.resetHandlers()
  mockStore.reset()
})
afterAll(() => {
  mswServer.close()
  http.close()
})

// bypass(): calls to our own Express server skip MSW. Only the outgoing calls it makes are mocked.
const api = (path: string) => fetch(bypass(`${baseUrl}${path}`))

describe('GET /api/pokemon/:name', () => {
  it('combines PokeAPI data with the yoda translation', async () => {
    const res = await api('/api/pokemon/pikachu')
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toMatchObject({ id: 25, name: 'pikachu', types: ['electric'] })
    expect(body.yodaDescription).toContain('[mock yoda]')
  })

  it('serves a Pokémon seeded at runtime', async () => {
    mockStore.upsertPokemon({
      id: 9999,
      name: 'testmon',
      types: ['fire'],
      height: 1,
      weight: 1,
      description: 'Seeded.',
      image: null,
    })

    const res = await api('/api/pokemon/testmon')

    expect(await res.json()).toMatchObject({ id: 9999, types: ['fire'], image: null })
  })

  it('returns 502 when PokeAPI is down', async () => {
    mockStore.setScenario('pokeapi', 'down')

    const res = await api('/api/pokemon/pikachu')

    expect(res.status).toBe(502)
  })

  it('returns 404 for an unknown Pokémon', async () => {
    const res = await api('/api/pokemon/missingno')
    expect(res.status).toBe(404)
  })

  it('still answers when the translation API is rate limited', async () => {
    mockStore.setScenario('translations', 'rate-limited')

    const res = await api('/api/pokemon/bulbasaur')
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.yodaDescription).toBeNull()
  })
})
