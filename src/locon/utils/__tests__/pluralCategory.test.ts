import pluralCategory from '../pluralCategory'

/**
 * Hermes ships without `Intl.PluralRules`, so locon carries its own CLDR
 * rules. Node has the real implementation — the fallback must agree with it.
 */
const languages = [
  'ru', 'uk', 'be', 'pl', 'cs', 'sk', 'hr', 'sr', 'bs', 'sl', 'lt', 'lv', 'ro', 'ar', 'he', 'ga',
  'fr', 'pt', 'hi', 'bn', 'fa', 'es', 'tr', 'el', 'hu', 'ka', 'kk', 'az', 'uz', 'bg', 'sq',
  'ja', 'zh', 'ko', 'vi', 'th', 'id', 'ms', 'my', 'km', 'lo', 'en', 'de', 'nl', 'it', 'sv', 'da', 'nb', 'fi', 'et',
]
const counts = [...Array.from({ length: 250 }, (_, i) => i), 1001, 1011, 1021, 1111, 12345]

describe('pluralCategory without Intl.PluralRules', () => {
  const RealPluralRules = Intl.PluralRules

  beforeEach(() => {
    // Simulate Hermes.
    Object.defineProperty(Intl, 'PluralRules', { value: undefined, configurable: true, writable: true })
  })

  afterEach(() => {
    Object.defineProperty(Intl, 'PluralRules', { value: RealPluralRules, configurable: true, writable: true })
  })

  it.each(languages)('matches CLDR for %s integers', language => {
    const real = new RealPluralRules(language)
    for (const count of counts) {
      expect([language, count, pluralCategory(count, language)]).toEqual([language, count, real.select(count)])
    }
  })

  it('selects Russian many for 46, 57 and 60', () => {
    expect(pluralCategory(46, 'ru')).toBe('many')
    expect(pluralCategory(57, 'ru_RU')).toBe('many')
    expect(pluralCategory(60, 'ru-RU')).toBe('many')
    expect(pluralCategory(54, 'ru')).toBe('few')
    expect(pluralCategory(21, 'ru')).toBe('one')
  })

  it('uses the English rule for unknown languages', () => {
    expect(pluralCategory(1, 'xx')).toBe('one')
    expect(pluralCategory(5, 'xx')).toBe('other')
  })
})
