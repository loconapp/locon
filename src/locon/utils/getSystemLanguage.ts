/**
 * Detects the device language and returns the best matching available locale.
 *
 * Sources are tried in order of accuracy and then discarded silently if the
 * module is not installed, so an app only needs whichever one it already has:
 *
 *   1. `react-native-localize` — bare React Native
 *   2. `expo-localization`     — Expo (managed, dev client, and Expo Go)
 *   3. React Native's own `NativeModules` — no extra dependency
 *   4. `Intl` — web, tests, and anything else
 *
 * A missing optional module is a normal state, not a failure: only a module
 * that exists and then throws is worth warning about.
 */

/** True for `Cannot find module 'x'`-style failures from `require`. */
function isModuleNotFound(error: unknown): boolean {
  return (error as NodeJS.ErrnoException | undefined)?.code === 'MODULE_NOT_FOUND'
}

/**
 * Picks the first device tag that the app actually ships.
 *
 * Matching widens progressively: exact tag (`pt-BR`), then language subtag
 * (`pt`), then any available locale in the same language (device asks for
 * `pt`, app ships only `pt-BR`). Device order is preference order, so the
 * user's first choice wins over a closer match further down the list.
 */
function matchLocale(deviceTags: string[], availableLocales: string[]): string | null {
  const available = availableLocales.map((locale) => ({ locale, lower: locale.toLowerCase() }))

  for (const tag of deviceTags) {
    if (!tag) {
      continue
    }

    const lowerTag = tag.toLowerCase()
    const languageCode = lowerTag.split(/[-_]/)[0]

    const exact = available.find((entry) => entry.lower === lowerTag)

    if (exact) {
      return exact.locale
    }

    const language = available.find((entry) => entry.lower === languageCode)

    if (language) {
      return language.locale
    }

    const sameLanguage = available.find((entry) => entry.lower.split(/[-_]/)[0] === languageCode)

    if (sameLanguage) {
      return sameLanguage.locale
    }
  }

  return null
}

/** Device language tags from `react-native-localize`, most preferred first. */
function tagsFromReactNativeLocalize(): string[] {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, global-require
    const RNLocalize = require('react-native-localize')

    if (typeof RNLocalize?.getLocales === 'function') {
      return RNLocalize.getLocales().flatMap((locale: { languageTag?: string; languageCode?: string }) =>
        [locale.languageTag, locale.languageCode].filter(Boolean),
      )
    }
  } catch (error) {
    if (!isModuleNotFound(error)) {
      // eslint-disable-next-line no-console
      console.warn('[locon] react-native-localize failed:', error)
    }
  }

  return []
}

/** Device language tags from `expo-localization`, most preferred first. */
function tagsFromExpoLocalization(): string[] {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, global-require
    const Localization = require('expo-localization')

    if (typeof Localization?.getLocales === 'function') {
      return Localization.getLocales().flatMap((locale: { languageTag?: string; languageCode?: string }) =>
        [locale.languageTag, locale.languageCode].filter(Boolean),
      )
    }
  } catch (error) {
    if (!isModuleNotFound(error)) {
      // eslint-disable-next-line no-console
      console.warn('[locon] expo-localization failed:', error)
    }
  }

  return []
}

/** Device language tags from React Native core, without any extra dependency. */
function tagsFromNativeModules(): string[] {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, global-require
    const { NativeModules, Platform } = require('react-native')

    const tags: string[] = []

    if (Platform?.OS === 'ios') {
      const appleLanguages = NativeModules?.SettingsManager?.settings?.AppleLanguages

      if (Array.isArray(appleLanguages)) {
        tags.push(...(appleLanguages as string[]))
      }
    }

    const localeIdentifier = NativeModules?.I18nManager?.localeIdentifier

    if (typeof localeIdentifier === 'string') {
      tags.push(localeIdentifier)
    }

    return tags
  } catch {
    // Not running under React Native at all.
    return []
  }
}

/** Device language tag from the JS runtime. */
function tagsFromIntl(): string[] {
  try {
    const systemLocale = Intl.DateTimeFormat().resolvedOptions().locale

    return systemLocale ? [systemLocale] : []
  } catch {
    return []
  }
}

/**
 * Best available locale for this device, or `null` when none of the device's
 * languages is one the app ships.
 */
function getSystemLanguage(availableLocales?: string[]): string | null {
  if (!availableLocales?.length) {
    return null
  }

  const sources = [tagsFromReactNativeLocalize, tagsFromExpoLocalization, tagsFromNativeModules, tagsFromIntl]

  for (const source of sources) {
    const match = matchLocale(source(), availableLocales)

    if (match) {
      return match
    }
  }

  return null
}

export default getSystemLanguage
export { matchLocale }
