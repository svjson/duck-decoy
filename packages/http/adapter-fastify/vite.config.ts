import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [tsconfigPaths(), dts({ insertTypesEntry: true })],
  build: {
    outDir: 'dist',
    target: 'node20',
    ssr: true,
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
    },
    rollupOptions: {
      external: ['fastify'],
    },
  },
})
