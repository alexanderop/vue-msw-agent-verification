import { setupServer } from 'msw/node'
import type { MockableApi } from '../env.ts'
import { handlersByApi } from './handlers/index.ts'

export function startMocking(apis: MockableApi[]) {
  const server = setupServer(...apis.flatMap((api) => handlersByApi[api]))

  // 'bypass': requests to APIs that are NOT mocked go to the real network.
  // That is what makes partial mocking (MOCK_APIS=translations) work.
  server.listen({ onUnhandledFrame: 'bypass' })

  server.events.on('request:match', ({ request }) => {
    console.log(`[msw] mocked ${request.method} ${request.url}`)
  })

  return server
}
