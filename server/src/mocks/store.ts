import type { MockableApi } from '../env.ts'

export interface MockPokemon {
  id: number
  name: string
  types: string[]
  height: number
  weight: number
  description: string
  image: string | null
}

export const SCENARIOS = {
  pokeapi: ['ok', 'slow', 'down'],
  translations: ['ok', 'rate-limited', 'down'],
} as const satisfies Record<MockableApi, readonly string[]>

export type Scenarios = { [Api in MockableApi]: (typeof SCENARIOS)[Api][number] }

export interface MockState {
  pokemon: Record<string, MockPokemon>
  scenarios: Scenarios
}

export const sprite = (id: number) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`

export function defaultState(): MockState {
  return {
    pokemon: {
      pikachu: {
        id: 25,
        name: 'pikachu',
        types: ['electric'],
        height: 4,
        weight: 60,
        description: 'When several of these Pokémon gather, their electricity could build and cause lightning storms.',
        image: sprite(25),
      },
      bulbasaur: {
        id: 1,
        name: 'bulbasaur',
        types: ['grass', 'poison'],
        height: 7,
        weight: 69,
        description: 'A strange seed was planted on its back at birth. The plant sprouts and grows with this Pokémon.',
        image: sprite(1),
      },
    },
    scenarios: { pokeapi: 'ok', translations: 'ok' },
  }
}

// In-memory only: restarting the server (or `mock reset`) returns to the defaults.
let state = defaultState()

export const mockStore = {
  get: () => state,
  reset: () => {
    state = defaultState()
  },
  replace: (next: MockState) => {
    state = next
  },
  upsertPokemon: (pokemon: MockPokemon) => {
    state.pokemon[pokemon.name] = pokemon
  },
  removePokemon: (name: string) => delete state.pokemon[name],
  setScenario: <Api extends MockableApi>(api: Api, scenario: Scenarios[Api]) => {
    state.scenarios[api] = scenario
  },
}
