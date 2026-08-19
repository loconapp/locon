/**
 * Per-call options for `l()`, `lIn()` and `<LText>`.
 *
 * All three are optional and independent: `params` interpolates, `count`
 * selects a plural form, and `locale` renders one call in a language other
 * than the current one (used when an app exports a document in a language
 * the interface is not currently showing).
 */
interface TranslateOptions {
  /** Values for `{token}` placeholders inside the resolved string. */
  params?: Record<string, string | number>
  /** Selects `key_one` / `key_few` / `key_other` … via `Intl.PluralRules`. */
  count?: number
  /** Resolve against this locale instead of the current one. */
  locale?: string
}

export default TranslateOptions
