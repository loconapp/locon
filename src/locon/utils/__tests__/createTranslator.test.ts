import createTranslator from '../createTranslator'

/**
 * Plural suffixes are CLDR plural *category* names — the exact strings
 * `Intl.PluralRules.select()` returns — not a generic `_plural`. Languages do
 * not have one plural form: Russian picks between `one`/`few`/`many` and
 * Arabic between all six. `other` is CLDR's mandatory catch-all, which is also
 * the form English uses for plurals.
 */
const assets = {
  de: {
    greeting: 'Guten Morgen',
    radius: '{m} m Radius',
    day_one: '{count} Tag',
    day_other: '{count} Tage',
    only_in_source: 'Nur auf Deutsch',
  },
  en: {
    greeting: 'Good morning',
    radius: '{m} m radius',
    day_one: '{count} day',
    day_other: '{count} days',
    only_in_source: 'German only',
  },
  tr: {
    greeting: 'Günaydın',
    radius: '{m} m yarıçap',
    day_other: '{count} gün',
    only_in_source: '',
  },
  ru: {
    greeting: 'Доброе утро',
    day_one: '{count} день',
    day_few: '{count} дня',
    day_many: '{count} дней',
  },
  ar: {
    greeting: 'صباح الخير',
    day_zero: 'لا أيام',
    day_one: 'يوم واحد',
    day_two: 'يومان',
    day_few: '{count} أيام',
    day_many: '{count} يومًا',
    day_other: '{count} يوم',
  },
}

const l = createTranslator({ assets, locale: 'tr', defaultLocale: 'en', projectLocale: 'de' })

describe('createTranslator', () => {
  it('resolves a key in the current locale', () => {
    expect(l('greeting')).toBe('Günaydın')
  })

  it('resolves a phrase written in the project language', () => {
    expect(l('Guten Morgen')).toBe('Günaydın')
  })

  it('interpolates params', () => {
    expect(l('radius', { params: { m: 150 } })).toBe('150 m yarıçap')
  })

  it('leaves unknown placeholders untouched', () => {
    expect(l('radius')).toBe('{m} m yarıçap')
  })

  it('interpolates count without repeating it in params', () => {
    expect(l('day', { count: 3 })).toBe('3 gün')
  })

  it('keeps count authoritative when params also contains count', () => {
    expect(l('day', { count: 3, params: { count: 99 } })).toBe('3 gün')
  })

  it('selects the two German forms', () => {
    const german = createTranslator({ assets, locale: 'de', defaultLocale: 'en', projectLocale: 'de' })

    expect(german('day', { count: 1 })).toBe('1 Tag')
    expect(german('day', { count: 3 })).toBe('3 Tage')
  })

  it('selects all three Russian forms, including the 21-is-singular rule', () => {
    const russian = createTranslator({ assets, locale: 'ru', defaultLocale: 'en', projectLocale: 'de' })

    expect(russian('day', { count: 1 })).toBe('1 день')
    expect(russian('day', { count: 2 })).toBe('2 дня')
    expect(russian('day', { count: 5 })).toBe('5 дней')
    expect(russian('day', { count: 11 })).toBe('11 дней')
    expect(russian('day', { count: 21 })).toBe('21 день')
  })

  it('normalizes underscore locale tags before selecting a plural category', () => {
    const russian = createTranslator({
      assets: { ...assets, ru_RU: assets.ru },
      locale: 'ru_RU',
      defaultLocale: 'en',
      projectLocale: 'de',
    })

    expect(russian('day', { count: 2 })).toBe('2 дня')
  })

  it('selects all six Arabic forms', () => {
    const arabic = createTranslator({ assets, locale: 'ar', defaultLocale: 'en', projectLocale: 'de' })

    expect(arabic('day', { count: 0 })).toBe('لا أيام')
    expect(arabic('day', { count: 1 })).toBe('يوم واحد')
    expect(arabic('day', { count: 2 })).toBe('يومان')
    expect(arabic('day', { count: 3 })).toBe('3 أيام')
    expect(arabic('day', { count: 11 })).toBe('11 يومًا')
    expect(arabic('day', { count: 100 })).toBe('100 يوم')
  })

  it('selects a plural form when the input is a source-language phrase', () => {
    // The German sentence is written in the _other form, so value lookup
    // lands on `day_other`; asking for count 1 must still reach `day_one`.
    const german = createTranslator({ assets, locale: 'de', defaultLocale: 'en', projectLocale: 'de' })

    expect(german('{count} Tage', { count: 1 })).toBe('1 Tag')
    expect(german('{count} Tage', { count: 3 })).toBe('3 Tage')
    expect(l('{count} Tage', { count: 1 })).toBe('1 gün')
  })

  it('falls back to _other when a locale omits a category it does not need', () => {
    // Turkish has no distinct singular here; `day_other` covers every count.
    expect(l('day', { count: 1 })).toBe('1 gün')
  })

  it('uses the fallback locale plural rules when the target has no translation', () => {
    const chineseWithRussianFallback = createTranslator({
      assets: { zh: {}, ru: assets.ru },
      locale: 'zh',
      defaultLocale: 'ru',
      projectLocale: 'ru',
    })

    expect(chineseWithRussianFallback('day', { count: 1 })).toBe('1 день')
    expect(chineseWithRussianFallback('day', { count: 2 })).toBe('2 дня')
    expect(chineseWithRussianFallback('day', { count: 5 })).toBe('5 дней')
  })

  it('renders one call in another locale', () => {
    expect(l('greeting', { locale: 'de' })).toBe('Guten Morgen')
  })

  it('falls back per key rather than rendering blank', () => {
    // 'tr' has the key but leaves it empty — the default locale must win.
    expect(l('only_in_source')).toBe('German only')
  })

  it('falls back to the default locale for a key the current locale lacks', () => {
    const missing = createTranslator({ assets, locale: 'fr', defaultLocale: 'en', projectLocale: 'de' })

    expect(missing('greeting')).toBe('Good morning')
  })

  it('returns the input when nothing matches anywhere', () => {
    expect(l('untranslated phrase')).toBe('untranslated phrase')
  })

  it('returns an explicit human-readable fallback when nothing matches', () => {
    expect(l('missing_key', { fallback: 'Missing translation' })).toBe('Missing translation')
  })

  it('returns an empty string for an empty input', () => {
    expect(l('')).toBe('')
  })
})
