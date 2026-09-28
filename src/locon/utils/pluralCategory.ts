type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other'

/**
 * CLDR cardinal operands: `n` absolute value, `i` integer digits,
 * `v` count of visible fraction digits.
 */
type Operands = { n: number; i: number; v: number }

type Rule = (o: Operands) => PluralCategory

const between = (x: number, from: number, to: number) => x >= from && x <= to

const oneIfIntegerOne: Rule = ({ i, v }) => (i === 1 && v === 0 ? 'one' : 'other')
const oneIfOne: Rule = ({ n }) => (n === 1 ? 'one' : 'other')
const oneIfZeroOrOne: Rule = ({ i }) => (i === 0 || i === 1 ? 'one' : 'other')
const onlyOther: Rule = () => 'other'

const eastSlavic: Rule = ({ i, v }) => {
  if (v !== 0) return 'other'
  if (i % 10 === 1 && i % 100 !== 11) return 'one'
  if (between(i % 10, 2, 4) && !between(i % 100, 12, 14)) return 'few'
  return 'many'
}

const southSlavic: Rule = ({ i, v }) => {
  if (v === 0 && i % 10 === 1 && i % 100 !== 11) return 'one'
  if (v === 0 && between(i % 10, 2, 4) && !between(i % 100, 12, 14)) return 'few'
  return 'other'
}

const westSlavic: Rule = ({ i, v }) => {
  if (i === 1 && v === 0) return 'one'
  if (between(i, 2, 4) && v === 0) return 'few'
  return v !== 0 ? 'many' : 'other'
}

/**
 * Hand-written CLDR cardinal rules, used only when the JS engine has no
 * `Intl.PluralRules` — Hermes, React Native's default engine, ships without
 * it. Without these, every count other than 1 would fall to `other`, which is
 * the wrong form for most Slavic numbers ("46 карточки" instead of
 * "46 карточек").
 */
const RULES: Record<string, Rule> = {
  ru: eastSlavic,
  uk: eastSlavic,
  be: eastSlavic,
  pl: ({ i, v }) => {
    if (v !== 0) return 'other'
    if (i === 1) return 'one'
    if (between(i % 10, 2, 4) && !between(i % 100, 12, 14)) return 'few'
    return 'many'
  },
  cs: westSlavic,
  sk: westSlavic,
  hr: southSlavic,
  sr: southSlavic,
  bs: southSlavic,
  sl: ({ i, v }) => {
    if (v !== 0) return 'few'
    if (i % 100 === 1) return 'one'
    if (i % 100 === 2) return 'two'
    if (between(i % 100, 3, 4)) return 'few'
    return 'other'
  },
  lt: ({ n, v }) => {
    if (v !== 0) return 'many'
    if (n % 10 === 1 && !between(n % 100, 11, 19)) return 'one'
    if (between(n % 10, 2, 9) && !between(n % 100, 11, 19)) return 'few'
    return 'other'
  },
  lv: ({ n, v }) => {
    if (v === 0 && (n % 10 === 0 || between(n % 100, 11, 19))) return 'zero'
    if (v === 0 && n % 10 === 1 && n % 100 !== 11) return 'one'
    return 'other'
  },
  ro: ({ n, i, v }) => {
    if (i === 1 && v === 0) return 'one'
    if (v !== 0 || n === 0 || (n !== 1 && between(n % 100, 1, 19))) return 'few'
    return 'other'
  },
  ar: ({ n, v }) => {
    if (v !== 0) return 'other'
    if (n === 0) return 'zero'
    if (n === 1) return 'one'
    if (n === 2) return 'two'
    if (between(n % 100, 3, 10)) return 'few'
    if (between(n % 100, 11, 99)) return 'many'
    return 'other'
  },
  he: ({ i, v }) => {
    if ((i === 1 && v === 0) || (i === 0 && v !== 0)) return 'one'
    if (i === 2 && v === 0) return 'two'
    return 'other'
  },
  ga: ({ n, v }) => {
    if (v !== 0) return 'other'
    if (n === 1) return 'one'
    if (n === 2) return 'two'
    if (between(n, 3, 6)) return 'few'
    if (between(n, 7, 10)) return 'many'
    return 'other'
  },
  fr: oneIfZeroOrOne,
  pt: oneIfZeroOrOne,
  hi: ({ n, i }) => (i === 0 || n === 1 ? 'one' : 'other'),
  bn: ({ n, i }) => (i === 0 || n === 1 ? 'one' : 'other'),
  fa: ({ n, i }) => (i === 0 || n === 1 ? 'one' : 'other'),
  es: oneIfOne,
  tr: oneIfOne,
  el: oneIfOne,
  hu: oneIfOne,
  ka: oneIfOne,
  kk: oneIfOne,
  az: oneIfOne,
  uz: oneIfOne,
  bg: oneIfOne,
  sq: oneIfOne,
  ja: onlyOther,
  zh: onlyOther,
  ko: onlyOther,
  vi: onlyOther,
  th: onlyOther,
  id: onlyOther,
  ms: onlyOther,
  my: onlyOther,
  km: onlyOther,
  lo: onlyOther,
}

function operands(count: number): Operands {
  const n = Math.abs(count)
  const fraction = String(n).split('.')[1] ?? ''
  return { n, i: Math.floor(n), v: fraction.length }
}

function fallbackCategory(count: number, tag: string): PluralCategory {
  const language = tag.split('-')[0]?.toLowerCase() ?? ''
  // en, de, nl, it, sv, da, nb, fi, et, … all share the "integer 1" rule.
  const rule = RULES[language] ?? oneIfIntegerOne
  return rule(operands(count))
}

/** CLDR plural category for `count`, e.g. `one` / `few` / `many` / `other`. */
export default function pluralCategory(count: number, locale: string): string {
  const tag = locale.replace(/_/g, '-')
  if (typeof Intl !== 'undefined' && typeof Intl.PluralRules === 'function') {
    try {
      return new Intl.PluralRules(tag).select(count)
    } catch {
      // Locale unknown to Intl: use the built-in rules below.
    }
  }
  return fallbackCategory(count, tag)
}
