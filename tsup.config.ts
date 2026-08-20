import { defineConfig } from 'tsup'

export default defineConfig({
  /**
   * One bundled CommonJS file. Both halves of that are deliberate.
   *
   * **Bundled**, because emitting the module tree unbundled left *extensionless*
   * relative imports (`require('./components/LText')`). Node resolves those to
   * `.js`; Metro tries `.mjs` first. A React Native app importing the CJS entry
   * therefore pulled `LText.mjs` → `useLocon.mjs` → `index.mjs` and loaded the
   * library a second time. Two instances mean two `createContext` objects: the
   * provider filled one, every `useLocon()` read the other, and consumers
   * silently got the default context — no error, just untranslated screens.
   *
   * **CommonJS only**, because optional dependencies are looked up with
   * `require()` at runtime. Metro finds dependencies by statically reading
   * literal `require()` calls, but esbuild rewrites them to its own `__require`
   * shim when emitting ESM — so Metro registered nothing, and even
   * `react-native` itself failed to resolve at runtime. A React Native library
   * gains nothing from a second format, and Metro consumes CJS natively.
   */
  entry: ['src/locon/index.tsx'],
  format: ['cjs'],
  dts: true,
  sourcemap: false,
  bundle: true,
  splitting: false,
  clean: true,
  treeshake: false,
  shims: false,
  external: ['react', 'react-dom', 'react-native', 'react-native-localize', 'expo-localization'],
})
