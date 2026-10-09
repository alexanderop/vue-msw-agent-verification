import express, { type Router } from 'express'
import { env } from './env.ts'
import { pokeApi, PokemonNotFoundError } from './clients/pokeapi.ts'
import { translateToYoda } from './clients/translations.ts'

export function createApp(options: { mockControl?: Router } = {}) {
  const app = express()

  if (options.mockControl) app.use('/__mocks', options.mockControl)

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, mockedApis: env.mockApis })
  })

  // Backend-for-frontend: one call from Vue fans out to two external APIs.
  app.get('/api/pokemon/:name', async (req, res) => {
    const name = req.params.name.toLowerCase()
    try {
      const [pokemon, species] = await Promise.all([pokeApi.getPokemon(name), pokeApi.getSpecies(name)])

      const description =
        species.flavor_text_entries
          .find((entry) => entry.language.name === 'en')
          ?.flavor_text.replace(/\s+/g, ' ') ?? ''

      // The translation API is flaky/rate limited: degrade gracefully instead of failing the request.
      const yodaDescription = await translateToYoda(description).catch(() => null)

      res.json({
        id: pokemon.id,
        name: pokemon.name,
        image: pokemon.sprites.front_default,
        types: pokemon.types.map((t) => t.type.name),
        heightDm: pokemon.height,
        weightHg: pokemon.weight,
        description,
        yodaDescription,
      })
    } catch (error) {
      if (error instanceof PokemonNotFoundError) {
        res.status(404).json({ error: `No Pokémon called "${name}"` })
        return
      }
      console.error(error)
      res.status(502).json({ error: 'Upstream API failed' })
    }
  })

  return app
}
