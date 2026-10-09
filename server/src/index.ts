import type { Router } from 'express'
import { env } from './env.ts'

let mockControl: Router | undefined

if (env.mockApis.length > 0) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('MOCK_APIS must not be set in production')
  }
  // Dynamic imports: msw and the mock control API never load unless mocking is on.
  const { startMocking } = await import('./mocks/node.ts')
  const { createMockControl } = await import('./mocks/control.ts')
  startMocking(env.mockApis)
  mockControl = createMockControl(env.mockApis)
}

const { createApp } = await import('./app.ts')

createApp({ mockControl }).listen(env.port, () => {
  const mode = env.mockApis.length > 0 ? `MOCKED: ${env.mockApis.join(', ')} · control API at /__mocks` : 'all APIs real'
  console.log(`API on http://localhost:${env.port} (${mode})`)
})
