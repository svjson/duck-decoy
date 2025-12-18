import { builtinModules } from 'module'
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  target: 'node20',
  outExtension: ({ format }) => (format === 'cjs' ? { js: '.cjs' } : { js: '.js' }),
  external: [...builtinModules],
})
