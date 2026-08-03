/**
 * Detects the system language and returns the best matching available locale.
 * Uses react-native-localize if available, otherwise falls back to native APIs.
 */
function getSystemLanguage(availableLocales?: string[]): string | null {
  if (!availableLocales?.length) return null

  try {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, global-require
      const RNLocalize = require('react-native-localize')

      if (typeof RNLocalize.findBestLanguageTag === 'function') {
        const best = RNLocalize.findBestLanguageTag(availableLocales)

        if (best?.languageTag) {
          const { languageTag } = best
          const languageCode = languageTag.split('-')[0]?.toLowerCase()

          if (availableLocales.includes(languageTag)) {
            return languageTag
          }

          if (languageCode && availableLocales.includes(languageCode)) {
            return languageCode
          }
        }
      }

      if (typeof RNLocalize.getLocales === 'function') {
        const locales = RNLocalize.getLocales()

        const matchedLocale = locales.find((locale: { languageCode: string; languageTag: string }) => {
          const languageCode = locale.languageCode.toLowerCase()

          if (languageCode && availableLocales.includes(languageCode)) {
            return true
          }

          if (locale.languageTag) {
            const tagCode = locale.languageTag.split('-')[0]?.toLowerCase()

            if (tagCode && availableLocales.includes(tagCode)) {
              return true
            }
          }

          return false
        })

        if (matchedLocale) {
          const languageCode = matchedLocale.languageCode.toLowerCase()

          if (availableLocales.includes(languageCode)) {
            return languageCode
          }

          if (matchedLocale.languageTag) {
            const tagCode = matchedLocale.languageTag.split('-')[0]?.toLowerCase()

            if (tagCode && availableLocales.includes(tagCode)) {
              return tagCode
            }
          }
        }
      }
    } catch (localizeError) {
      // eslint-disable-next-line no-console
      console.warn('[locon] ❌ react-native-localize error:', localizeError)
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, global-require
      const { NativeModules, Platform } = require('react-native')

      if (Platform.OS === 'ios') {
        const { SettingsManager } = NativeModules

        if (SettingsManager?.settings?.AppleLanguages) {
          const appleLanguages = SettingsManager.settings.AppleLanguages as string[]

          const supportedLanguage = appleLanguages
            .map(lang => lang.split('-')[0]?.toLowerCase())
            .filter((languageCode): languageCode is string => Boolean(languageCode))
            .find(languageCode => availableLocales.includes(languageCode))

          if (supportedLanguage) {
            return supportedLanguage
          }
        }

        const { I18nManager } = NativeModules

        if (I18nManager?.localeIdentifier) {
          const languageCode = (I18nManager.localeIdentifier as string).split('-')[0]?.toLowerCase()

          if (languageCode) {
            const supportedLanguage = availableLocales.find(locale => locale === languageCode)

            if (supportedLanguage) {
              return supportedLanguage
            }
          }
        }
      } else if (Platform.OS === 'android') {
        const { I18nManager } = NativeModules

        if (I18nManager?.localeIdentifier) {
          const languageCode = (I18nManager.localeIdentifier as string).split('-')[0]?.toLowerCase()

          if (languageCode) {
            const supportedLanguage = availableLocales.find(locale => locale === languageCode)

            if (supportedLanguage) {
              return supportedLanguage
            }
          }
        }
      }
    } catch (rnError) {
      // eslint-disable-next-line no-console
      console.warn('[locon] ❌ react-native error:', rnError)
    }

    const systemLocale = Intl.DateTimeFormat().resolvedOptions().locale

    if (systemLocale) {
      const languageCode = systemLocale.split('-')[0]?.toLowerCase()

      if (languageCode) {
        const supportedLanguage = availableLocales.find(locale => locale === languageCode)

        if (supportedLanguage) {
          return supportedLanguage
        }
      }
    }

    return null
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('[locon] ❌ Could not detect system language:', error)

    return null
  }
}

export default getSystemLanguage
