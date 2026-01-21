import * as RNLocalize from 'react-native-localize'

/**
 * Detects the system language and returns the best matching available locale.
 * Uses react-native-localize for reliable detection on iOS/Android.
 */
export default function getSystemLanguage(availableLocales: string[]): string | null {
  if (!availableLocales?.length) return null

  try {
    const best = RNLocalize.findBestLanguageTag(availableLocales)
    return best?.languageTag ?? null
  } catch {
    return null
  }
}
