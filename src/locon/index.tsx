import { createContext, PropsWithChildren, ReactElement, useCallback, useEffect, useMemo, useState } from 'react'
import LoconContextType from './types/LoconContext'
import TranslateOptions from './types/TranslateOptions'
import createTranslator from './utils/createTranslator'
import getSystemLanguage from './utils/getSystemLanguage'
import { isRtlLocale } from './utils/rtl'

// Used outside a provider: no assets, so every lookup resolves to its own
// input. Sharing the real translator keeps that path consistent with the
// provider's — interpolation and empty input behave the same either way.
const fallbackTranslator = createTranslator({ assets: {}, locale: 'en' })

const LoconContext = createContext<LoconContextType>({
  assets: {},
  locales: [],
  currentLocale: 'en',
  defaultLocale: 'en',
  projectLocale: 'en',
  systemLocale: null,
  isRTL: false,
  autodetect: true,
  setLocale: () => {},
  l: fallbackTranslator,
  lIn: (locale, assetKey, options) => fallbackTranslator(assetKey, { ...options, locale }),
})

interface Props extends PropsWithChildren {
  assets?: Record<string, Record<string, string>>
  /**
   * Locale to display.
   *
   * - a string pins that locale
   * - `null` explicitly follows the device language
   * - omitted leaves the locale uncontrolled after the initial detection
   *
   * The `null` form exists for apps that persist a user choice: storing
   * "follow the system" as `null` and passing it straight through switches
   * detection back on without an app restart.
   */
  currentLocale?: string | null
  defaultLocale?: string
  projectLocale?: string
  autodetect?: boolean
}

function Locon({
  children,
  assets = {},
  currentLocale: currentLocaleProps,
  defaultLocale = 'en',
  projectLocale = 'en',
  autodetect = true,
}: Props): ReactElement {
  const resolvedProjectLocale = projectLocale || defaultLocale
  const locales = useMemo(() => Object.keys(assets), [assets])
  const systemLocale = useMemo(() => (autodetect ? getSystemLanguage(locales) : null), [autodetect, locales])

  const [currentLocale, setCurrentLocale] = useState<string>(() => {
    if (currentLocaleProps) {
      return currentLocaleProps
    }

    return systemLocale ?? defaultLocale
  })

  const setCurrentLocaleHandler = useCallback(
    (locale: string | null) => {
      if (locale === null) {
        setCurrentLocale(systemLocale ?? defaultLocale)

        return
      }

      if (assets[locale]) {
        setCurrentLocale(locale)
      } else {
        // eslint-disable-next-line no-console
        console.warn(`[locon] Locale "${locale}" not found in assets.`)
      }
    },
    [assets, systemLocale, defaultLocale],
  )

  const l = useMemo(
    () =>
      createTranslator({
        assets,
        locale: currentLocale,
        defaultLocale,
        projectLocale: resolvedProjectLocale,
      }),
    [assets, currentLocale, defaultLocale, resolvedProjectLocale],
  )

  const lIn = useCallback(
    (locale: string, assetKey: string, options?: Omit<TranslateOptions, 'locale'>) =>
      l(assetKey, { ...options, locale }),
    [l],
  )

  useEffect(() => {
    // Uncontrolled: the initial detection stands until `setLocale` is called.
    if (currentLocaleProps === undefined) {
      return
    }

    if (currentLocaleProps === null) {
      setCurrentLocale(systemLocale ?? defaultLocale)

      return
    }

    setCurrentLocale((locale) => (locale === currentLocaleProps ? locale : currentLocaleProps))
  }, [currentLocaleProps, systemLocale, defaultLocale])

  const value: LoconContextType = useMemo(
    () => ({
      assets,
      locales,
      currentLocale,
      defaultLocale,
      projectLocale: resolvedProjectLocale,
      systemLocale,
      isRTL: isRtlLocale(currentLocale),
      autodetect,
      l,
      lIn,
      setLocale: setCurrentLocaleHandler,
    }),
    [
      assets,
      locales,
      currentLocale,
      defaultLocale,
      resolvedProjectLocale,
      systemLocale,
      autodetect,
      l,
      lIn,
      setCurrentLocaleHandler,
    ],
  )

  return <LoconContext value={value}>{children}</LoconContext>
}

export default Locon
export { default as LText } from './components/LText'
export { default as useLocon } from './hooks/useLocon'
export { default as createTranslator } from './utils/createTranslator'
export { default as getSystemLanguage } from './utils/getSystemLanguage'
export { applyRTL, isRtlLocale, RTL_LANGUAGES, RTL_SCRIPTS } from './utils/rtl'
export { LoconContext }
export type { default as Assets } from './types/Assets'
export type { default as TranslateOptions } from './types/TranslateOptions'
export type { Translator } from './utils/createTranslator'
