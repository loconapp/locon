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
