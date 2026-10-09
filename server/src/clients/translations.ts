import { env } from '../env.ts'

interface FunTranslationsResponse {
  contents: { translated: string; text: string; translation: string }
}

/** funtranslations.com allows ~5 requests/hour on the free tier — the main reason to mock it. */
export async function translateToYoda(text: string): Promise<string> {
  const res = await fetch(`${env.translationsUrl}/yoda.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ text }),
  })
  if (!res.ok) throw new Error(`Translation failed with ${res.status}`)
  const data = (await res.json()) as FunTranslationsResponse
  return data.contents.translated
}
