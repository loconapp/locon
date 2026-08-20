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
  'glk', // Gilaki
  'he', // Hebrew
  'khw', // Khowar
  'ks', // Kashmiri (Perso-Arabic)
  'lrc', // Northern Luri
  'mzn', // Mazanderani
  'nqo', // N'Ko
  'pnb', // Western Punjabi
  'ps', // Pashto
  'sd', // Sindhi (Perso-Arabic)
  'syr', // Syriac
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
const RTL_SCRIPTS = new Set([
  'adlm',
  'arab',
  'aran',
  'armi',
  'avst',
  'chrs',
  'cprt',
  'elym',
  'hatr',
  'hebr',
  'hung',
  'khar',
  'lydi',
  'mand',
  'mani',
  'mend',
  'merc',
  'mero',
  'narb',
  'nbat',
  'nkoo',
  'orkh',
  'ougr',
  'palm',
  'phli',
  'phlp',
  'phnx',
  'prti',
  'rohg',
  'samr',
  'sarb',
  'sogd',
  'sogo',
  'syrc',
  'thaa',
  'yezi',
])

// `I18nManager.isRTL` describes the currently rendered layout and does not
// reflect a queued forceRTL change until restart. Remembering the last request
// lets a caller cancel that pending change before the restart happens.
let lastRequestedRTL: boolean | undefined

/** Direction from the runtime's CLDR data, when that Intl API is available. */
function rtlFromIntl(locale: string): boolean | undefined {
  try {
    const likelyLocale = new Intl.Locale(locale.replace(/_/g, '-')).maximize()
    const localeWithDirection = likelyLocale as Intl.Locale & {
      getTextInfo?: () => { direction?: string }
      textInfo?: { direction?: string }
    }
    const direction = localeWithDirection.getTextInfo?.().direction ?? localeWithDirection.textInfo?.direction

    if (direction === 'rtl') {
      return true
    }
    if (direction === 'ltr') {
      return false
    }

    const likelyScript = likelyLocale.script?.toLowerCase()

    return likelyScript && RTL_SCRIPTS.has(likelyScript) ? true : undefined
  } catch {
    return undefined
  }
}

/** True when the locale is written right-to-left. */
function isRtlLocale(locale?: string | null): boolean {
  if (!locale) {
    return false
  }

  const subtags = locale.split(/[-_]/)
  const languageCode = subtags[0]?.toLowerCase()
  const extensionIndex = subtags.findIndex((subtag, index) => index > 0 && subtag.length === 1)
  const coreSubtags = subtags.slice(1, extensionIndex < 0 ? undefined : extensionIndex)

  // A four-letter alphabetic core subtag is the script, per BCP-47. An
  // explicit script always wins over the language's default direction.
  const scriptCode = coreSubtags.find((subtag) => /^[a-z]{4}$/i.test(subtag))?.toLowerCase()

  if (scriptCode) {
    return RTL_SCRIPTS.has(scriptCode) || rtlFromIntl(locale) === true
  }

  // Let the runtime's current CLDR likely-subtags data cover languages that
  // are not in the compact fallback table. Older Hermes builds may not expose
  // Intl.Locale, hence the guarded table below remains necessary.
  const runtimeDirection = rtlFromIntl(locale)

  if (runtimeDirection !== undefined) {
    return runtimeDirection
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
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { I18nManager } = require('react-native')

    if (!I18nManager || typeof I18nManager.forceRTL !== 'function') {
      return false
    }

    // Without allowRTL, iOS ignores forceRTL entirely.
    I18nManager.allowRTL?.(true)

    const renderedRTL = Boolean(I18nManager.isRTL)
    const effectiveRequestedRTL = lastRequestedRTL ?? renderedRTL

    if (effectiveRequestedRTL !== shouldBeRTL) {
      I18nManager.forceRTL(shouldBeRTL)
    }

    lastRequestedRTL = shouldBeRTL

    return renderedRTL !== shouldBeRTL
  } catch {
    return false
  }
}

export { RTL_LANGUAGES, RTL_SCRIPTS, isRtlLocale, applyRTL }
