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

  it('prefers an explicit script subtag over the language default', () => {
    expect(isRtlLocale('pa-Arab')).toBe(true)
    expect(isRtlLocale('pa')).toBe(false)
    expect(isRtlLocale('ku-Latn')).toBe(false)
  })

  it('handles empty input', () => {
    expect(isRtlLocale('')).toBe(false)
    expect(isRtlLocale(null)).toBe(false)
    expect(isRtlLocale(undefined)).toBe(false)
  })
})
