import resolveLocale from '../resolveLocale'

const assets = { de: {}, en: {}, tr: {} }

describe('resolveLocale', () => {
  it('prefers an explicit choice', () => {
    expect(resolveLocale({ assets, currentLocale: 'tr', systemLocale: 'de' })).toBe('tr')
  })

  it('follows the device when the choice is null', () => {
    expect(resolveLocale({ assets, currentLocale: null, systemLocale: 'de' })).toBe('de')
  })

  it('follows the device when no choice was made at all', () => {
    expect(resolveLocale({ assets, systemLocale: 'de' })).toBe('de')
  })

  it('falls back to the default when detection matched nothing', () => {
    expect(resolveLocale({ assets, currentLocale: null, defaultLocale: 'en', systemLocale: null })).toBe('en')
  })

  it('ignores the device entirely when autodetect is off', () => {
    expect(
      resolveLocale({ assets, currentLocale: null, defaultLocale: 'de', autodetect: false, systemLocale: 'tr' }),
    ).toBe('de')
  })

  it('detects for itself when no systemLocale is supplied', () => {
    // jsdom reports en-US, which matches the shipped 'en'.
    expect(resolveLocale({ assets, currentLocale: null, defaultLocale: 'de' })).toBe('en')
  })
})
