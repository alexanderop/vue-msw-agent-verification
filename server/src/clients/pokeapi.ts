import { env } from '../env.ts'

export interface PokeApiPokemon {
  id: number
  name: string
  height: number
  weight: number
  types: { slot: number; type: { name: string } }[]
  sprites: { front_default: string | null }
}

export interface PokeApiSpecies {
  flavor_text_entries: { flavor_text: string; language: { name: string } }[]
}

export class PokemonNotFoundError extends Error {}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${env.pokeApiUrl}${path}`)
  if (res.status === 404) throw new PokemonNotFoundError(path)
  if (!res.ok) throw new Error(`PokeAPI ${path} failed with ${res.status}`)
  return res.json() as Promise<T>
}

export const pokeApi = {
  getPokemon: (name: string) => get<PokeApiPokemon>(`/pokemon/${name}`),
  getSpecies: (name: string) => get<PokeApiSpecies>(`/pokemon-species/${name}`),
}
