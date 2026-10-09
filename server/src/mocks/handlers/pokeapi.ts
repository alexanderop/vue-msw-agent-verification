import { delay, http, HttpResponse } from 'msw'
import { env } from '../../env.ts'
import type { PokeApiPokemon, PokeApiSpecies } from '../../clients/pokeapi.ts'
import { mockStore } from '../store.ts'

/** Applies the active pokeapi scenario. Returns a response to short-circuit, or undefined to continue. */
async function applyScenario() {
  const scenario = mockStore.get().scenarios.pokeapi
  if (scenario === 'down') return new HttpResponse('Service Unavailable', { status: 503 })
  if (scenario === 'slow') await delay(3000)
}

export const pokeApiHandlers = [
  http.get(`${env.pokeApiUrl}/pokemon/:name`, async ({ params }) => {
    const failure = await applyScenario()
    if (failure) return failure

    const entry = mockStore.get().pokemon[String(params.name)]
    if (!entry) return new HttpResponse('Not Found', { status: 404 })

    return HttpResponse.json<PokeApiPokemon>({
      id: entry.id,
      name: entry.name,
      height: entry.height,
      weight: entry.weight,
      types: entry.types.map((name, i) => ({ slot: i + 1, type: { name } })),
      sprites: { front_default: entry.image },
    })
  }),

  http.get(`${env.pokeApiUrl}/pokemon-species/:name`, async ({ params }) => {
    const failure = await applyScenario()
    if (failure) return failure

    const entry = mockStore.get().pokemon[String(params.name)]
    if (!entry) return new HttpResponse('Not Found', { status: 404 })

    return HttpResponse.json<PokeApiSpecies>({
      flavor_text_entries: [{ flavor_text: entry.description, language: { name: 'en' } }],
    })
  }),
]
