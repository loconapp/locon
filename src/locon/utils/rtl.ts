/**
 * Right-to-left helpers.
 *
 * This is a writing-direction table, not a platform support table: it answers
 * "is this locale written right-to-left" per CLDR, regardless of whether Apple
 * or Google happen to offer that language as a system UI language.
 *
 * `locon` does not flip your layout on its own — React Native can only change
 * writing direction through `I18nManager`, and that change needs an app
 * restart to take effect. So the library tells you *whether* a locale is RTL
 * and gives you one explicit call to apply it; when to restart stays yours.
 */

/**
 * Language subtags whose default script is right-to-left, per CLDR.
 *
 * Deliberately excludes languages that merely *have* an RTL historical
 * orthography — Hausa is Latin-script (Boko) in CLDR and therefore LTR, even
 * though Ajami exists.
 */
const RTL_LANGUAGES = new Set([
  'ar', // Arabic
  'arc', // Aramaic
  'ckb', // Central Kurdish (Sorani)
  'dv', // Divehi
  'fa', // Persian
  'he', // Hebrew
  'khw', // Khowar
  'ks', // Kashmiri (Perso-Arabic)
  'ps', // Pashto
  'sd', // Sindhi (Perso-Arabic)
  'ug', // Uyghur
  'ur', // Urdu
  'yi', // Yiddish
])

/**
 * Right-to-left ISO 15924 script subtags.
 *
 * Checked before the language table so that explicitly scripted tags resolve
 * correctly in both directions: `pa-Arab` (Shahmukhi Punjabi) is RTL although
 * plain `pa` is not, and `ku-Latn` is LTR although `ku-Arab` is not.
 */
const RTL_SCRIPTS = new Set(['adlm', 'arab', 'aran', 'hebr', 'mand', 'nkoo', 'rohg', 'samr', 'syrc', 'thaa', 'yezi'])

/** True when the locale is written right-to-left. */
function isRtlLocale(locale?: string | null): boolean {
  if (!locale) {
    return false
  }

  const subtags = locale.split(/[-_]/)
  const languageCode = subtags[0]?.toLowerCase()

  // A 4-letter subtag in second position is the script, per BCP-47.
  const scriptCode = subtags[1]?.length === 4 ? subtags[1].toLowerCase() : undefined

  if (scriptCode) {
    return RTL_SCRIPTS.has(scriptCode)
  }

  return Boolean(languageCode && RTL_LANGUAGES.has(languageCode))
}

/**
 * Aligns React Native's layout direction with `locale`.
 *
 * Returns `true` when the direction actually changed, which means the running
 * UI is now inconsistent and the app must restart for the new direction to
 * render. Callers typically prompt the user, or reload via `expo-updates`.
 *
 * No-ops (returning `false`) outside React Native, so calling it on web or in
 * tests is safe.
 */
function applyRTL(locale: string): boolean {
  const shouldBeRTL = isRtlLocale(locale)

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, global-require
    const { I18nManager } = require('react-native')

    if (!I18nManager || typeof I18nManager.forceRTL !== 'function') {
      return false
    }

    // Without allowRTL, iOS ignores forceRTL entirely.
    I18nManager.allowRTL?.(true)

    if (I18nManager.isRTL === shouldBeRTL) {
      return false
    }

    I18nManager.forceRTL(shouldBeRTL)

    return true
  } catch {
    return false
  }
}

export { RTL_LANGUAGES, RTL_SCRIPTS, isRtlLocale, applyRTL }
