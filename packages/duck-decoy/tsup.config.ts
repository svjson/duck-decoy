import { builtinModules } from 'module'
import { defineConfig } from 'tsup'
import pkg from './package.json' assert { type: 'json' }

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  target: 'node20',
  outExtension: ({ format }) => (format === 'cjs' ? { js: '.cjs' } : { js: '.js' }),
  external: [...Object.keys(pkg.dependencies ?? {}), ...builtinModules],
})
