import path from 'node:path'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, '.') },
  },
  test: {
    environment: 'node',
    include: ['{app,lib}/**/*.test.ts'],
    env: loadEnv('', process.cwd(), ''),
  },
})
