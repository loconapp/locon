import { defineConfig } from 'tsup'

// Runs after the React Native build; preserve its output in dist.
export default defineConfig({
  entry: { core: 'src/core/index.ts', react: 'src/react/index.tsx' },
  format: ['cjs', 'esm'],
  dts: true,
  bundle: true,
  splitting: false,
  clean: false,
  external: ['react', 'react-dom'],
})
