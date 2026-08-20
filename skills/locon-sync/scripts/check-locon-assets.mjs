#!/usr/bin/env node
/**
 * Audits locon translation assets against the code and against each other.
 *
 * locon looks a string up by its value in the project language, so a typo in a
 * `<LText>` child is not a compile error — it silently renders the source
 * language to someone who cannot read it. Nothing else in a typical toolchain
 * catches that, or any of the other failure modes below.
 *
 *   1. every phrase passed to `l()` / `<LText>` resolves
 *   2. every locale has exactly the keys the source locale has
 *   3. placeholders match (with a documented exception for plurals)
 *   4. no unreachable duplicate values
 *   5. report orphaned keys nothing in the code asks for (optionally strict)
 *   6. the code addresses strings by source phrase, not by key
 *   7. no stray characters from another script
 *
 * Usage:
 *   node check-locon-assets.mjs [--source de] [--assets src/i18n/assets]
 *                               [--src app,src] [--locales de,en,fr]
 *                               [--allow-keys a,b]
 *                               [--allow-implicit-count ar:day_one]
 *                               [--strict-orphans] [--strict-plurals]
 *
 * Exits non-zero for correctness failures, so it works as a CI step. Orphans
 * are advisory unless `--strict-orphans` is passed because dynamic usages
 * cannot be proven by a lightweight source scan.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

const BOOLEAN_ARGS = new Set(['help', 'strict-orphans', 'strict-plurals'])
const args = new Map()

for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index]

  if (!arg.startsWith('--')) {
    console.error(`Unexpected argument: ${arg}`)
    process.exit(2)
  }

  const name = arg.slice(2)
  if (BOOLEAN_ARGS.has(name)) {
    args.set(name, true)
    continue
  }

  const value = process.argv[index + 1]
  if (!value || value.startsWith('--')) {
    console.error(`${arg} requires a value`)
    process.exit(2)
  }

  args.set(name, value)
  index += 1
}

if (args.has('help')) {
  console.log(`Usage: node check-locon-assets.mjs [options]

  --root <path>                    project root (default: current directory)
  --source <locale>                project/source locale (default: en)
  --assets <path>                  assets directory relative to root
  --src <paths>                    comma-separated source directories
  --locales <codes>                comma-separated locales the app declares
  --allow-keys <keys>              direct keys intentionally used by code
  --allow-implicit-count <items>   locale:key pairs allowed to omit {count}
  --strict-orphans                 make orphaned keys fatal
  --strict-plurals                 make missing selectable categories fatal`)
  process.exit(0)
}

const ROOT = resolve(args.get('root') ?? process.cwd())
const SOURCE_LOCALE = args.get('source') ?? 'en'
const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/
const STRICT_ORPHANS = args.has('strict-orphans')
const STRICT_PLURALS = args.has('strict-plurals')

const csv = (value) =>
  (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

/** Keys the code may address directly, because their value is shadowed. */
const ALLOWED_KEYS = new Set(csv(args.get('allow-keys')))
/** Locale/key pairs whose wording states the exact number without `{count}`. */
const ALLOWED_IMPLICIT_COUNT = new Set(csv(args.get('allow-implicit-count')))
const DECLARED_LOCALES = new Set(csv(args.get('locales')))

/** Finds the assets directory when not given one. */
function findAssets() {
  if (args.get('assets')) return resolve(ROOT, args.get('assets'))
  const guesses = ['src/i18n/assets', 'src/assets/i18n', 'assets/i18n', 'src/locales', 'locales']
  const hit = guesses.find((g) => existsSync(join(ROOT, g, `${SOURCE_LOCALE}.json`)))
  if (!hit) {
    console.error(
      `Could not find the assets directory. Pass --assets <path> (looked for ${SOURCE_LOCALE}.json in: ${guesses.join(', ')})`,
    )
    process.exit(2)
  }
  return join(ROOT, hit)
}

const ASSET_DIR = findAssets()
const SOURCE_DIRS = csv(args.get('src') ?? 'app,src')

const problems = []
const note = (message) => problems.push(message)

