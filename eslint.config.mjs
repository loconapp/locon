import eslint from '@eslint/js'
import react from 'eslint-plugin-react'
import globals from 'globals'
import tseslint from 'typescript-eslint'

const sourceFiles = ['src/**/*.{ts,tsx}']

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**'] },
  { ...eslint.configs.recommended, files: sourceFiles },
  ...tseslint.configs.recommended.map((config) => ({ ...config, files: sourceFiles })),
  {
    files: sourceFiles,
    ...react.configs.flat.recommended,
    languageOptions: {
      ...react.configs.flat.recommended.languageOptions,
      globals: {
        ...globals.browser,
        ...globals.jest,
        ...globals.node,
      },
    },
    settings: { react: { version: 'detect' } },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...react.configs.flat['jsx-runtime'].rules,
      'react/prop-types': 'off',
    },
  },
  {
    files: ['src/types/**/*.d.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
)
