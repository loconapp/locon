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
  const requested: string[] = []

  if (extensions.calendar) {
    requested.push('ca', extensions.calendar)
  }

  if (extensions.numbering) {
    requested.push('nu', extensions.numbering)
  }

  if (!requested.length) {
    return locale
  }

  const [base, ...rest] = locale.split('-u-')

  if (!rest.length) {
    return `${base}-u-${requested.join('-')}`
  }

  // Keep whatever the tag already declares; only add the missing keys.
  const existing = rest.join('-u-')
  const additions: string[] = []

  for (let index = 0; index < requested.length; index += 2) {
    const key = requested[index]

    if (!new RegExp(`(^|-)${key}-`).test(existing)) {
      additions.push(key, requested[index + 1])
    }
  }

  return additions.length ? `${base}-u-${existing}-${additions.join('-')}` : locale
}

export default intlLocale
export type { IntlExtensions }
