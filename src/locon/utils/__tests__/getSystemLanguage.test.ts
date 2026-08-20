import getSystemLanguage, { matchLocale } from '../getSystemLanguage'

describe('matchLocale', () => {
  it('prefers an exact tag', () => {
    expect(matchLocale(['pt-BR', 'pt'], ['pt', 'pt-BR'])).toBe('pt-BR')
  })

  it('falls back to the language subtag', () => {
    expect(matchLocale(['de-AT'], ['de', 'en'])).toBe('de')
  })

  it('widens to any locale in the same language', () => {
    expect(matchLocale(['pt'], ['en', 'pt-BR'])).toBe('pt-BR')
  })

  it('normalizes underscore and hyphen separators for exact matches', () => {
    expect(matchLocale(['pt_BR'], ['pt-PT', 'pt-BR'])).toBe('pt-BR')
  })

  it('preserves a requested script before widening to the language', () => {
    expect(matchLocale(['zh-Hant-TW'], ['zh-Hans', 'zh-Hant'])).toBe('zh-Hant')
    expect(matchLocale(['zh-Hant-TW'], ['zh', 'zh-Hant'])).toBe('zh-Hant')
    expect(matchLocale(['zh-Hans-CN'], ['zh-Hant', 'zh-Hans'])).toBe('zh-Hans')
    expect(matchLocale(['sr-Latn-RS'], ['sr-Cyrl', 'sr-Latn'])).toBe('sr-Latn')
  })

  it('infers Chinese script from the requested region', () => {
    expect(matchLocale(['zh-TW'], ['zh-Hans', 'zh-Hant'])).toBe('zh-Hant')
    expect(matchLocale(['zh-CN'], ['zh-Hant', 'zh-Hans'])).toBe('zh-Hans')
  })

  it('falls back safely when Intl.Locale is unavailable', () => {
    const descriptor = Object.getOwnPropertyDescriptor(Intl, 'Locale')
    Object.defineProperty(Intl, 'Locale', { configurable: true, value: undefined })

    try {
      expect(matchLocale(['zh-TW'], ['zh-Hans', 'zh-Hant'])).toBe('zh-Hant')
      expect(matchLocale(['zh-CN'], ['zh-Hant', 'zh-Hans'])).toBe('zh-Hans')
    } finally {
      if (descriptor) Object.defineProperty(Intl, 'Locale', descriptor)
    }
  })

  it('follows device preference order', () => {
    expect(matchLocale(['fr', 'de'], ['de', 'en'])).toBe('de')
  })

  it('returns null when nothing matches', () => {
    expect(matchLocale(['ja'], ['de', 'en'])).toBeNull()
  })
})

describe('getSystemLanguage', () => {
  it('returns null without available locales', () => {
    expect(getSystemLanguage([])).toBeNull()
    expect(getSystemLanguage()).toBeNull()
  })

  it('does not warn about optional modules that are not installed', () => {
    // Metro throws `Cannot find module 'x'` with no `code`, unlike Node. A
    // code-only check made every Expo app warn on each launch.
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})

    getSystemLanguage(['en', 'de'])

    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })
})
