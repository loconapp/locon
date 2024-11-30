import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
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
