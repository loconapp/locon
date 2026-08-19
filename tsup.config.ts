import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    'src/locon/index.tsx',
    'src/locon/utils/getSystemLanguage.ts',
    'src/locon/utils/createTranslator.ts',
    'src/locon/utils/rtl.ts',
    'src/locon/utils/resolveLocale.ts',
    'src/locon/utils/intlLocale.ts',
    'src/locon/components/LText.tsx',
    'src/locon/hooks/useLocon.ts',
    'src/locon/types/Assets.ts',
    'src/locon/types/LoconContext.ts',
    'src/locon/types/TranslateOptions.ts',
  ],
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: false,
  bundle: false,
  splitting: false,
  clean: true,
  treeshake: false,
  shims: false,
  external: ['react', 'react-dom', 'react-native', 'react-native-localize', 'expo-localization'],
})
