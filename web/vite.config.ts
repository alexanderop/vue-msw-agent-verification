import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// PORT = backend, WEB_PORT = this dev server. Override both to run isolated copies side by side.
const apiPort = process.env.PORT ?? '3001'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: Number(process.env.WEB_PORT ?? 5173),
    strictPort: true,
    // The Vue app only ever talks to our backend. It has no idea whether the
    // backend uses real or mocked external APIs.
    proxy: { '/api': `http://localhost:${apiPort}` },
  },
})
