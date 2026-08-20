/**
 * Builds a BCP-47 tag carrying Unicode extensions, for handing to `Intl`.
 *
 * `locon` has no opinion on which calendar or numbering system your app
 * should use — a Persian journal app wants Jalali dates, a Persian payroll
 * export usually does not. That is a product decision. What the library can
 * do is get the tag syntax right, which naive concatenation does not:
 * appending `-u-ca-gregory` to a locale that already reads `de-u-nu-latn`
 * yields a tag with two `-u-` singletons, and `Intl` throws on it.
 */

interface IntlExtensions {
  /** Calendar system, e.g. `gregory`, `islamic`, `persian`. */
  calendar?: string
  /** Numbering system, e.g. `latn`, `arab`, `deva`. */
  numbering?: string
}

/**
 * Returns `locale` with the given Unicode extensions applied, merging into an
 * existing `-u-` section rather than adding a second one. Keys already present
 * in the tag are left alone, so an explicit choice by the caller wins.
 */
function intlLocale(locale: string, extensions: IntlExtensions = {}): string {
  const normalizedLocale = locale.replace(/_/g, '-')
  const requested: Array<[key: string, value: string]> = []

  if (extensions.calendar) {
    requested.push(['ca', extensions.calendar])
  }

  if (extensions.numbering) {
    requested.push(['nu', extensions.numbering])
  }

  if (!requested.length) {
    return normalizedLocale
  }

  const subtags = normalizedLocale.split('-')
  const isSingleton = (subtag: string) => subtag.length === 1
  const privateUseIndex = subtags.findIndex((subtag, index) => index > 0 && subtag.toLowerCase() === 'x')
  const unicodeIndex = subtags.findIndex(
    (subtag, index) => index > 0 && (privateUseIndex < 0 || index < privateUseIndex) && subtag.toLowerCase() === 'u',
  )

  if (unicodeIndex >= 0) {
    const nextSingleton = subtags.findIndex((subtag, index) => index > unicodeIndex && isSingleton(subtag))
    const unicodeEnd = nextSingleton < 0 ? subtags.length : nextSingleton
    const existingKeys = new Set(
      subtags
        .slice(unicodeIndex + 1, unicodeEnd)
        .filter((subtag) => subtag.length === 2)
        .map((subtag) => subtag.toLowerCase()),
    )
    const additions = requested.flatMap(([key, value]) => (existingKeys.has(key) ? [] : [key, value]))

    if (!additions.length) {
      return normalizedLocale
    }

    // Unicode keywords belong inside the `u` extension. In particular they
    // must precede a later transformed/private-use singleton (`-t-`/`-x-`),
    // otherwise Intl treats them as part of that extension and ignores them.
    subtags.splice(unicodeEnd, 0, ...additions)

    return subtags.join('-')
  }

  const insertionIndex = privateUseIndex < 0 ? subtags.length : privateUseIndex

  // Private use must remain the final extension in a BCP-47 tag.
  subtags.splice(insertionIndex, 0, 'u', ...requested.flat())

  return subtags.join('-')
}

export default intlLocale
export type { IntlExtensions }
