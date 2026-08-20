/**
 * The resolver behind `l()`, usable without React.
 *
 * The provider builds one of these per render; export pipelines (PDF, XLSX,
 * e-mail) build their own with an explicit locale, so a document can be
 * produced in a language the interface is not currently showing.
 */
import type Assets from '../types/Assets'
import type TranslateOptions from '../types/TranslateOptions'

interface TranslatorConfig {
  assets: Assets
  locale: string
  defaultLocale?: string
  projectLocale?: string
}

type Translator = (assetKey: string, options?: TranslateOptions) => string

/**
 * Reverse (value → key) indexes, cached per assets object.
 *
 * Value lookup is locon's whole point — you write `<LText>Guten Morgen</LText>`
 * and the library finds the key — so it runs on nearly every render of every
 * localized string. A linear scan over the project locale would make that
 * O(keys) per call; this makes it O(1) after the first.
 *
 * Keyed by the assets object identity, so callers should keep `assets` stable
 * (module-level constant or `useMemo`) rather than rebuilding it each render.
 */
const reverseIndexCache = new WeakMap<Assets, Map<string, Map<string, string>>>()

function getReverseIndex(assets: Assets, locale: string): Map<string, string> {
  let perLocale = reverseIndexCache.get(assets)

  if (!perLocale) {
    perLocale = new Map()
    reverseIndexCache.set(assets, perLocale)
  }

  const cached = perLocale.get(locale)

  if (cached) {
    return cached
  }

  const index = new Map<string, string>()
  const localeAssets = assets[locale]

  if (localeAssets) {
    for (const key of Object.keys(localeAssets)) {
      const value = localeAssets[key]

      // First key wins, so duplicate values resolve deterministically.
      if (value !== undefined && !index.has(value)) {
        index.set(value, key)
      }
    }
  }

  perLocale.set(locale, index)

  return index
}

/** Replaces `{token}` placeholders. Unknown tokens are left untouched. */
function interpolate(value: string, params?: Record<string, string | number>): string {
  if (!params) {
    return value
  }

  return value.replace(/\{(\w+)\}/g, (match, token: string) =>
    params[token] === undefined ? match : String(params[token]),
  )
}

/**
 * Trailing CLDR plural category on an already-resolved key.
 *
 * Value lookup lands on whichever variant carries the source phrase — writing
 * `l('Noch {count} Minuten Pause.', { count })` resolves to the `_other` key,
 * since that is the form the German sentence is written in. Suffixing *that*
 * would ask for `…_other_one`, so the category is stripped back off before
 * the plural form is chosen.
 */
const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/

/** CLDR plural category for `count`, e.g. `one` / `few` / `many` / `other`. */
function pluralCategory(count: number, locale: string): string {
  try {
    return new Intl.PluralRules(locale.replace(/_/g, '-')).select(count)
  } catch {
    // Locale unknown to Intl (or Intl absent): English-ish rule is a safer
    // guess than crashing a render.
    return count === 1 ? 'one' : 'other'
  }
}

function createTranslator({ assets, locale, defaultLocale = 'en', projectLocale }: TranslatorConfig): Translator {
  const resolvedProjectLocale = projectLocale || defaultLocale

  const read = (fromLocale: string, key: string): string | undefined => {
    const value = assets[fromLocale]?.[key]

    // Empty strings are treated as untranslated so the fallback chain
    // continues rather than rendering a blank label.
    return value === undefined || value === '' ? undefined : value
  }

  /**
   * Turns the caller's input into an asset key.
   *
   * The input is either already a key, or a source-language phrase
   * (`<LText>Guten Morgen</LText>`) that has to be reverse-looked-up.
   */
  const keyFor = (input: string, targetLocale: string): string => {
    if (
      assets[targetLocale]?.[input] !== undefined ||
      assets[defaultLocale]?.[input] !== undefined ||
      assets[resolvedProjectLocale]?.[input] !== undefined
    ) {
      return input
    }

    return (
      getReverseIndex(assets, resolvedProjectLocale).get(input) ??
      getReverseIndex(assets, defaultLocale).get(input) ??
      input
    )
  }

  return function l(assetKey: string, options?: TranslateOptions): string {
    if (!assetKey) {
      return ''
    }

    const targetLocale = options?.locale || locale
    const resolvedKey = keyFor(assetKey, targetLocale)
    const key = options?.count === undefined ? resolvedKey : resolvedKey.replace(PLURAL_SUFFIX, '')

    // `{count}` is interpolable without being repeated in `params`.
    // The dedicated option is authoritative: it must not select one plural
    // form while a conflicting `params.count` renders a different number.
    const params = options?.count === undefined ? options?.params : { ...options.params, count: options.count }

    // Per-key fallback: current locale → default → project language. Falling
    // back per key (not per whole locale) is what keeps a half-finished
    // translation readable instead of blank.
    for (const candidateLocale of [targetLocale, defaultLocale, resolvedProjectLocale]) {
      // A fallback locale can have different CLDR rules from the requested
      // locale. Recompute the category for each candidate rather than, for
      // example, using Chinese `other` to read a Russian fallback for count 1.
      const candidateKeys =
        options?.count === undefined
          ? [key]
          : [`${key}_${pluralCategory(options.count, candidateLocale)}`, `${key}_other`, key]

      for (const candidateKey of candidateKeys) {
        const value = read(candidateLocale, candidateKey)

        if (value !== undefined) {
          return interpolate(value, params)
        }
      }
    }

    // Nothing anywhere: render the input itself. For value-style usage that is
    // the source-language phrase, which is a usable last resort.
    return interpolate(options?.fallback ?? assetKey, params)
  }
}

export default createTranslator
export type { Translator, TranslatorConfig }
