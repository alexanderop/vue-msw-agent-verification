import { http, HttpResponse, delay } from 'msw'
import { env } from '../../env.ts'
import { mockStore } from '../store.ts'

export const translationHandlers = [
  http.post(`${env.translationsUrl}/yoda.json`, async ({ request }) => {
    const scenario = mockStore.get().scenarios.translations
    if (scenario === 'down') return new HttpResponse('Service Unavailable', { status: 503 })
    if (scenario === 'rate-limited') {
      return HttpResponse.json(
        { error: { code: 429, message: 'Too Many Requests: Rate limit of 5 requests per hour exceeded.' } },
        { status: 429 },
      )
    }

    const text = new URLSearchParams(await request.text()).get('text') ?? ''
    await delay(300)
    return HttpResponse.json({
      success: { total: 1 },
      contents: { translated: `[mock yoda] ${text}, hmm.`, text, translation: 'yoda' },
    })
  }),
]
