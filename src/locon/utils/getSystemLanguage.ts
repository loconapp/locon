/**
 * Detects the device language and returns the best matching available locale.
 *
 * Sources are tried in order and discarded silently when the module is not
 * installed, so an app only needs whichever one it already has:
 *
 *   1. `expo-localization`     — Expo (managed, dev client, and Expo Go)
 *   2. `react-native-localize` — bare React Native
 *   3. React Native's own `NativeModules` — no extra dependency
 *   4. `Intl` — web, tests, and anything else
 *
 * Expo comes first because it is the larger population and the one where the
 * other module is guaranteed absent: trying it first means a typical Expo app
 * never walks the failing path at all.
 *
 * A missing optional module is a normal state, not a failure: only a module
 * that exists and then throws is worth warning about.
 */

/**
 * True when `require` failed because the module simply is not installed.
 *
 * Node sets `code: 'MODULE_NOT_FOUND'`, but Metro throws a plain `Error:
 * Cannot find module 'x'` with no code at all — so a code-only check made
 * every Expo app log a warning about `react-native-localize` on each launch,
 * for an optional dependency it was never expected to have.
 */
function isModuleNotFound(error: unknown): boolean {
  const candidate = error as { code?: string; message?: string } | undefined

  if (candidate?.code === 'MODULE_NOT_FOUND') {
    return true
  }

  // Metro: "Requiring unknown module \"x\"". Node: "Cannot find module 'x'".
  return /cannot find module|requiring unknown module|could not be found|unable to resolve/i.test(
    candidate?.message ?? '',
  )
}

/**
 * Picks the first device tag that the app actually ships.
 *
 * Matching widens progressively: exact tag (`pt-BR`), then the same script
 * (explicit or inferred: `zh-TW` → `zh-Hant`), then a bare language subtag
 * (`de-AT` → `de`), then any available locale in the same language (device
 * asks for `pt`, app ships only `pt-BR`). Device order is preference order, so
 * the user's first choice wins over a closer match further down the list.
 */
function matchLocale(deviceTags: string[], availableLocales: string[]): string | null {
  const parse = (locale: string) => {
    const normalized = locale.toLowerCase().replace(/_/g, '-')
    const subtags = normalized.split('-')
    const extensionIndex = subtags.findIndex((subtag, index) => index > 0 && subtag.length === 1)
    const coreSubtags = subtags.slice(1, extensionIndex < 0 ? undefined : extensionIndex)

    const explicitScript = coreSubtags.find((subtag) => /^[a-z]{4}$/.test(subtag))
    const region = coreSubtags.find((subtag) => /^[a-z]{2}$|^\d{3}$/.test(subtag))
    const chineseRegionScript =
      subtags[0] === 'zh' && region
        ? ['tw', 'hk', 'mo'].includes(region)
          ? 'hant'
          : ['cn', 'sg', 'my'].includes(region)
            ? 'hans'
            : undefined
        : undefined
    let script = explicitScript ?? chineseRegionScript

    if (!script) {
      try {
        script = new Intl.Locale(normalized).maximize().script?.toLowerCase()
      } catch {
        // Invalid tag or a runtime without Intl.Locale: language fallback below.
      }
    }

    return {
      normalized,
      language: subtags[0],
      // Script is normally the second subtag. Looking until the first
      // extension also handles legacy extlang-shaped tags without confusing a
      // four-character variant beginning with a digit for a script. Likely
      // subtags distinguish region-only tags such as zh-TW and zh-CN.
      explicitScript,
      script,
    }
  }
  const available = availableLocales.map((locale) => ({ locale, ...parse(locale) }))

  for (const tag of deviceTags) {
    if (!tag) {
      continue
    }

    const requested = parse(tag)

    const exact = available.find((entry) => entry.normalized === requested.normalized)

    if (exact) {
      return exact.locale
    }

    // Script is semantically significant: Traditional and Simplified Chinese
    // (or Serbian Cyrillic and Latin) are not interchangeable merely because
    // their language subtag is the same.
    const languageEntries = available.filter((entry) => entry.language === requested.language)
    const availableScripts = new Set(languageEntries.map((entry) => entry.script).filter(Boolean))
    const scriptMatters = Boolean(requested.explicitScript || availableScripts.size > 1)
    const sameScript =
      scriptMatters && requested.script
        ? available.find((entry) => entry.language === requested.language && entry.script === requested.script)
        : undefined

    if (sameScript) {
      return sameScript.locale
    }

    const language = available.find((entry) => entry.normalized === requested.language)

    if (language) {
      return language.locale
    }

    const sameLanguage = available.find((entry) => entry.language === requested.language)

    if (sameLanguage) {
      return sameLanguage.locale
    }
  }

  return null
}

/** Device language tags from `react-native-localize`, most preferred first. */
function tagsFromReactNativeLocalize(): string[] {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const RNLocalize = require('react-native-localize')

    if (typeof RNLocalize?.getLocales === 'function') {
      return RNLocalize.getLocales().flatMap((locale: { languageTag?: string; languageCode?: string }) =>
        [locale.languageTag, locale.languageCode].filter(Boolean),
      )
    }
  } catch (error) {
    if (!isModuleNotFound(error)) {
      console.warn('[locon] react-native-localize failed:', error)
    }
  }

  return []
}

/** Device language tags from `expo-localization`, most preferred first. */
function tagsFromExpoLocalization(): string[] {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Localization = require('expo-localization')

    if (typeof Localization?.getLocales === 'function') {
      return Localization.getLocales().flatMap((locale: { languageTag?: string; languageCode?: string }) =>
        [locale.languageTag, locale.languageCode].filter(Boolean),
      )
    }
  } catch (error) {
    if (!isModuleNotFound(error)) {
      console.warn('[locon] expo-localization failed:', error)
    }
  }

  return []
}

/** Device language tags from React Native core, without any extra dependency. */
function tagsFromNativeModules(): string[] {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
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

  const sources = [tagsFromExpoLocalization, tagsFromReactNativeLocalize, tagsFromNativeModules, tagsFromIntl]

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
