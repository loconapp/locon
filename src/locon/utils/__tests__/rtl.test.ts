import { isRtlLocale } from '../rtl'

describe('isRtlLocale', () => {
  it('detects right-to-left languages', () => {
    expect(isRtlLocale('ar')).toBe(true)
    expect(isRtlLocale('he')).toBe(true)
    expect(isRtlLocale('fa')).toBe(true)
    expect(isRtlLocale('ur')).toBe(true)
  })

  it('ignores region subtags', () => {
    expect(isRtlLocale('ar-EG')).toBe(true)
    expect(isRtlLocale('de-AT')).toBe(false)
  })

  it('treats Hausa as left-to-right', () => {
    // CLDR default script for Hausa is Latin; Ajami is historical.
    expect(isRtlLocale('ha')).toBe(false)
  })

  it('uses likely scripts for additional RTL languages', () => {
    expect(isRtlLocale('syr')).toBe(true)
    expect(isRtlLocale('nqo')).toBe(true)
    expect(isRtlLocale('mzn')).toBe(true)
    expect(isRtlLocale('lrc')).toBe(true)
    expect(isRtlLocale('arc')).toBe(true)
  })

  it('prefers an explicit script subtag over the language default', () => {
    expect(isRtlLocale('pa-Arab')).toBe(true)
    expect(isRtlLocale('pa')).toBe(false)
    expect(isRtlLocale('ku-Latn')).toBe(false)
    expect(isRtlLocale('mzn-Latn')).toBe(false)
    expect(isRtlLocale('arc-Armi')).toBe(true)
  })

  it('handles empty input', () => {
    expect(isRtlLocale('')).toBe(false)
    expect(isRtlLocale(null)).toBe(false)
    expect(isRtlLocale(undefined)).toBe(false)
  })

  it('uses its language table when Intl.Locale is unavailable', () => {
    const descriptor = Object.getOwnPropertyDescriptor(Intl, 'Locale')
    Object.defineProperty(Intl, 'Locale', { configurable: true, value: undefined })

    try {
      expect(isRtlLocale('arc')).toBe(true)
      expect(isRtlLocale('ha')).toBe(false)
    } finally {
      if (descriptor) Object.defineProperty(Intl, 'Locale', descriptor)
    }
  })
})

describe('applyRTL', () => {
  it('can cancel a pending direction change before restart', () => {
    jest.resetModules()
    const forceRTL = jest.fn()
    const allowRTL = jest.fn()
    jest.doMock('react-native', () => ({ I18nManager: { allowRTL, forceRTL, isRTL: false } }))

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { applyRTL } = require('../rtl') as typeof import('../rtl')

    expect(applyRTL('ar')).toBe(true)
    expect(applyRTL('ar')).toBe(true)
    expect(applyRTL('en')).toBe(false)
    expect(forceRTL.mock.calls).toEqual([[true], [false]])
    expect(allowRTL).toHaveBeenCalledTimes(3)
  })
})
