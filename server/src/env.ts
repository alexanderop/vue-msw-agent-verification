export const MOCKABLE_APIS = ['pokeapi', 'translations'] as const
export type MockableApi = (typeof MOCKABLE_APIS)[number]

/**
 * MOCK_APIS controls which external APIs are replaced by MSW handlers.
 *
 *   unset / ""                 -> everything is real
 *   MOCK_APIS=all              -> every external API is mocked
 *   MOCK_APIS=translations     -> only the translation API is mocked, PokeAPI stays real
 *   MOCK_APIS=pokeapi,translations
 */
function parseMockApis(raw: string | undefined): MockableApi[] {
  if (!raw) return []
  if (raw === 'all') return [...MOCKABLE_APIS]

  const requested = raw.split(',').map((s) => s.trim()).filter(Boolean)
  const unknown = requested.filter((name) => !MOCKABLE_APIS.includes(name as MockableApi))
  if (unknown.length > 0) {
    throw new Error(`Unknown MOCK_APIS entries: ${unknown.join(', ')}. Valid: all, ${MOCKABLE_APIS.join(', ')}`)
  }
  return requested as MockableApi[]
}

export const env = {
  port: Number(process.env.PORT ?? 3001),
  mockApis: parseMockApis(process.env.MOCK_APIS),
  pokeApiUrl: process.env.POKEAPI_URL ?? 'https://pokeapi.co/api/v2',
  translationsUrl: process.env.TRANSLATIONS_URL ?? 'https://api.funtranslations.com/translate',
}
