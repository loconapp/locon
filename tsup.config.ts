import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/locon/index.tsx'],
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: false,
  splitting: true,
  clean: true,
  treeshake: true,
  shims: true,
  external: ['react', 'react-dom'],
  noExternal: [],
})
