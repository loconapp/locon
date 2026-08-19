import type Assets from './Assets'
import type TranslateOptions from './TranslateOptions'

interface LoconContext {
  /** Localizes a key — or a phrase in the project language. */
  l: (assetKey: string, options?: TranslateOptions) => string
  /** Localizes into an explicit locale, whatever the current one is. */
  lIn: (locale: string, assetKey: string, options?: Omit<TranslateOptions, 'locale'>) => string
  assets: Assets
  /** Every locale present in `assets`. */
  locales: string[]
  currentLocale: string
  defaultLocale: string
  projectLocale: string
  /** Locale detected from the device, or `null` when none matched. */
  systemLocale: string | null
  /** Whether `currentLocale` is written right-to-left. */
  isRTL: boolean
  autodetect: boolean
  /** Switches locale. Pass `null` to go back to following the device. */
  setLocale: (locale: string | null) => void
}

export default LoconContext