/** Parses the deliberately flat `{ key: string }` asset format without hiding duplicate keys. */
function parseAsset(locale) {
  const path = join(ASSET_DIR, `${locale}.json`)
  const text = readFileSync(path, 'utf8')
  let index = 0

  const skipWhitespace = () => {
    while (/\s/.test(text[index] ?? '')) index += 1
  }

  const readString = () => {
    if (text[index] !== '"') throw new Error(`expected a JSON string at character ${index + 1}`)
    const start = index
    index += 1

    while (index < text.length) {
      if (text[index] === '\\') {
        index += 2
        continue
      }
      if (text[index] === '"') {
        index += 1
        return JSON.parse(text.slice(start, index))
      }
      index += 1
    }

    throw new Error(`unterminated JSON string at character ${start + 1}`)
  }

  try {
    skipWhitespace()
    if (text[index] !== '{') throw new Error('asset root must be an object')
    index += 1

    const result = {}
    const seen = new Set()

    while (true) {
      skipWhitespace()
      if (text[index] === '}') {
        index += 1
        break
      }

      const key = readString()
      skipWhitespace()
      if (text[index] !== ':') throw new Error(`expected ':' after "${key}"`)
      index += 1
      skipWhitespace()
      const value = readString()

      if (seen.has(key)) note(`${locale}.json has duplicate key: ${key}`)
      seen.add(key)
      result[key] = value

      skipWhitespace()
      if (text[index] === ',') {
        index += 1
        skipWhitespace()
        if (text[index] === '}') throw new Error(`trailing comma after "${key}"`)
        continue
      }
      if (text[index] !== '}') throw new Error(`expected ',' or '}' after "${key}"`)
    }

    skipWhitespace()
    if (index !== text.length) throw new Error(`unexpected content at character ${index + 1}`)
    return result
  } catch (error) {
    console.error(`${locale}.json is not a flat string asset: ${error.message}`)
    process.exit(2)
  }
}

// ── assets ────────────────────────────────────────────────────────────
const locales = readdirSync(ASSET_DIR)
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.replace('.json', ''))
  .sort()

const assets = Object.fromEntries(locales.map((locale) => [locale, parseAsset(locale)]))

if (DECLARED_LOCALES.size) {
  const missingFiles = [...DECLARED_LOCALES].filter((locale) => !assets[locale])
  const undeclaredFiles = locales.filter((locale) => !DECLARED_LOCALES.has(locale))

  if (missingFiles.length) note(`declared locales missing asset files: ${missingFiles.join(', ')}`)
  if (undeclaredFiles.length) note(`asset files not present in declared locales: ${undeclaredFiles.join(', ')}`)
}

const source = assets[SOURCE_LOCALE]
if (!source) {
  console.error(`Source locale "${SOURCE_LOCALE}.json" not found in ${ASSET_DIR}`)
  process.exit(2)
}

const sourceKeys = Object.keys(source)
const pluralFamilies = new Set(
  sourceKeys.filter((key) => PLURAL_SUFFIX.test(key)).map((key) => key.replace(PLURAL_SUFFIX, '')),
)

for (const family of pluralFamilies) {
  if (!(`${family}_other` in source)) {
    note(`source plural family "${family}" must define ${family}_other as its catch-all`)
  }
}

const valueToKey = new Map()
const shadowed = []
for (const key of sourceKeys) {
  const value = source[key]
  if (valueToKey.has(value)) shadowed.push([value, valueToKey.get(value), key])
  else valueToKey.set(value, key)
}

// ── source files ──────────────────────────────────────────────────────
function walk(dir) {
  if (!existsSync(dir)) return []
  return readdirSync(dir).flatMap((entry) => {
    if (entry === 'node_modules' || entry.startsWith('.')) return []
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) return walk(full)
    return /\.[jt]sx?$/.test(full) ? [full] : []
  })
}

const files = SOURCE_DIRS.flatMap((dir) => walk(join(ROOT, dir)))

/** JSX collapses newlines and indentation in text children into single spaces. */
const collapse = (text) => text.replace(/\s+/g, ' ').trim()

const used = []
/** Every string literal, for usage detection only (arrays, consts, …). */
const literals = new Set()

