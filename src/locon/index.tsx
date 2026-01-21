import { createContext, PropsWithChildren, ReactElement, useCallback, useMemo, useState } from 'react'
import LoconContextType from './types/LoconContext'
import getSystemLanguage from './utils/getSystemLanguage'

const LoconContext = createContext<LoconContextType>({
  assets: {},
  currentLocale: 'en',
  defaultLocale: 'en',
  autodetect: true,
  setLocale: () => {}, // Default implementation
  l: (assetKey: string): string => assetKey, // Default implementation
})

interface Props extends PropsWithChildren {
  assets?: Record<string, Record<string, string>>
  currentLocale?: string
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
  // Determine initial locale: use provided currentLocale, or auto-detect if autodetect is enabled
  const [currentLocale, setCurrentLocale] = useState<string>(() => {
    if (currentLocaleProps) {
      return currentLocaleProps
    }
    
    if (autodetect) {
      const availableLocales = Object.keys(assets)
      const systemLang = getSystemLanguage(availableLocales)
      if (systemLang && assets[systemLang]) {
        return systemLang
      }
    }
    
    return defaultLocale
  })

  const getAssets = useCallback(() => {
    const currentAssets = assets[currentLocale] ?? assets[defaultLocale]

    return currentAssets ?? {}
  }, [assets, currentLocale, defaultLocale])

  const getAsset = useCallback(
    (assetKey: string): string => {
      const assetsObj = getAssets()

      return assetsObj[assetKey] ?? ''
    },
    [getAssets],
  )

  const setCurrentLocaleHandler = useCallback(
    (locale: string) => {
      if (assets[locale]) {
        setCurrentLocale(locale)
      } else {
        console.warn(`Locale "${locale}" not found in assets.`)
      }
    },
    [assets],
  )

  const getAssetByValue = useCallback(
    (assetValue: string, locale: string = projectLocale): string | undefined => {
      const currentAssets = assets[locale]

      if (!currentAssets) {
        return undefined
      }

      const assetKey = Object.keys(currentAssets).find(key => currentAssets[key] === assetValue)

      return assetKey ? getAsset(assetKey) : undefined
    },
    [assets, getAsset, projectLocale],
  )

  const l = useCallback(
    (assetKey: string): string => {
      if (!assetKey) {
        return ''
      }
      const asset =
        getAsset(assetKey) || getAssetByValue(assetKey) || getAssetByValue(assetKey, defaultLocale)

      return asset ?? assetKey
    },
    [getAsset, getAssetByValue, defaultLocale],
  )

  const value: LoconContextType = useMemo(
    () => ({
      assets,
      currentLocale,
      defaultLocale,
      autodetect,
      l,
      setLocale: setCurrentLocaleHandler,
    }),
    [assets, currentLocale, defaultLocale, autodetect, l, setCurrentLocaleHandler],
  )

  return <LoconContext value={value}>{children}</LoconContext>
}

export default Locon
export { default as LText } from './components/LText'
export { default as useLocon } from './hooks/useLocon'
export { LoconContext }