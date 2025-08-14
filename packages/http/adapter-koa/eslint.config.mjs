import { defineConfig } from 'eslint/config';
import rootConfig from '../../../eslint.config.mjs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(
  ...rootConfig,
  {
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: here
      }
    }
  },
  {
    files: ['test/**/*.ts'],
    rules: {
      'n/no-unpublished-import': 'off',
    },
  },

)