/** Reads a static JS string/template literal at `start`, without evaluating it. */
function readLiteralAt(code, start) {
  const quote = code[start]
  if (!["'", '"', '`'].includes(quote)) return null

  let raw = ''
  for (let index = start + 1; index < code.length; index += 1) {
    const char = code[index]

    if (char === '\\') {
      raw += char + (code[index + 1] ?? '')
      index += 1
      continue
    }
    if (char === quote) {
      // Interpolated templates are dynamic and cannot be audited statically.
      if (quote === '`' && raw.includes('${')) return null

      const value = raw
        .replace(/\\u\{([0-9a-f]+)\}/gi, (_, point) => String.fromCodePoint(Number.parseInt(point, 16)))
        .replace(/\\u([0-9a-f]{4})/gi, (_, point) => String.fromCharCode(Number.parseInt(point, 16)))
        .replace(/\\x([0-9a-f]{2})/gi, (_, point) => String.fromCharCode(Number.parseInt(point, 16)))
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\(['"`\\])/g, '$1')

      return { value, end: index + 1 }
    }
    if (quote !== '`' && (char === '\n' || char === '\r')) return null
    raw += char
  }

  return null
}

/**
 * Masks comments and string contents while preserving offsets and quote marks.
 * This keeps call/JSX scans out of comments and example strings; callers still
 * read the real literal from `code` at the matching offset.
 */
function maskNonCode(code, { keepStringContents = false } = {}) {
  const masked = [...code]

  for (let index = 0; index < code.length; index += 1) {
    const quote = code[index]

    if (["'", '"', '`'].includes(quote)) {
      for (let cursor = index + 1; cursor < code.length; cursor += 1) {
        if (code[cursor] === '\\') {
          if (!keepStringContents) {
            masked[cursor] = ' '
            if (cursor + 1 < code.length) masked[cursor + 1] = ' '
          }
          cursor += 1
          continue
        }
        if (code[cursor] === quote) {
          index = cursor
          break
        }
        if (!keepStringContents && code[cursor] !== '\n' && code[cursor] !== '\r') masked[cursor] = ' '
      }
      continue
    }

    if (code[index] === '/' && code[index + 1] === '/') {
      masked[index] = ' '
      masked[index + 1] = ' '
      index += 2
      while (index < code.length && code[index] !== '\n') {
        masked[index] = ' '
        index += 1
      }
      continue
    }

    if (code[index] === '/' && code[index + 1] === '*') {
      masked[index] = ' '
      masked[index + 1] = ' '
      index += 2
      while (index < code.length && !(code[index] === '*' && code[index + 1] === '/')) {
        if (code[index] !== '\n' && code[index] !== '\r') masked[index] = ' '
        index += 1
      }
      if (index < code.length) {
        masked[index] = ' '
        masked[index + 1] = ' '
        index += 1
      }
    }
  }

  return masked.join('')
}

/** Returns a static literal used as an attribute value, if present. */
function attributeLiteral(attributes, name) {
  const match = new RegExp(`\\b${name}\\s*=\\s*(?:\\{\\s*)?`).exec(attributes)
  return match ? readLiteralAt(attributes, match.index + match[0].length)?.value : undefined
}

for (const file of files) {
  const code = readFileSync(file, 'utf8')
  const commentFree = maskNonCode(code, { keepStringContents: true })
  const executable = maskNonCode(code)

  // All static literals count for orphan detection, including arrays and
  // constants referenced indirectly by the UI.
  for (let index = 0; index < commentFree.length; index += 1) {
    const literal = readLiteralAt(commentFree, index)
    if (!literal) continue
    literals.add(literal.value)
    index = literal.end - 1
  }

  // `l()` accepts a source phrase as its first argument. Support every static
  // JS quote style; interpolated templates remain intentionally dynamic.
  for (const match of executable.matchAll(/\bl\s*\(\s*/g)) {
    const literal = readLiteralAt(code, match.index + match[0].length)
    if (literal) used.push({ phrase: literal.value, file })
  }

  // `lIn(locale, phrase)` uses its second argument as the lookup input. This
  // deliberately handles the normal identifier/static-locale forms without
  // pretending a regex is a complete TypeScript parser.
  for (const match of executable.matchAll(/\blIn\s*\(\s*[^,\n]+,\s*/g)) {
    const literal = readLiteralAt(code, match.index + match[0].length)
    if (literal) used.push({ phrase: literal.value, file })
  }

  for (const match of executable.matchAll(/<LText\b([^>]*)>([\s\S]*?)<\/LText>/g)) {
    const openingTagEnd = match[0].indexOf('>')
    const attributes = code.slice(match.index + '<LText'.length, match.index + openingTagEnd)
    const childStart = match.index + openingTagEnd + 1
    const childEnd = match.index + match[0].length - '</LText>'.length
    const child = code.slice(childStart, childEnd)
    const assetKey = attributeLiteral(attributes, 'assetKey')

    if (assetKey) {
      used.push({ phrase: assetKey, file, directKey: true })
    } else if (!/[<>{}]/.test(match[2])) {
      used.push({ phrase: collapse(child), file })
    }
  }

  for (const match of executable.matchAll(/<LText\b([^>]*)\/>/g)) {
    const attributes = code.slice(match.index + '<LText'.length, match.index + match[0].length - 2)
    const assetKey = attributeLiteral(attributes, 'assetKey')
    if (assetKey) used.push({ phrase: assetKey, file, directKey: true })
  }
}

const resolvedKeys = new Set()

for (const { phrase, file, directKey } of used) {
  if (!phrase) continue
  const rel = file.replace(`${ROOT}/`, '')
  const isKey = phrase in source
  const isValue = valueToKey.has(phrase)
  const base = phrase.replace(PLURAL_SUFFIX, '')
  const isPluralBase = sourceKeys.some((key) => key.replace(PLURAL_SUFFIX, '') === base && key !== base)

  if (!isKey && !isValue && !isPluralBase) {
    note(`unresolved ${directKey ? 'asset key' : 'phrase'} in ${rel}: "${phrase}"`)
  }
  if (isValue) resolvedKeys.add(valueToKey.get(phrase))
  if (isKey) resolvedKeys.add(phrase)
  if (isPluralBase) {
    for (const key of sourceKeys) {
      if (key.replace(PLURAL_SUFFIX, '') === base) resolvedKeys.add(key)
    }
  }
  if (!directKey && isKey && !isValue && !ALLOWED_KEYS.has(phrase)) {
    note(`key used instead of source phrase in ${rel}: ${phrase} — write l('${source[phrase]}')`)
  }
}

// A shadowed duplicate is a bug only when nothing addresses it by key.
for (const [value, first, second] of shadowed) {
  if (!resolvedKeys.has(second) && !literals.has(second)) {
    note(`unreachable duplicate: "${value}" is both ${first} and ${second} — only the first resolves`)
  }
}

// ── locale parity ─────────────────────────────────────────────────────
const placeholders = (value) => new Set([...value.matchAll(/\{(\w+)\}/g)].map((m) => m[1]))
const usedImplicitCount = new Set()
const pluralGaps = []

for (const locale of locales) {
  const target = assets[locale]

  if (locale !== SOURCE_LOCALE) {
    const missing = sourceKeys.filter((key) => !(key in target))
    const unknown = Object.keys(target).filter(
      (key) =>
        !(key in source) &&
        !(
          PLURAL_SUFFIX.test(key) &&
          sourceKeys.some((k) => k.replace(PLURAL_SUFFIX, '') === key.replace(PLURAL_SUFFIX, ''))
        ),
    )

    if (missing.length) {
      note(
        `${locale}.json missing ${missing.length} keys: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? ' …' : ''}`,
      )
    }
    if (unknown.length) note(`${locale}.json has unknown keys: ${unknown.slice(0, 5).join(', ')}`)
  }

  for (const key of Object.keys(target)) {
    const sourceKey = PLURAL_SUFFIX.test(key) ? key.replace(PLURAL_SUFFIX, '_other') : key
    if (!(sourceKey in source)) continue

    const want = placeholders(source[sourceKey])
    const got = placeholders(target[key])
    const introduced = [...got].filter((p) => !want.has(p))
    const dropped = [...want].filter((p) => !got.has(p))

    if (introduced.length) note(`${locale}.json unknown placeholder in ${key}: {${introduced.join('}, {')}}`)
    if (dropped.length) {
      const allowance = `${locale}:${key}`
      if (dropped.length === 1 && dropped[0] === 'count' && ALLOWED_IMPLICIT_COUNT.has(allowance)) {
        usedImplicitCount.add(allowance)
      } else {
        note(
          `${locale}.json missing placeholder in ${key}: {${dropped.join('}, {')}}` +
            (dropped.includes('count') ? ` — allow intentional wording with --allow-implicit-count ${allowance}` : ''),
        )
      }
    }
  }

  try {
    const selectable = new Intl.PluralRules(locale.replace(/_/g, '-')).resolvedOptions().pluralCategories
    for (const family of pluralFamilies) {
      const present = new Set(
        Object.keys(target)
          .filter((key) => key.replace(PLURAL_SUFFIX, '') === family && PLURAL_SUFFIX.test(key))
          .map((key) => key.match(PLURAL_SUFFIX)[1]),
      )
      const missing = selectable.filter((category) => !present.has(category))
      if (missing.length) pluralGaps.push(`${locale}:${family} missing ${missing.join(', ')}`)
    }
  } catch {
    note(`${locale}.json filename is not a locale supported by Intl.PluralRules`)
  }
}

for (const allowance of ALLOWED_IMPLICIT_COUNT) {
  if (!usedImplicitCount.has(allowance)) note(`unused --allow-implicit-count entry: ${allowance}`)
}

// ── script sanity ─────────────────────────────────────────────────────
const FOREIGN_SCRIPTS = [
  {
    name: 'Han',
    pattern: /\p{Script=Han}/u,
    languages: ['ja', 'ko', 'zh'],
    scripts: ['hani', 'hans', 'hant', 'jpan', 'kore'],
  },
  { name: 'Japanese Kana', pattern: /[\p{Script=Hiragana}\p{Script=Katakana}]/u, languages: ['ja'], scripts: ['jpan'] },
  { name: 'Hangul', pattern: /\p{Script=Hangul}/u, languages: ['ko'], scripts: ['kore'] },
  {
    name: 'Cyrillic',
    pattern: /\p{Script=Cyrillic}/u,
    languages: ['ru', 'uk', 'be', 'bg', 'sr', 'mk', 'kk'],
    scripts: ['cyrl'],
  },
  {
    name: 'Arabic',
    pattern: /\p{Script=Arabic}/u,
    languages: ['ar', 'azb', 'ckb', 'fa', 'ks', 'lrc', 'mzn', 'ps', 'sd', 'ug', 'ur'],
    scripts: ['arab', 'aran'],
  },
  { name: 'Hebrew', pattern: /\p{Script=Hebrew}/u, languages: ['he', 'yi'], scripts: ['hebr'] },
  { name: 'Devanagari', pattern: /\p{Script=Devanagari}/u, languages: ['hi', 'mr', 'ne'], scripts: ['deva'] },
  { name: 'Thai', pattern: /\p{Script=Thai}/u, languages: ['th'], scripts: ['thai'] },
  { name: 'Greek', pattern: /\p{Script=Greek}/u, languages: ['el'], scripts: ['grek'] },
]

for (const locale of locales) {
  const subtags = locale.toLowerCase().split(/[-_]/)
  const language = subtags[0]
  const explicitScript = subtags.slice(1).find((subtag) => /^[a-z]{4}$/.test(subtag))

  for (const { name, pattern, languages, scripts } of FOREIGN_SCRIPTS) {
    const allowed = explicitScript ? scripts.includes(explicitScript) : languages.includes(language)
    if (allowed) continue
    for (const [key, value] of Object.entries(assets[locale])) {
      if (pattern.test(value)) note(`${locale}.json contains ${name} characters in ${key}: "${value}"`)
    }
  }
}

// ── orphans ───────────────────────────────────────────────────────────
const usedPhrases = new Set([...used.map((u) => u.phrase), ...resolvedKeys])

const pluralFamilyUsed = (key) => {
  const base = key.replace(PLURAL_SUFFIX, '')
  if (base === key) return false
  return sourceKeys.some(
    (sibling) =>
      sibling.replace(PLURAL_SUFFIX, '') === base &&
      (usedPhrases.has(sibling) || usedPhrases.has(source[sibling]) || literals.has(source[sibling])),
  )
}

const orphans = files.length
  ? sourceKeys.filter(
      (key) =>
        !usedPhrases.has(key) && !usedPhrases.has(source[key]) && !literals.has(source[key]) && !pluralFamilyUsed(key),
    )
  : []

// ── report ────────────────────────────────────────────────────────────
console.log(`source:  ${SOURCE_LOCALE}.json (${sourceKeys.length} keys)`)
console.log(`locales: ${locales.join(', ')}`)
console.log(`code:    ${files.length} files, ${usedPhrases.size} distinct phrases`)

if (orphans.length) {
  console.log(`\norphaned keys (${orphans.length}) — nothing in the code asks for these:`)
  for (const key of orphans) console.log(`  ${key}  =  "${source[key]}"`)
}

if (pluralGaps.length) {
  console.log(`\nplural fallbacks (${pluralGaps.length}) — these categories currently use _other:`)
  for (const gap of pluralGaps) console.log(`  ${gap}`)
}

if (STRICT_ORPHANS && orphans.length) {
  note(`${orphans.length} orphaned key(s); remove them or rerun without --strict-orphans`)
}

if (STRICT_PLURALS && pluralGaps.length) {
  note(`${pluralGaps.length} plural category gap(s); add forms or rerun without --strict-plurals`)
}

if (problems.length) {
  console.log(`\n${problems.length} problem(s):`)
  for (const problem of problems) console.log(`  ✗ ${problem}`)
  process.exit(1)
}

console.log('\n✓ assets and code agree')
