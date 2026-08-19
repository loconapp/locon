import intlLocale from '../intlLocale'

describe('intlLocale', () => {
  it('returns the locale untouched when nothing is requested', () => {
    expect(intlLocale('de')).toBe('de')
  })

  it('adds a extension section', () => {
    expect(intlLocale('fa', { calendar: 'gregory', numbering: 'latn' })).toBe('fa-u-ca-gregory-nu-latn')
  })

  it('adds only what was asked for', () => {
    expect(intlLocale('ar', { numbering: 'latn' })).toBe('ar-u-nu-latn')
  })

  it('keeps region subtags', () => {
    expect(intlLocale('pt-BR', { numbering: 'latn' })).toBe('pt-BR-u-nu-latn')
  })

  it('merges into an existing extension instead of adding a second singleton', () => {
    // The naive `locale + '-u-…'` produces 'de-u-nu-latn-u-ca-gregory', which
    // Intl rejects outright.
    expect(intlLocale('de-u-nu-latn', { calendar: 'gregory' })).toBe('de-u-nu-latn-ca-gregory')
  })

  it('does not override a key the tag already declares', () => {
    expect(intlLocale('fa-u-ca-persian', { calendar: 'gregory' })).toBe('fa-u-ca-persian')
  })

  it('produces tags Intl accepts', () => {
    const tag = intlLocale('fa', { calendar: 'gregory', numbering: 'latn' })
    const formatted = new Intl.DateTimeFormat(tag, { year: 'numeric', month: '2-digit', day: '2-digit' }).format(
      new Date(Date.UTC(2026, 4, 11)),
    )

    // Gregorian, not the Jalali 1405/02/21 that plain 'fa' would produce.
    expect(formatted).toContain('2026')
  })
})
